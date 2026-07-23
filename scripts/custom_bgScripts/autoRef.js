// Auto-refresh open tabs on install/update, show the welcome page on first
// install, and surface "What's new" when the version changes.
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install" || details.reason === "update") {
        // Reload open tabs so the freshly (re)loaded content scripts are
        // available immediately, without the user having to refresh.
        chrome.tabs.query({}, function (tabs) {
            tabs.forEach(function (tab) {
                chrome.tabs.reload(tab.id);
            });
        });
    }

    if (details.reason === "install") {
        // First install only — open the full welcome page.
        chrome.tabs.create({ url: chrome.runtime.getURL("stickyNote_html_page/welcome.html") });
        return;
    }

    if (details.reason === "update") {
        // On a real version change (not a reload/enable), open the welcome page
        // scrolled to the "What's new" section so existing users see what
        // changed. The #whats-new fragment matches the section id.
        const currentVersion = chrome.runtime.getManifest().version;
        if (details.previousVersion && details.previousVersion !== currentVersion) {
            chrome.tabs.create({ url: chrome.runtime.getURL("stickyNote_html_page/welcome.html#whats-new") });
        }
    }
});
