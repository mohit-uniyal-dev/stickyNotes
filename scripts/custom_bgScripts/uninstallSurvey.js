// Register an optional, anonymous uninstall feedback survey. Chrome opens this
// URL after the extension is removed (no code runs at uninstall time, so the URL
// is registered ahead of time). The survey is a Google Forms page; the
// extension never attaches note content, the page URLs notes were on, or any
// personal identifier to it.
//
// NOTE: this is a plain share link (no pre-filled fields). To auto-tag responses
// with the extension version / OS, replace SURVEY_URL with the form's
// `.../viewform?usp=pp_url&entry.<id>=...` URL and set the params from
// chrome.runtime.getManifest().version and chrome.runtime.getPlatformInfo().
const SURVEY_URL = "https://forms.gle/ZcScDt8caogB5gvb9";

try {
    if (SURVEY_URL) {
        chrome.runtime.setUninstallURL(SURVEY_URL);
    }
} catch (error) {
    console.warn("Could not set the uninstall survey URL.", error);
}
