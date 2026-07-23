



let messageSent = false;
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        try {
            // Check if the message has already been sent
            if (!messageSent) {
                chrome.runtime.sendMessage({ action: MESSAGE.CONTENT_SCRIPT_INJECTED });
                messageSent = true; // Set the flag to true after sending the message
            }
        } catch (e) {
            console.log('Sending message failed with error:', e);
        }


        if (request.message === MESSAGE.START) {
            const noteData = request.noteData
            createCardAndUpdate(noteData);
            sendResponse({ status: "success" });

        }

        // rename -- note
        if (request.message === MESSAGE.INJECT_POPUPS) {
            injectCards(request.noteData)
            sendResponse({ status: "success" });
        }

        if (request.action === MESSAGE.REMOVE_ELEMENT_FROM_DOM) {
            const id = request.id
            SimpleShadowDOM.removeElementFromDom(id)
        }

        if (request.message === MESSAGE.HIDE_STICKY_NOTES) {
            const isHidden = request.isHidden

            if (isHidden === true) {
                SimpleShadowDOM.hideAllElementsFromDom()
            } else {
                SimpleShadowDOM.showAllElementsFromDom()
            }
        }

        if (request.action === MESSAGE.UPDATE_CONTENT_IN_CARD) {
            const noteData = request.note
            createCardAndUpdate(noteData)
        }

        if (request.action === MESSAGE.SYNC_GLOBAL_STATE) {
            syncNoteState(request.note)
        }

    }
);
