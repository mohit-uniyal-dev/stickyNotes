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
- Reduced redundant tab scanning: `removeUsingHostName` now runs one `chrome.tabs.query({})` and matches every removed note against each tab (previously a full tab scan per note), and `updateNoteContent` no longer broadcasts the edit back to the tab that originated it.
- Fixed a duplicate-listener bug in the All Notes sidebar and moved selection to event delegation. `toggleNoteContainerSelection` used to re-attach click/keydown handlers to every host card each time it ran — including after deletes, which do not rebuild the sidebar — so a card accumulated handlers and one click would select-then-deselect. Selection is now bound once via a delegated listener on the stable `.list_notes` container.
- Added a minimize feature for injected notes: a header minimize button collapses a note into a single shared, self-organizing "docked tray" of pills at the bottom-right of the page (`scripts/content_script/minimizedTray.js`, its own isolated shadow root), instead of leaving multiple minimized notes floating and overlapping. Clicking a pill restores the note to its place. The minimized state is persisted via a new `minimized` note field and `updateMinimized` background handler, so a note left minimized returns to the tray after a reload; deleting a note also clears its pill.
- Constrained note dragging to the viewport. Dragging had no bounds, so a note could be dropped fully off-screen and become unreachable. The drag handler now captures the element's rendered box (accounting for the `translate(-50%, -50%)` centering) on pointer-down and clamps each move so the whole note stays on screen; a note larger than the viewport pins to the top-left edge.
- Reduced repeated storage reads in the popup. A single user action (open, add, delete, change page) now reads the notes array once and threads it through the render, pagination, and pagination-visibility helpers via a shared `refreshNotesView(preloaded)`, instead of each helper re-reading `chrome.storage`. Popup init went from ~4 reads to 1, and paging/add/delete from ~3–4 to 1. The helpers still read on their own when called without a preloaded array, so nothing else had to change.
- Tightened content-script scope from `<all_urls>` to `http://*/*` and `https://*/*` (and matched the web-accessible-resources scope), and added `file:` to the unsupported-protocol list so local-file pages show the "notes cannot be added on this page" popup instead of a non-functional one.
- Fixed and expanded localization. Three locale folders used invalid Chrome codes (`ch`, `ge`, `sp`), so Chrome silently ignored them — renamed to `zh`, `de`, `es`. Regenerated every locale complete and consistent with English (all 21 keys; brand name kept untranslated; dev-placeholder/typo strings replaced), and added Portuguese (`pt`) and Hindi (`hi`) for the top install regions (Brazil, India). Eight working locales now: `en`, `de`, `es`, `fr`, `hi`, `ja`, `pt`, `zh`.
- Bumped the extension to **v1.2.0** and added a root `RELEASE.md` — a dependency-free pre-flight + smoke-test + store-submission checklist (excluded from the shipped zip via `tools/zip.mjs`).
- Release-prep cleanups: removed the stale `lib/*` web-accessible-resources entry (there is no `lib/` folder), rewrote the extension description to a clean 103-character summary, and normalized the pin control labels ("Pin or unpin note" for a note, "Pin all" / "Unpin all" for the host toggle).
- Added an optional, anonymous uninstall feedback survey. `scripts/custom_bgScripts/uninstallSurvey.js` registers a Google Forms URL via `chrome.runtime.setUninstallURL`, which Chrome opens after removal. No note content, page URLs, or identifiers are attached. This is the extension's only off-device data flow and is disclosed in `PRIVACY.md` and the store-listing data-usage notes. (Version/OS pre-fill is a documented follow-up that needs the form's `entry.*` field IDs.)
- Added a first-run welcome page and adapted the store promo assets. `autoRef.js` now opens `stickyNote_html_page/welcome.html` on first install (only), a themed onboarding page (`styles/welcome.css`, built on the shared theme tokens) describing the actual note features — add, pin, drag/resize/color/minimize, and the All Notes page — with a CTA that opens All Notes. `docs/promo-tiles.html` was retooled to this project's palette (dark premium background with colorful sticky-note cards) and trimmed to just the marquee (1400×560) and small (440×280) promo tiles.
- Treated the Chrome Web Store as an unsupported page. Its URLs are `https` but Chrome blocks content-script injection there, so the normal (non-functional) popup was shown; `chromewebstore.google.com` (and the legacy `chrome.google.com/webstore`) now show the "notes cannot be added on this page" popup instead.
- Hardened tab messaging against "Receiving end does not exist" rejections. Messaging a tab that has no content script (page still loading, a restricted page such as the Chrome Web Store, or a tab opened before the extension loaded) rejected unhandled and surfaced as an uncaught promise error (visible from the popup on open). Added a shared `sendMessageToTab(tabId, message)` helper in `messageTypes.js` that swallows that benign rejection, and routed every fire-and-forget `chrome.tabs.sendMessage` through it (popup, `mainBg`, `tabListener`, `removeTabListener`, and the All Notes page). The one send that needs a response (Add Note) keeps the callback form with a `chrome.runtime.lastError` check.
- Documented data handling for publishing: added a hostable `PRIVACY.md` (all notes and page URLs stay in `chrome.storage.local`, nothing is transmitted, no analytics or third parties — verified there are no network calls in the code) and `docs/store-listing.md` (single-purpose statement and per-permission justifications for the Chrome Web Store review form). Notes remain page-scoped, so the stored full URL is required and is disclosed rather than removed.

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

Current status:

- The worst case — a full tab scan per removed note in `removeUsingHostName` — is fixed, and `updateNoteContent` no longer echoes to the sender tab.
- The remaining handlers still use a single `chrome.tabs.query({})` per action. Narrowing these with a `url` match pattern was deferred because note URLs can contain characters that are unsafe to embed directly in a match pattern.

### 2. Avoid full re-render and listener reattachment

Popup and All Notes views frequently clear containers, rebuild all cards, and reattach all listeners.

Recommended fix:

- Re-render only changed notes where possible.
- Use event delegation for list actions.
- Keep current page, selected host, and filtered results in explicit state.

Current status:

- All Notes sidebar host-card selection is now delegated (one listener on `.list_notes`), which fixed duplicate-listener accumulation after deletes.
- The main content area still rebuilds its cards and reattaches edit/delete listeners, but always on freshly created elements, so no duplication occurs there. Incremental "render only changed notes" is not yet implemented.

### 3. Reduce repeated storage reads

Rendering, pagination, pin changes, and searches repeatedly call `UserLocalStorage.retrieveNoteData`.

Recommended fix:

- Load once per user action.
- Pass the loaded array into render helpers.
- Cache in memory per page and refresh after known mutations.

Current status:

- The popup render/pagination path now reads once per action and threads the loaded array through the helpers (`refreshNotesView`, plus optional `preloaded` parameters on `renderNotes`, `renderPagination`, `checkPagination`, `getTotalPages`, `getSameHostNameLength`).
- The All Notes page (`tab.js`) and a few popup menu handlers (settings menu, pin/unpin all) still read independently per call.

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

User-facing pin labels are now consistent ("Pin or unpin note" for a single
note, "Pin all" / "Unpin all" for the host-wide toggle). The remaining item is a
product/behavior decision, not a label change:

- Decide the model for the note's close (X) button: it currently unpins the note
  (and deletes it if empty). Either keep close as an explicit "unpin", or make
  close hide the note without changing its pinned state — and pick one so the
  behavior is predictable.

### 3. Improve accessibility

Icon controls across the popup, injected note, and All Notes page now use real `<button>` elements with accessible labels and visible focus states. The remaining gaps are the interactions that are still pointer-only.

Recommended fix:

- Add keyboard support for the draggable/resizable note (e.g. move and resize by arrow keys).
- Ensure note category colors are conveyed by more than color alone (e.g. a label or icon).

## Testing Gaps

There are no unit tests yet, but lightweight, dependency-free tooling now exists
(`package.json` + `tools/`):

- `npm run check` (`tools/check.mjs`) — `node --check` over every first-party
  script, a manifest parse plus referenced-file existence check, and a
  stale-string scan for regressions of past fixes (misspellings, renamed files,
  the removed `messageActiveTab`, the old `id="pin"` bug).
- `npm run zip` (`tools/zip.mjs`) — runs the check, then builds a spec-compliant
  Chrome Web Store upload zip of runtime files only (excludes `tools/`, `docs/`,
  `package.json`, and dotfiles).

Recommended tests (still worth adding):

- Unit tests for note creation and storage mutations.
- Unit tests for URL/hostname filtering behavior.
- Unit tests for search escaping and highlighting.
- Integration tests for popup add/delete/pin flows with mocked Chrome APIs.
- Integration tests for All Notes edit/delete/search flows.
The manual smoke test is now maintained as a full, up-to-date checklist in
`RELEASE.md` (install, popup, injected note, restore-on-reload, All Notes,
unsupported pages, and the uninstall survey), to be run before each release.

## Security And Privacy Improvements

No open security or privacy items are currently tracked. Content scripts are scoped to `http`/`https` (with `file://` and browser-internal pages treated as unsupported), all background message payloads are validated before storage writes, and data handling is documented in `PRIVACY.md` (all data stays in `chrome.storage.local`; nothing is transmitted). Notes remain page-scoped, so the full page URL is stored and disclosed rather than reduced to hostname.

## Suggested Implementation Order

1. Make storage helpers Promise-based and centralize all note mutations.
2. Refactor large files into store/model/render/controller layers.
3. Add unit tests around note mutation and filtering.
4. Add a manual smoke-test checklist to release workflow.
