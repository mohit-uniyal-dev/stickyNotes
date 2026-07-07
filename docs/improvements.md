# StickyNotes Improvements And Issues

This document lists observed issues, refactoring opportunities, performance updates, and maintainability improvements in the current StickyNotes extension.

## Recently Addressed

The following broad UI work has been completed and should not be treated as pending unless future design changes are requested:

- Added a shared theme layer in `styles/theme.css`.
- Mapped legacy color variables through `styles/colorPalette.css`.
- Updated the valid-site popup UI in `stickyNotes/stickyNotes.html` and `stickyNotes/stickyNotes.css`.
- Updated the unsupported-page popup in `stickyNote_html_page/error.html` and `styles/error.css`.
- Updated the injected Shadow DOM note UI in `scripts/content_script/content_popup.js` and `styles/content_script.css`.
- Updated the full "All Notes" page UI in `stickyNote_html_page/index.html`, `styles/index.css`, and the generated templates in `scripts/custom_script/tab.js`.
- Added themed clean tooltip styling.
- Removed the old global `.select` style that was causing cross-surface visual conflicts.
- Fixed popup active-tab initialization so host-scoped actions wait for `hostName` and `url` before Add Note, Remove All, and initial host-specific rendering run.
- Fixed popup pin button binding so each generated note card uses a scoped `.pin-btn` control with `data-note-id` instead of duplicate `id="pin"` values.
- Reworked popup and All Notes note-card rendering so saved note content is inserted with text nodes instead of being parsed through `innerHTML`.
- Replaced All Notes search highlighting with safe text-node and `<mark>` construction, removing the unescaped `new RegExp(query, 'gi')` path.
- Standardized pinned-note restore behavior so content-script injection and completed tab loads both restore only pinned notes for the exact page URL.
- Fixed unsupported-page popup state so completed supported tab loads explicitly reset the action popup back to `stickyNotes/stickyNotes.html`.
- Fixed All Notes search selection handling so filtering works when no site is selected, preserves the selected site when possible, selects the first matching site otherwise, and shows empty states for no notes or no matches.
- Fixed popup-open note injection so opening the extension icon only re-injects pinned notes for the exact active page URL, not other pinned notes from the same hostname.
- Fixed storage helper writes so `setStorage`, `deleteNoteData`, `setIsHidden`, and `setIsViewGrid` return Promises, handle `chrome.runtime.lastError`, and key note write flows await completion.
- Routed injected note content edits through the background `updateNoteContent` message so content scripts no longer write note data directly to `chrome.storage.local`.
- Centralized empty-note cleanup through `UserLocalStorage` helpers and applied the no-empty-drafts policy on note close and tab close. Popup open no longer deletes empty notes, so a freshly created blank note survives reopening the popup before the user types.
- Fixed the All Notes tab close flow so `removeTab` targets the full notes page by its exact extension URL (`chrome.runtime.getURL('stickyNote_html_page/index.html')`) instead of the fragile `"StickyNotes"` title match that never matched.
- Consolidated note creation into a single `UserLocalStorage.createNote(url)` helper used by both the popup and the background, ending the `title`-field drift between the two paths and adding a `schemaVersion` field for future migrations.
- Removed the non-functional `contenteditable` heading on injected notes so the title bar no longer implies editing that was never persisted.
- Hardened the background message boundary: every mutating handler in `mainBg.js` now validates its payload (non-empty ids, string content, finite width/height, position objects, and an allow-listed note color) and ignores malformed or unknown-shaped requests before touching storage. Also fixed two latent null-dereferences uncovered while adding validation (`filterLocalStorage` used `noteToFind.url` without a null check, and `enablePin` could message the content script with an undefined note).
- Added popup empty, loading, and error states: the note list now shows "Loading notes...", a "no notes on this site yet" empty state, and a "notes cannot be added on this page" message when the active-tab context fails, instead of rendering a blank list.
- Made the All Notes page action icons (open-in-new-tab, delete-site, delete-note) real keyboard-operable `<button>` controls with `aria-label`s, decorative `aria-hidden` SVGs, and visible focus rings, so they are reachable and operable without a mouse.
- Normalized naming and spelling: renamed `retriveNoteData`/`retriveData` to `retrieveNoteData`/`retrieveData` across all call sites, renamed `tabListner.js`/`removeTabListner.js` to `tabListener.js`/`removeTabListener.js` (updating the `background.js` imports), and corrected `isSideBarVisiable`/`loaclstorage`/`clove btn` and similar identifiers and comments.
- Centralized all runtime message names in a shared `scripts/custom_script/messageTypes.js` (`MESSAGE` constants), loaded first in the service worker, content scripts, and every extension page. All sends and receivers now reference the constants instead of raw strings. Values are unchanged, so behavior is identical; verification confirmed no message-name literals remain in live code and every `MESSAGE.*` reference resolves to a definition. (Action/message string *values* were intentionally left as-is to preserve wire compatibility, so the historical `message` vs `action` key split and mixed value casing remain.)
- Fixed the injected-note caret reset: `createCardAndUpdate` no longer overwrites the note the user is actively editing (`shadowRoot.activeElement`) or performs no-op `textContent` rewrites, so echoed edits and mid-edit re-injections no longer collapse the cursor to the start.
- Clamped the popup note-card preview to two lines with an ellipsis (`-webkit-line-clamp`) and added `overflow-wrap: anywhere`, replacing the fixed `max-height` that sliced text mid-line.
- Converted injected-note dragging and resizing from mouse events to Pointer Events with pointer capture: adds touch/pen support, removes global `document` listeners, skips drags that begin on the note's control buttons, and persists position/size once on pointer-up (dragging previously saved via a debounced `mousemove`). Added `touch-action: none` to the drag handle and resize handles.
- Made the All Notes sidebar host cards keyboard-operable: each card is now a focusable `role="button"` with an `aria-label`, an `aria-pressed` state kept in sync with selection, Enter/Space activation (ignoring keys from the nested action buttons), and a visible focus ring.

## High Priority Bugs

No high-priority bugs are currently tracked.

## Data And State Issues

### 1. All notes are stored as one array

Every update reads and writes the full `notes` array. This increases race-condition risk when multiple extension contexts update notes at the same time.

Recommended fix:

- Store notes by id in an object map, for example `notesById`.
- Store host indexes separately if needed.
- Use one storage update path for all mutations.

## Refactoring Opportunities

### 1. Split large files by responsibility

`stickyNotes.js`, `tab.js`, and `mainBg.js` mix UI rendering, storage access, message handling, and business rules.

Recommended refactor:

- `noteStore.js`: storage reads/writes and note mutations.
- `noteModel.js`: creation, validation, schema defaults.
- `popupController.js`: popup event wiring.
- `popupRenderer.js`: popup DOM rendering.
- `backgroundMessages.js`: message routing.
- `allNotesController.js`: full page orchestration.
- `allNotesRenderer.js`: full page rendering.

### 2. Replace string-built HTML for dynamic UI

The code currently builds large HTML strings and inserts them via `innerHTML`.

Recommended refactor:

- Build DOM with `document.createElement`.
- Use `textContent` for user-visible content.
- Use `dataset` for ids and state.
- Keep SVG icon templates separate from note data.

Current status:

- The injected note renderer has been improved to use a themed shell and `textContent` for note content.
- Popup note cards and All Notes page note cards now use DOM construction for dynamic note rendering.
- Some static shell markup still uses templates, but note data should continue to be inserted through DOM APIs.

### 3. Improve async message handling

Some listeners return `true` globally while some branches also call `sendResponse`. This makes it harder to reason about response lifetimes.

Recommended refactor:

- Use one routing function per message action.
- Return `true` only when a branch responds asynchronously.
- Log and respond with structured errors for unknown actions.

## Performance Improvements

### 1. Avoid scanning all tabs for common actions

Several handlers call `chrome.tabs.query({})` and iterate all tabs to find a URL or title. This can become expensive and can cause unnecessary message attempts.

Recommended fix:

- Keep note updates scoped to the sender tab when possible.
- Query narrower filters where possible.
- Maintain a lightweight URL-to-tab index only if needed.

### 2. Avoid full re-render and listener reattachment

Popup and All Notes views frequently clear containers, rebuild all cards, and reattach all listeners.

Recommended fix:

- Re-render only changed notes where possible.
- Use event delegation for list actions.
- Keep current page, selected host, and filtered results in explicit state.

### 3. Reduce repeated storage reads

Rendering, pagination, pin changes, and searches repeatedly call `UserLocalStorage.retriveNoteData`.

Recommended fix:

- Load once per user action.
- Pass the loaded array into render helpers.
- Cache in memory per page and refresh after known mutations.

### 4. Lazy-load heavy libraries where needed

Tippy, Popper, and Bootstrap are bundled locally. The popup, All Notes page, and tooltips load them whether every feature is used or not.

Recommended fix:

- Load tooltip libraries only in contexts that render tooltips.
- Consider replacing Bootstrap usage on the All Notes page with smaller local CSS if bundle size matters.
  The modernized All Notes page now relies mostly on local custom CSS, but Bootstrap is still loaded by `stickyNote_html_page/index.html`.

## UX And Product Improvements

### 1. Define note scope clearly

The code mixes host-level and URL-level behavior. Users may expect notes on a specific page, while some code restores notes across an entire hostname.

Recommended product decision:

- Page notes: appear only on the exact URL.
- Site notes: appear on any page within a hostname.
- Add an explicit scope toggle if both are useful.

### 2. Improve pin controls

Pin/unpin terminology is inconsistent: `Pin`, `Un Pin All`, `pin/unpin`, `enablePin`, and close-as-unpin are all used.

Recommended fix:

- Use one model: pinned means visible on page load.
- Make close hide current note without changing pin, or explicitly label it as unpin.
- Rename "Un Pin All" to "Unpin all".

### 3. Improve accessibility

Icon controls across the popup, injected note, and All Notes page now use real `<button>` elements with accessible labels and visible focus states. The remaining gaps are the interactions that are still pointer-only.

Recommended fix:

- Add keyboard support for the draggable/resizable note (e.g. move and resize by arrow keys).
- Ensure note category colors are conveyed by more than color alone (e.g. a label or icon).

## Testing Gaps

There are no visible automated tests in the current repository.

Recommended tests:

- Unit tests for note creation and storage mutations.
- Unit tests for URL/hostname filtering behavior.
- Unit tests for search escaping and highlighting.
- Integration tests for popup add/delete/pin flows with mocked Chrome APIs.
- Integration tests for All Notes edit/delete/search flows.
- Manual extension smoke checklist for Chrome:
  - Install extension unpacked.
  - Add note on a normal webpage.
  - Edit note content.
  - Drag and resize note.
  - Reload page and confirm restore behavior.
  - Pin/unpin note.
  - Change color.
  - Delete one note.
  - Delete all notes for a hostname.
  - Open All Notes page.
  - Search and edit from All Notes.
  - Verify unsupported pages show error popup.

## Security And Privacy Improvements

### 1. Limit content script match scope if possible

The extension currently injects content scripts on `<all_urls>`.

Recommended fix:

- Keep `<all_urls>` only if the product requires it.
- Exclude known unsupported schemes and browser/internal pages where possible.
- Avoid injecting into sensitive pages if not needed.

### 2. Avoid storing unnecessary URLs if product allows

Notes currently store full page URLs. That is necessary for page-specific notes, but it is more sensitive than hostname-only storage.

Recommended fix:

- Store full URL only for page-scoped notes.
- Store hostname only for site-scoped notes.
- Document storage behavior in a privacy note if publishing.

## Suggested Implementation Order

1. Make storage helpers Promise-based and centralize all note mutations.
2. Refactor large files into store/model/render/controller layers.
3. Add unit tests around note mutation and filtering.
4. Add a manual smoke-test checklist to release workflow.
