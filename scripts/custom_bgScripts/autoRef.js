// Auto-refresh open tabs on install/update, and show the welcome page on first
// install.
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
        // First install only — open the welcome page.
        chrome.tabs.create({ url: chrome.runtime.getURL("stickyNote_html_page/welcome.html") });
    }
});
