
try {
    importScripts(
        "scripts/custom_script/messageTypes.js",
        "scripts/custom_script/localdb.js",
        "scripts/custom_bgScripts/autoRef.js",
        "scripts/custom_bgScripts/mainBg.js",
        "scripts/custom_bgScripts/tabListener.js",
        "scripts/custom_bgScripts/removeTabListener.js",
        "scripts/custom_bgScripts/uninstallSurvey.js"
    );
} catch (e) {
    console.log("Error Importing background scripts ", e);
}
