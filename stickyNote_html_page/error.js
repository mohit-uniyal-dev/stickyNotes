const seeAllNotes = document.getElementById('seeAllNotes')


seeAllNotes.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MESSAGE.CREATE_TAB_AND_INJECT });
    // UserLocalStorage.deleteNoteData()
});