const ERROR_URLS = [
    'chrome://newtab/',
    'chrome://extensions/'
];
const ERROR_POPUP = 'stickyNote_html_page/error.html';
const NOTES_POPUP = 'stickyNotes/stickyNotes.html';
const UNSUPPORTED_PROTOCOLS = new Set([
    'about:',
    'chrome:',
    'chrome-extension:',
    'devtools:',
    'edge:',
    'view-source:',
    // Content scripts only match http/https, so file:// pages have no note
    // support and should show the unsupported-page popup.
    'file:'
]);

// Pages that are http/https but where Chrome still blocks content-script
// injection (most notably the Chrome Web Store), so notes cannot work there and
// the unsupported-page popup should be shown instead of the normal one.
const RESTRICTED_HOSTS = new Set([
    'chromewebstore.google.com',
    'chrome.google.com'
]);

const getTabUrlContext = (tab) => {
    if (!tab || !tab.url) {
        return null;
    }

    try {
        const parsedUrl = new URL(tab.url);
        return {
            href: parsedUrl.href,
            hostName: parsedUrl.hostname,
            protocol: parsedUrl.protocol
        };
    } catch (error) {
        console.warn('Unable to parse tab URL for StickyNotes restore.', error);
        return null;
    }
};

const shouldShowNoteOnTab = (note, tabContext) => {
    if (!note || !tabContext) {
        return false;
    }
    // A note always shows on its own exact page. A pinned note additionally
    // shows on every page of the same host (site-wide).
    const samePage = note.url === tabContext.href;
    const siteWidePinned = Boolean(note.enablePin) && note.hostName === tabContext.hostName;
    return samePage || siteWidePinned;
};

const isRestrictedHost = (tabContext) => {
    if (RESTRICTED_HOSTS.has(tabContext.hostName)) {
        return true;
    }
    // The legacy Chrome Web Store is served from chrome.google.com/webstore.
    return tabContext.hostName === 'chrome.google.com' && tabContext.href.includes('/webstore');
};

const isUnsupportedTab = (tab, tabContext) => {
    return Boolean(
        !tabContext ||
        ERROR_URLS.includes(tabContext.href) ||
        UNSUPPORTED_PROTOCOLS.has(tabContext.protocol) ||
        isRestrictedHost(tabContext) ||
        (tab && tab.title && tab.title.includes('Stick it - web notes'))
    );
};

const setActionPopup = (tabId, popup) => {
    if (typeof tabId !== 'number') {
        return;
    }

    chrome.action.setPopup({ tabId: tabId, popup: popup });
};

const restorePinnedNotesForTab = async (tab) => {
    if (!tab || !tab.id) {
        return;
    }

    const tabContext = getTabUrlContext(tab);
    if (!tabContext) {
        return;
    }

    const noteArr = await UserLocalStorage.retrieveNoteData();
    const notesToRestore = noteArr.filter((note) => shouldShowNoteOnTab(note, tabContext));

    notesToRestore.forEach((note) => {
        sendMessageToTab(tab.id, {
            message: MESSAGE.INJECT_POPUPS,
            noteData: note,
        });
    });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === MESSAGE.CONTENT_SCRIPT_INJECTED) {
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
        setActionPopup(tabId, ERROR_POPUP);
        return;
    }

    if (isUnsupportedTab(tab, tabContext)) {
        setActionPopup(tabId, ERROR_POPUP);
        return; // Exit function to prevent further actions
    }

    setActionPopup(tabId, NOTES_POPUP);

    await restorePinnedNotesForTab(tab);
});
