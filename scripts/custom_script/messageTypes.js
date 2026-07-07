/**
 * Shared message-name constants for all StickyNotes runtime messaging.
 *
 * Every value here is the exact string the code already sends and compares
 * against, so swapping literals for these constants does not change runtime
 * behavior — it only removes duplicated raw strings and typo risk.
 *
 * Loaded first in every context that messages: the background service worker
 * (via importScripts), the content scripts (manifest content_scripts), and the
 * popup / All Notes / error pages (script tag). Because classic scripts in the
 * same realm share the global lexical scope, this top-level `const` is visible
 * to the sibling scripts loaded after it.
 *
 * Messages travel under two keys for historical reasons:
 *   - `action`  : background-directed requests and content DOM commands.
 *   - `message` : content-script UI commands (start / inject / hide / pin).
 * The key at each call site is unchanged; only the string value is centralized.
 */
const MESSAGE = Object.freeze({
    // Background-directed (`action`)
    STORE_NOTE_DATA: 'storeNoteData',
    CREATE_TAB_AND_INJECT: 'createTabAndInject',
    FILTER_LOCAL_STORAGE: 'filterLocalStorage',
    UPDATE_NOTE_CONTENT: 'updateNoteContent',
    REMOVE_USING_HOST_NAME: 'removeUsingHostName',
    REMOVE_TAB: 'removeTab',
    STORE_POSITION: 'storePosition',
    UPDATE_PIN: 'updatePin',
    ENABLE_PIN: 'enablePin',
    STORE_AND_UPDATE_SIZE: 'StoreAndUpdateWidthAndHeight',
    ADD_SELECTED_COLOR: 'addSelectedColor',
    CONTENT_SCRIPT_INJECTED: 'contentScriptInjected',

    // Content DOM commands (`action`)
    REMOVE_ELEMENT_FROM_DOM: 'removeElementFromDom',
    UPDATE_CONTENT_IN_CARD: 'updateContentInCard',

    // Content-script UI commands (`message`)
    START: 'start',
    INJECT_POPUPS: 'injectPopUps',
    HIDE_STICKY_NOTES: 'hideStickyNotes',
    UPDATE_PIN_IN_CONTENT_SCRIPT: 'updatePinInContentScript'
});
