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

## High Priority Bugs

### 1. Duplicate `id="pin"` breaks popup pin behavior

Each rendered popup card contains a button with `id="pin"`, then `document.querySelector('#pin')` is used to wire the listener. Only the first matching element is selected, so cards can receive incorrect pin behavior or no handler.

Recommended fix:

- Replace duplicate ids with a class such as `.pin-btn`.
- Scope queries to the card: `card.querySelector('.pin-btn')`.
- Use `data-note-id` instead of custom attributes like `uniqueId`.

### 2. Note content is still inserted with `innerHTML` in some extension-page flows

Some extension page paths still build dynamic UI with HTML strings and use `innerHTML`, especially in `stickyNotes.js` and `tab.js`. The injected Shadow DOM note renderer in `content_popup.js` now places note content with `textContent`, but the popup and All Notes page still need a broader rendering cleanup. Since note content is user-editable and persisted, any remaining `innerHTML` paths can allow markup injection into extension UI.

Recommended fix:

- Render user content with `textContent`.
- Preserve line breaks with CSS `white-space: pre-wrap`.
- If rich text is required, sanitize content with a trusted sanitizer before rendering.

### 3. Search builds unescaped regular expressions

`tab.js` creates `new RegExp(query, 'gi')` directly from user input. Special regex characters can throw errors or produce unexpected matches.

Recommended fix:

- Escape regex metacharacters before creating a `RegExp`.
- Wrap search filtering in defensive handling so the page does not break on invalid input.

### 4. Pinned note restore logic is inconsistent

`tabListner.js` restores pinned notes in two different ways:

- On `contentScriptInjected`, it requires hostname, exact URL, and `enablePin`.
- On tab load completion, it requires only hostname and `enablePin`.

This means pinned notes can appear differently depending on whether the page was loaded, reloaded, or received the initial content-script message.

Recommended fix:

- Define a clear product rule: notes are either page-specific by exact URL or site-wide by hostname.
- Apply the same filter everywhere.
- If both scopes are needed, add an explicit `scope` field such as `"page"` or `"host"`.

### 5. Unsupported page handling does not reset the popup

`tabListner.js` sets `chrome.action.setPopup` to `error.html` for unsupported pages, but there is no clear reset to the normal popup when navigating back to supported pages.

Recommended fix:

- On every supported tab update, explicitly set popup back to `stickyNotes/stickyNotes.html`.
- Guard all URL parsing because `new URL(tab.url)` can fail for some browser pages or missing URLs.

### 6. All Notes search can crash when nothing is selected

`tab.js` uses `selectedNoteContainer.getAttribute(...)` during filtering. If the current selection has been cleared or no notes exist, search can throw.

Recommended fix:

- Treat selected host as nullable.
- If no host is selected, either render all filtered results or select the first available result.
- Add empty states for no notes and no search matches.

## Data And State Issues

### 1. All notes are stored as one array

Every update reads and writes the full `notes` array. This increases race-condition risk when multiple extension contexts update notes at the same time.

Recommended fix:

- Store notes by id in an object map, for example `notesById`.
- Store host indexes separately if needed.
- Use one storage update path for all mutations.

### 2. Writes are not consistently awaited

`UserLocalStorage.setStorage` does not return a Promise, but several call sites use `await` on it. That `await` does not wait for `chrome.storage.local.set` to finish.

Recommended fix:

- Update `setStorage`, `deleteNoteData`, `setIsHidden`, and `setIsViewGrid` to return Promises.
- Handle `chrome.runtime.lastError`.
- Prefer `chrome.storage.local` promise APIs if target Chrome versions support them.

### 3. Content editing writes directly to storage

Injected note editing uses `UpdateData` in `content_eventHandling.js`, which writes directly to `chrome.storage.local`. Other editing flows send messages to background.

Recommended fix:

- Centralize mutations in background/service-worker handlers.
- Make content scripts send structured update messages.
- Keep storage schema updates in one module.

### 4. Empty-note cleanup is spread across multiple paths

Empty notes are removed by close handling, tab close handling, and a commented-out popup cleanup block.

Recommended fix:

- Create one cleanup policy and one cleanup function.
- Decide whether empty notes should be allowed as drafts.
- Run cleanup only on clear lifecycle events.

### 5. `removeTab` closes by tab title

Background closes tabs whose title equals `"StickyNotes"`, but the full notes page title is `"Stick it - web notes"`. Title matching is fragile and can close unrelated pages if titles match.

Recommended fix:

- Track the extension tab id when opening the All Notes page.
- Or query by `chrome.runtime.getURL('stickyNote_html_page/index.html')`.

## Refactoring Opportunities

### 1. Consolidate note creation

Notes are created in both popup code and `mainBg.js`, with slightly different fields. This can lead to schema drift.

Recommended refactor:

- Create one `createNote({ url })` helper.
- Use it from both popup and background flows.
- Add a schema version field to support migrations later.

### 2. Split large files by responsibility

`stickyNotes.js`, `tab.js`, and `mainBg.js` mix UI rendering, storage access, message handling, and business rules.

Recommended refactor:

- `noteStore.js`: storage reads/writes and note mutations.
- `noteModel.js`: creation, validation, schema defaults.
- `popupController.js`: popup event wiring.
- `popupRenderer.js`: popup DOM rendering.
- `backgroundMessages.js`: message routing.
- `allNotesController.js`: full page orchestration.
- `allNotesRenderer.js`: full page rendering.

### 3. Replace string-built HTML for dynamic UI

The code currently builds large HTML strings and inserts them via `innerHTML`.

Recommended refactor:

- Build DOM with `document.createElement`.
- Use `textContent` for user-visible content.
- Use `dataset` for ids and state.
- Keep SVG icon templates separate from note data.

Current status:

- The injected note renderer has been improved to use a themed shell and `textContent` for note content.
- Popup note cards and All Notes page cards still rely on string-built HTML and should be refactored separately.

### 4. Normalize naming and spelling

Examples:

- `retriveNoteData` should be `retrieveNoteData`.
- `tabListner.js` should be `tabListener.js`.
- `removeTabListner.js` should be `removeTabListener.js`.
- `clove btn`, `Visiable`, `loaclstorage`, and similar comments/variables should be corrected.

Recommended refactor:

- Rename internal functions and files carefully.
- Keep compatibility wrappers where renaming could touch many files.

### 5. Use constants for message names

Message names such as `injectPopUps`, `removeUsingHostName`, `enablePin`, and `StoreAndUpdateWidthAndHeight` are repeated as raw strings.

Recommended refactor:

- Define a shared `MESSAGE_TYPES` object.
- Keep action names consistent in casing.
- Validate message payloads in background before mutating storage.

### 6. Improve async message handling

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

### 4. Debounce resize and drag final writes more deliberately

Dragging saves through a debounced mousemove handler, while resizing saves only on mouseup. This is acceptable but inconsistent.

Recommended fix:

- Save drag and resize on pointerup.
- Optionally store intermediate state in memory for smoother UI.
- Use Pointer Events for mouse, touch, and pen support.

### 5. Lazy-load heavy libraries where needed

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

### 2. Add empty and loading states

The popup and All Notes page have minimal states for no notes, no search results, unsupported pages, and storage errors.

Recommended fix:

- Add clear empty states for no notes and no matching search results.
- Disable actions that do not apply.
- Show a short error if storage or tab messaging fails.

### 3. Improve pin controls

Pin/unpin terminology is inconsistent: `Pin`, `Un Pin All`, `pin/unpin`, `enablePin`, and close-as-unpin are all used.

Recommended fix:

- Use one model: pinned means visible on page load.
- Make close hide current note without changing pin, or explicitly label it as unpin.
- Rename "Un Pin All" to "Unpin all".

### 4. Add note titles or remove title UI

Injected notes show an editable `"Stick it"` heading, but the edited title is not persisted. Background-created notes have a default `title` field but UI does not use it consistently.

Recommended fix:

- Persist editable note titles.
- Or remove title editing until title support is fully implemented.

### 5. Improve accessibility

Several icon controls now have accessible labels after the UI refresh, but accessibility is not complete across generated SVG controls and older event wiring.

Recommended fix:

- Add `aria-label` to icon buttons.
- Use real `<button type="button">` controls consistently.
- Add keyboard support for draggable/resizable alternatives where practical.
- Ensure color choices are not the only state indicator.

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

### 2. Validate all message payloads

Background handlers trust incoming `request` payloads.

Recommended fix:

- Validate required fields and types before storage changes.
- Ignore unknown actions.
- Avoid acting on ids that do not exist.

### 3. Avoid storing unnecessary URLs if product allows

Notes currently store full page URLs. That is necessary for page-specific notes, but it is more sensitive than hostname-only storage.

Recommended fix:

- Store full URL only for page-scoped notes.
- Store hostname only for site-scoped notes.
- Document storage behavior in a privacy note if publishing.

## Suggested Implementation Order

1. Fix correctness and safety issues: duplicate pin ids, remaining `innerHTML` user content rendering, regex escaping, and popup reset on supported pages.
2. Normalize note scope behavior across popup, content script injection, and tab reloads.
3. Make storage helpers Promise-based and centralize all note mutations.
4. Refactor large files into store/model/render/controller layers.
5. Add unit tests around note mutation and filtering.
6. Add a manual smoke-test checklist to release workflow.
