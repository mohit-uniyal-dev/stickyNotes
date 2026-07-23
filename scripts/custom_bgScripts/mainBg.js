

// --- message payload validation helpers -------------------------------------
// The background is the trust boundary for all storage mutations, so every
// handler validates the fields it depends on before touching storage and
// ignores anything malformed instead of writing bad data.
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const ALLOWED_NOTE_COLORS = new Set(['red', 'yellow', 'green', 'grey', 'purple', 'pink', 'default']);

// A global note is open on many tabs at once, so URL-matched echo cannot reach
// the other instances. Broadcast the message to every tab instead; the shared
// sendMessageToTab helper already swallows the benign "receiving end does not
// exist" rejection for tabs with no content script (restricted/loading pages).
const broadcastToAllTabs = (message, exceptTabId) => {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id === exceptTabId) {
                return;
            }
            sendMessageToTab(tab.id, message);
        });
    });
};

// The global note's pin state (shown/hidden) applies to every tab, so pinning it
// injects it everywhere and unpinning removes it everywhere. Tabs with no content
// script (restricted/loading pages) are handled by sendMessageToTab.
const broadcastGlobalVisibility = (note) => {
    if (note.enablePin) {
        broadcastToAllTabs({ message: MESSAGE.INJECT_POPUPS, noteData: note });
    } else {
        broadcastToAllTabs({ action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: note.id });
    }
};


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

            // The global note is on every tab, so its removal must reach all of
            // them; a page/site note only needs to be pulled from tabs on its URL.
            if (UserLocalStorage.isGlobalNote(noteToFind)) {
                broadcastToAllTabs({ action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: noteToFind.id });
            } else {
                chrome.tabs.query({}, function (tabs) {
                    tabs.forEach(tab => {
                        if (tab.url === noteToFind.url) {
                            sendMessageToTab(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: noteToFind.id });
                        }
                    });
                });
            }

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

                // Push the update to other tabs showing this note, but skip the
                // tab that originated the edit — echoing its own change back
                // needlessly re-renders (and can disturb the caret of) the note
                // being edited. A global note lives on every tab, so it
                // broadcasts everywhere; a page/site note only reaches tabs on
                // its own URL.
                const senderTabId = sender && sender.tab ? sender.tab.id : null;
                if (UserLocalStorage.isGlobalNote(noteToFind)) {
                    broadcastToAllTabs({ action: MESSAGE.UPDATE_CONTENT_IN_CARD, note: noteToFind }, senderTabId);
                } else {
                    chrome.tabs.query({}, function (tabs) {
                        tabs.forEach(tab => {
                            if (tab.url === noteToFind.url && tab.id !== senderTabId) {
                                sendMessageToTab(tab.id, { action: MESSAGE.UPDATE_CONTENT_IN_CARD, note: noteToFind });
                            }
                        });
                    });
                }
            }


        }

        if (request.action == MESSAGE.REMOVE_USING_HOST_NAME) {
            const hostName = request.hostName

            if (!isNonEmptyString(hostName)) {
                console.warn('removeUsingHostName ignored: missing or invalid hostName.');
                return;
            }

            const StoredNotes = await UserLocalStorage.retrieveNoteData();

            // Notes to remove: those on this host, but never the global note —
            // it only carries its creation host and is not really "on" this site.
            const newArray = StoredNotes.filter((note) => note.hostName === hostName && !UserLocalStorage.isGlobalNote(note));
            const updateArray = StoredNotes.filter((note) => !(note.hostName === hostName && !UserLocalStorage.isGlobalNote(note)));


            await UserLocalStorage.setStorage(updateArray)

            // Query tabs once and match every removed note against each tab,
            // instead of scanning all tabs separately for every note.
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(tab => {
                    newArray.forEach(note => {
                        if (tab.url === note.url) {
                            sendMessageToTab(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: note.id });
                        }
                    });
                });
            });
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

                // The global note shares one position everywhere, so mirror the
                // new position to its instances on other tabs.
                if (UserLocalStorage.isGlobalNote(allNotes[noteIndex])) {
                    const senderTabId = sender && sender.tab ? sender.tab.id : null;
                    broadcastToAllTabs({ action: MESSAGE.SYNC_GLOBAL_STATE, note: allNotes[noteIndex] }, senderTabId);
                }
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

            // Closing (X) the global note hides it (unpin), like a normal note,
            // but the singleton is never deleted — even when empty — so it stays
            // saved and can be shown again from the popup. `isPinEnable` is false
            // on close. The shown/hidden change applies to every tab.
            if (UserLocalStorage.isGlobalNote(noteToUpdate)) {
                const hiddenGlobal = notesArray.map(note =>
                    note.id === noteId ? { ...note, enablePin: isPinEnable } : note);
                await UserLocalStorage.setStorage(hiddenGlobal);
                broadcastGlobalVisibility(hiddenGlobal.find(note => note.id === noteId));
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

            // Only act when the note actually exists, otherwise the content
            // script would be asked to render an undefined note.
            if (note && UserLocalStorage.isGlobalNote(note)) {
                // Pinning/unpinning the global note shows/hides it on every tab.
                broadcastGlobalVisibility(note);
            } else if (note) {
                chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                    if (tabs.length === 0 || !tabs[0] || !tabs[0].id) {
                        console.error("No active tab found for pin update.");
                        return;
                    }

                    const activeTab = tabs[0];

                    // Decide whether the note should be visible on the active
                    // tab under the new pin state, using the shared rule (exact
                    // page always, site-wide only when pinned, global always).
                    let shouldShow = false;
                    try {
                        const activeUrl = new URL(activeTab.url);
                        shouldShow = UserLocalStorage.shouldShowNoteOnPage(note, activeUrl.href, activeUrl.hostname);
                    } catch (error) {
                        console.warn('Unable to parse active tab URL for pin update.', error);
                    }

                    if (shouldShow) {
                        sendMessageToTab(activeTab.id, { "message": MESSAGE.INJECT_POPUPS, "noteData": note });
                    } else {
                        // Unpinned while viewing a different page of the host:
                        // remove the now site-specific note from this page.
                        sendMessageToTab(activeTab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: note.id });
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

                // The global note shares one size everywhere.
                if (UserLocalStorage.isGlobalNote(allNotes[noteIndex])) {
                    const senderTabId = sender && sender.tab ? sender.tab.id : null;
                    broadcastToAllTabs({ action: MESSAGE.SYNC_GLOBAL_STATE, note: allNotes[noteIndex] }, senderTabId);
                }
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

            // The global note is shown on every tab, so mirror the new color to
            // the other open instances. The originating tab already applied it
            // locally, so it is skipped. createCardAndUpdate syncs the color
            // class on the existing note element.
            const recoloredNote = noteData.find(note => note.id === uniqueId);
            if (UserLocalStorage.isGlobalNote(recoloredNote)) {
                const senderTabId = sender && sender.tab ? sender.tab.id : null;
                broadcastToAllTabs({ action: MESSAGE.UPDATE_CONTENT_IN_CARD, note: recoloredNote }, senderTabId);
            }
        }

        if (request.action === MESSAGE.UPDATE_MINIMIZED) {
            const noteId = request.id;
            const minimized = request.minimized;

            if (!isNonEmptyString(noteId) || typeof minimized !== 'boolean') {
                console.warn('updateMinimized ignored: missing or invalid id/minimized.');
                return;
            }

            const notesArray = await UserLocalStorage.retrieveNoteData();
            const updatedNotesArray = notesArray.map(note => {
                if (note.id === noteId) {
                    return { ...note, minimized: minimized };
                }
                return note;
            });

            await UserLocalStorage.setStorage(updatedNotesArray);

            // The global note shares one minimized state everywhere, so mirror
            // minimize/restore to its instances on the other tabs.
            const minimizedNote = updatedNotesArray.find(note => note.id === noteId);
            if (UserLocalStorage.isGlobalNote(minimizedNote)) {
                const senderTabId = sender && sender.tab ? sender.tab.id : null;
                broadcastToAllTabs({ action: MESSAGE.SYNC_GLOBAL_STATE, note: minimizedNote }, senderTabId);
            }
        }
        return true

    }
);













