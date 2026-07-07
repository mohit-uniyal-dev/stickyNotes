// Object to store tab URLs
let tabUrls = {};

// Listen for tab updates to store the URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url) {
        tabUrls[tabId] = tab.url; // Store the tab's URL
    }
});

// Listen for tab closures
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const closedTabUrl = tabUrls[tabId]; // Retrieve the stored URL for the closed tab
    delete tabUrls[tabId]; // Clean up the stored URL

    if (!closedTabUrl) {
        return;
    }

    const removedNotes = await UserLocalStorage.removeEmptyNotesForUrl(closedTabUrl);

    if (removedNotes.length > 0) {
        chrome.tabs.query({}, function (tabs) {
            tabs.forEach(tab => {
                removedNotes.forEach(note => {
                    chrome.tabs.sendMessage(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: note.id });
                });
            });
        });
    }

});

