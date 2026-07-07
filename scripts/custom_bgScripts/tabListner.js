const ERROR_URLS = [
    'chrome://newtab/',
    'chrome://extensions/'
];

const getTabUrlContext = (tab) => {
    if (!tab || !tab.url) {
        return null;
    }

    try {
        const parsedUrl = new URL(tab.url);
        return {
            href: parsedUrl.href,
            hostName: parsedUrl.hostname
        };
    } catch (error) {
        console.warn('Unable to parse tab URL for StickyNotes restore.', error);
        return null;
    }
};

const isPinnedNoteForTab = (note, tabContext) => {
    return Boolean(
        note &&
        tabContext &&
        note.enablePin &&
        note.hostName === tabContext.hostName &&
        note.url === tabContext.href
    );
};

const restorePinnedNotesForTab = async (tab) => {
    if (!tab || !tab.id) {
        return;
    }

    const tabContext = getTabUrlContext(tab);
    if (!tabContext) {
        return;
    }

    const noteArr = await UserLocalStorage.retriveNoteData();
    const notesToRestore = noteArr.filter((note) => isPinnedNoteForTab(note, tabContext));

    notesToRestore.forEach((note) => {
        chrome.tabs.sendMessage(tab.id, {
            message: 'injectPopUps',
            noteData: note,
        });
    });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'contentScriptInjected') {
        restorePinnedNotesForTab(sender.tab).catch((error) => {
            console.warn('Unable to restore pinned StickyNotes after content script injection.', error);
        });
    }
});

// Listen for tab URL updates (e.g., navigating to a different page in the same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
        return;
    }

    const tabContext = getTabUrlContext(tab);
    if (!tabContext) {
        return;
    }

    // Check if the URL matches any in the errorURLs list
    if (ERROR_URLS.includes(tabContext.href)) {
        chrome.action.setPopup({ tabId: tabId, popup: '../../stickyNote_html_page/error.html' });
        return; // Exit function to prevent further actions
    }

    if (tab && tab.title && tab.title.includes('Stick it - web notes')) {
        chrome.action.setPopup({ tabId: tabId, popup: '../../stickyNote_html_page/error.html' });
        return;
    }

    await restorePinnedNotesForTab(tab);
});
