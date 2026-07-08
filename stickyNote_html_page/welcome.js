// Welcome page: open the full "All Notes" management page.
document.getElementById("openAllNotes").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("stickyNote_html_page/index.html") });
});
