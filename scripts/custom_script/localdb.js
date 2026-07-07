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
    static retriveNoteData() {
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

    static isEmptyNoteContent(content) {
        return String(content || '').replace(/\s+/g, '') === '';
    }

    static isEmptyNote(note) {
        return !note || this.isEmptyNoteContent(note.content);
    }

    static async removeNoteById(noteId) {
        const notes = await this.retriveNoteData();
        const updatedNotes = notes.filter((note) => note.id !== noteId);

        if (updatedNotes.length !== notes.length) {
            await this.setStorage(updatedNotes);
        }

        return notes.filter((note) => note.id === noteId);
    }

    static async removeEmptyNotesForUrl(url) {
        const notes = await this.retriveNoteData();
        const removedNotes = notes.filter((note) => note.url === url && this.isEmptyNote(note));

        if (removedNotes.length === 0) {
            return [];
        }

        const updatedNotes = notes.filter((note) => !(note.url === url && this.isEmptyNote(note)));
        await this.setStorage(updatedNotes);

        return removedNotes;
    }

    static async removeAllEmptyNotes() {
        const notes = await this.retriveNoteData();
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
            const allNotes = await this.retriveNoteData(); // Retrieve all notes

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

