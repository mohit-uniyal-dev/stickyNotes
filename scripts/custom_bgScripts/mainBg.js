

// --- message payload validation helpers -------------------------------------
// The background is the trust boundary for all storage mutations, so every
// handler validates the fields it depends on before touching storage and
// ignores anything malformed instead of writing bad data.
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const ALLOWED_NOTE_COLORS = new Set(['red', 'yellow', 'green', 'grey', 'purple', 'pink', 'default']);


// one way communication between background and content script
chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {

        // Ignore anything that is not a well-formed action message. Other
        // listeners (e.g. tabListener) handle message-keyed requests.
        if (!isPlainObject(request) || typeof request.action !== 'string') {
            return;
        }

        if (request.action == MESSAGE.STORE_NOTE_DATA) {

            if (!isNonEmptyString(request.url)) {
                console.warn('storeNoteData ignored: missing or invalid url.');
                return;
            }

            // get id
            const noteData = UserLocalStorage.createNote(request.url)

            // send request
            sendResponse({ noteData: noteData });

            // update data
            const noteArr = await UserLocalStorage.retrieveNoteData()
            noteArr.push(noteData)
            await UserLocalStorage.setStorage(noteArr);

        }


        if (request.action === MESSAGE.CREATE_TAB_AND_INJECT) {
            chrome.tabs.create({ url: chrome.runtime.getURL('./stickyNote_html_page/index.html') });
        }


        if (request.action === MESSAGE.FILTER_LOCAL_STORAGE) {
            const id = request.id;

            if (!isNonEmptyString(id)) {
                console.warn('filterLocalStorage ignored: missing or invalid id.');
                return;
            }

            const StoredNotes = await UserLocalStorage.retrieveNoteData();

            const noteToFind = StoredNotes.find(note => note.id === id);
            if (!noteToFind) {
                // Nothing to remove; still acknowledge so callers can proceed.
                sendResponse({ success: true });
                return true;
            }

            // Filter out the note with the matching ID
            const newArray = StoredNotes.filter((note) => note.id !== id);

            // Save the updated array back to local storage
            await UserLocalStorage.setStorage(newArray);

            // Query all tabs to find the one you want to send the message to
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(tab => {
                    if (tab.url === noteToFind.url) {
                        chrome.tabs.sendMessage(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: noteToFind.id });
                    }
                });
            });

            // Send a response back if needed
            sendResponse({ success: true });
        }


        if (request.action === MESSAGE.UPDATE_NOTE_CONTENT) {
            const id = request.id
            const updateContent = request.content

            // Content may legitimately be an empty string, so only the type is
            // required here, not a non-empty value.
            if (isNonEmptyString(id) && typeof updateContent === 'string') {
                const noteArr = await UserLocalStorage.retrieveNoteData();
                const updatedNoteArr = noteArr.map((note) => {
                    if (note.id == id) {
                        return { ...note, content: updateContent };
                    }
                    return note; // Ensure that notes that don't match the id are returned unchanged
                });

                const noteToFind = updatedNoteArr.find(note => note.id === id);
                if (!noteToFind) {
                    return true;
                }

                // upadte in local bg
                await UserLocalStorage.setStorage(updatedNoteArr);

                // updating it into the tab
                chrome.tabs.query({}, function (tabs) {

                    tabs.forEach(tab => {
                        if (tab.url === noteToFind.url) {
                            chrome.tabs.sendMessage(tab.id, { action: MESSAGE.UPDATE_CONTENT_IN_CARD, note: noteToFind });
                        }
                    });
                });
            }


        }

        if (request.action == MESSAGE.REMOVE_USING_HOST_NAME) {
            const hostName = request.hostName

            if (!isNonEmptyString(hostName)) {
                console.warn('removeUsingHostName ignored: missing or invalid hostName.');
                return;
            }

            const StoredNotes = await UserLocalStorage.retrieveNoteData();

            // Filter out the note with the matching ID
            const newArray = StoredNotes.filter((note) => note.hostName === hostName);
            const updateArray = StoredNotes.filter((note) => note.hostName !== hostName);


            await UserLocalStorage.setStorage(updateArray)

            newArray.forEach((note) => {
                chrome.tabs.query({}, function (tabs) {
                    tabs.forEach(tab => {
                        if (tab.url === note.url) {
                            chrome.tabs.sendMessage(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: note.id });
                        }
                    });
                });
            })
        }

        if (request.action === MESSAGE.REMOVE_TAB) {
            // Close the full "All Notes" page by its exact extension URL. Title
            // matching was fragile (the page title is "Stick it - web notes",
            // never "StickyNotes"), so the old check silently matched nothing.
            const allNotesUrl = chrome.runtime.getURL('stickyNote_html_page/index.html');

            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    if (tab.url === allNotesUrl) {
                        chrome.tabs.remove(tab.id);
                    }
                });
            });
        }

        if (request.action === MESSAGE.STORE_POSITION) {
            const id = request.id
            const finalPosition = request.position

            if (!isNonEmptyString(id) || !isPlainObject(finalPosition)) {
                console.warn('storePosition ignored: missing or invalid id/position.');
                return;
            }

            let allNotes = await UserLocalStorage.retrieveNoteData()
            let noteIndex = allNotes.findIndex(note => note.id == id);
            if (noteIndex !== -1) {
                // Update the position of the found note
                allNotes[noteIndex].position = finalPosition;
                await UserLocalStorage.setStorage(allNotes)
            }

        }


        if (request.action === MESSAGE.UPDATE_PIN) {
            const isPinEnable = request.isPinEnable
            const noteId = request.id

            if (!isNonEmptyString(noteId) || typeof isPinEnable !== 'boolean') {
                console.warn('updatePin ignored: missing or invalid id/isPinEnable.');
                return;
            }

            const notesArray = await UserLocalStorage.retrieveNoteData()
            const noteToUpdate = notesArray.find(note => note.id === noteId);

            if (!noteToUpdate) {
                return true;
            }

            // Remove empty notes on close instead of keeping empty drafts.
            if (UserLocalStorage.isEmptyNote(noteToUpdate)) {
                await UserLocalStorage.removeNoteById(noteId);
                return true;
            }

            // Filter and update pinEnable
            const updatedNotesArray = notesArray.map(note => {
                if (note.id === noteId) {
                    return { ...note, enablePin: isPinEnable };
                }
                return note;
            });

            await UserLocalStorage.setStorage(updatedNotesArray)
        }

        if (request.action === MESSAGE.ENABLE_PIN) {
            const isPinEnable = request.isPinEnable
            const noteId = request.id

            if (!isNonEmptyString(noteId) || typeof isPinEnable !== 'boolean') {
                console.warn('enablePin ignored: missing or invalid id/isPinEnable.');
                return;
            }

            const notesArray = await UserLocalStorage.retrieveNoteData()

            // Filter and update pinEnable
            const updatedNotesArray = notesArray.map(note => {
                if (note.id === noteId) {
                    return { ...note, enablePin: isPinEnable };
                }
                return note;
            });
            // Store updated value
            await UserLocalStorage.setStorage(updatedNotesArray)


            const note = updatedNotesArray.find(note => note.id === noteId);

            // Only re-inject when the note actually exists, otherwise the
            // content script would be asked to render an undefined note.
            if (note) {
                chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                    if (tabs.length > 0) {
                        var activeTab = tabs[0];
                        if (activeTab.id) {
                            chrome.tabs.sendMessage(activeTab.id, { "message": MESSAGE.INJECT_POPUPS, "noteData": note });
                        } else {
                            console.error("No valid tab ID found.");
                        }
                    } else {
                        console.error("No active tab found.");
                    }
                })
            }

            return true

        }

        if (request.action === MESSAGE.STORE_AND_UPDATE_SIZE) {
            const id = request.id;
            const width = request.width;
            const height = request.height;

            if (!isNonEmptyString(id) || !isFiniteNumber(width) || !isFiniteNumber(height)) {
                console.warn('StoreAndUpdateWidthAndHeight ignored: missing or invalid id/width/height.');
                return;
            }

            const allNotes = await UserLocalStorage.retrieveNoteData();

            // Find the note by id
            const noteIndex = allNotes.findIndex(note => note.id === id);

            if (noteIndex !== -1) {
                // Update the width and height in the note
                allNotes[noteIndex].width = width;
                allNotes[noteIndex].height = height;

                await UserLocalStorage.setStorage(allNotes);
            }
        }

        if (request.action === MESSAGE.ADD_SELECTED_COLOR) {
            const { selectedColor, uniqueId } = request;

            if (!isNonEmptyString(uniqueId) || !ALLOWED_NOTE_COLORS.has(selectedColor)) {
                console.warn('addSelectedColor ignored: missing id or unsupported color.');
                return;
            }

            let noteData = await UserLocalStorage.retrieveNoteData();

            noteData = noteData.map(note => {
                if (note.id === uniqueId) {
                    return { ...note, color: selectedColor };
                }
                return note;
            });

            await UserLocalStorage.setStorage(noteData);
        }
        return true

    }
);













