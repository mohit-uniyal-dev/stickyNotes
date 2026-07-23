class UserLocalStorage {
    static getStorageValue(key, fallbackValue) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(key, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                resolve(Object.prototype.hasOwnProperty.call(result, key) ? result[key] : fallbackValue);
            });
        });
    }

    static setStorageValue(value) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(value, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                resolve();
            });
        });
    }

    // get note data 
    static retrieveNoteData() {
        return this.getStorageValue('notes', []);
    }

    // remove all note data 
    static deleteNoteData(noteId) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                resolve();
            });
        });
    }

    // update note data
    static setStorage(noteArr) {
        return this.setStorageValue({ notes: noteArr });
    }

    // Current note schema version. Bump when the note shape/semantics change so
    // migrations can detect and upgrade older stored notes.
    // v2: `enablePin` now means "show this note site-wide (every page of the
    // host)" rather than "restore at all". Every note persists on its exact
    // page regardless; pinning is the opt-in for site-wide.
    // v3: introduces an explicit `scope` field ('page' | 'site' | 'global').
    // 'global' is a single shared note shown on every supported site; it is only
    // ever created explicitly, never produced by migration.
    static get NOTE_SCHEMA_VERSION() {
        return 3;
    }

    static get GLOBAL_SCOPE() {
        return 'global';
    }

    // One-time upgrade of stored notes to the current schema version. Idempotent
    // and safe to call on every service-worker start.
    static async migrateNotes() {
        const notes = await this.retrieveNoteData();
        let changed = false;

        const migrated = notes.map((note) => {
            if (!note) {
                return note;
            }
            if (note.schemaVersion === 3 && typeof note.scope === 'string') {
                return note;
            }
            changed = true;

            // v1 -> v2: pre-v2 notes were "pinned by default" (which only meant
            // restore-on-same-page). Under v2 that becomes site-wide, so reset
            // them to page-specific to preserve their original behavior.
            let enablePin = note.enablePin;
            if (note.schemaVersion !== 2 && note.schemaVersion !== 3) {
                enablePin = false;
            }

            // v2 -> v3: backfill an explicit scope. An already site-wide (pinned)
            // note becomes 'site'; everything else 'page'. Global notes are only
            // created explicitly, so migration never yields one.
            const scope = note.scope || (enablePin ? 'site' : 'page');

            return { ...note, enablePin, scope, schemaVersion: 3 };
        });

        if (changed) {
            await this.setStorage(migrated);
        }
    }

    // Single source of truth for a new note. Used by both the popup and the
    // background so the stored note shape cannot drift between the two paths.
    static createNote(url) {
        const now = new Date();
        const timestamp = now.getTime();
        const randomComponent = Math.random().toString(36).substring(2, 15);

        let hostName = '';
        try {
            hostName = new URL(url).hostname;
        } catch (error) {
            console.warn('createNote received an unparseable URL.', error);
        }

        return {
            id: `${timestamp}-${randomComponent}`,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            hostName: hostName,
            url: url,
            content: '',
            title: 'Title',
            enablePin: false,
            minimized: false,
            scope: 'page',
            schemaVersion: UserLocalStorage.NOTE_SCHEMA_VERSION
        };
    }

    // A global note is the single note shown on every supported site. It is
    // created from a normal note but marked with the global scope; its
    // `enablePin` stays false so the legacy host-pin UI/logic never treats it as
    // a site pin (visibility comes from the scope, not the pin flag).
    static createGlobalNote(url) {
        const note = this.createNote(url);
        note.scope = this.GLOBAL_SCOPE;
        note.enablePin = false;
        return note;
    }

    static isGlobalNote(note) {
        return Boolean(note) && note.scope === this.GLOBAL_SCOPE;
    }

    // Single source of truth for "should this note render on this page?", shared
    // by the background restore paths and the popup so the rule cannot drift.
    // A global note shows everywhere; otherwise a note shows on its exact page,
    // and a site-wide (pinned) note also shows on every page of its host.
    static shouldShowNoteOnPage(note, href, hostName) {
        if (!note) {
            return false;
        }
        if (this.isGlobalNote(note)) {
            return true;
        }
        const samePage = note.url === href;
        const siteWidePinned = Boolean(note.enablePin) && note.hostName === hostName;
        return samePage || siteWidePinned;
    }

    // The single global note, or null. Also the guard the creation path uses to
    // avoid ever producing a second one.
    static async getGlobalNote() {
        const notes = await this.retrieveNoteData();
        return notes.find((note) => this.isGlobalNote(note)) || null;
    }

    // Return the existing global note, or create, persist, and return a new one.
    // Guarantees the singleton: never adds a second global note.
    static async ensureGlobalNote(url) {
        const notes = await this.retrieveNoteData();
        const existing = notes.find((note) => this.isGlobalNote(note));
        if (existing) {
            return existing;
        }

        const globalNote = this.createGlobalNote(url);
        notes.push(globalNote);
        await this.setStorage(notes);
        return globalNote;
    }

    static isEmptyNoteContent(content) {
        return String(content || '').replace(/\s+/g, '') === '';
    }

    static isEmptyNote(note) {
        return !note || this.isEmptyNoteContent(note.content);
    }

    static async removeNoteById(noteId) {
        const notes = await this.retrieveNoteData();
        const updatedNotes = notes.filter((note) => note.id !== noteId);

        if (updatedNotes.length !== notes.length) {
            await this.setStorage(updatedNotes);
        }

        return notes.filter((note) => note.id === noteId);
    }

    static async removeEmptyNotesForUrl(url) {
        const notes = await this.retrieveNoteData();
        // The global note is shared across every site and is never cleaned up as
        // an empty draft, so it survives closing/reloading the tab it was made on.
        const isRemovable = (note) => note.url === url && this.isEmptyNote(note) && !this.isGlobalNote(note);
        const removedNotes = notes.filter(isRemovable);

        if (removedNotes.length === 0) {
            return [];
        }

        const updatedNotes = notes.filter((note) => !isRemovable(note));
        await this.setStorage(updatedNotes);

        return removedNotes;
    }

    static async removeAllEmptyNotes() {
        const notes = await this.retrieveNoteData();
        const isRemovable = (note) => this.isEmptyNote(note) && !this.isGlobalNote(note);
        const removedNotes = notes.filter(isRemovable);

        if (removedNotes.length === 0) {
            return [];
        }

        const updatedNotes = notes.filter((note) => !isRemovable(note));
        await this.setStorage(updatedNotes);

        return removedNotes;
    }

    static setIsHidden(isHidden) {
        return this.setStorageValue({ isHidden: isHidden });
    }

    static getIsHidden() {
        return this.getStorageValue('isHidden', false);
    }

    static removeIsHidden() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove('isHidden', () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }



    static setIsViewGrid(isViewGrid) {
        return this.setStorageValue({ isViewGrid: isViewGrid });
    }

    static getIsViewGrid() {
        return this.getStorageValue('isViewGrid', true);
    }


    // pin 
    static async updateNote(updateNotes, pin) {
        try {
            const allNotes = await this.retrieveNoteData(); // Retrieve all notes

            // Map through allNotes to update specific notes based on updateNotes array
            const updatedNotes = allNotes.map(note => {
                // Find the matching note in updateNotes by id
                const matchedNote = updateNotes.find(updatedNote => updatedNote.id === note.id);

                if (matchedNote) {
                    // Update enablePin value if the note is found in updateNotes
                    return { ...note, enablePin: matchedNote.enablePin };
                }

                // Return the note unchanged if it doesn't match any in updateNotes
                return note;
            });

            // Save the updated notes back to storage
            await this.setStorage(updatedNotes);

        } catch (error) {
            console.error('Error updating notes:', error);
        }
    }


    static setPin(enableAllPin) {

    }

    static getPin() {

    }



}

