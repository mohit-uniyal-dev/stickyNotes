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

    // Current note schema version. Bump when the note shape changes so future
    // migrations can detect and upgrade older stored notes.
    static get NOTE_SCHEMA_VERSION() {
        return 1;
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
            enablePin: true,
            minimized: false,
            schemaVersion: UserLocalStorage.NOTE_SCHEMA_VERSION
        };
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
        const removedNotes = notes.filter((note) => note.url === url && this.isEmptyNote(note));

        if (removedNotes.length === 0) {
            return [];
        }

        const updatedNotes = notes.filter((note) => !(note.url === url && this.isEmptyNote(note)));
        await this.setStorage(updatedNotes);

        return removedNotes;
    }

    static async removeAllEmptyNotes() {
        const notes = await this.retrieveNoteData();
        const removedNotes = notes.filter((note) => this.isEmptyNote(note));

        if (removedNotes.length === 0) {
            return [];
        }

        const updatedNotes = notes.filter((note) => !this.isEmptyNote(note));
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

