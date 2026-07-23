# StickyNotes Current Flow

This repository is a Chrome Manifest V3 extension named "Stick it - web notes". It lets users create sticky notes on websites, persist those notes in `chrome.storage.local`, re-inject pinned notes into webpages, and manage all saved notes from a separate extension page.

## Project Structure

- `manifest.json` defines the extension entry points, permissions, content scripts, service worker, localization, icons, and web accessible resources.
- `background.js` loads the background modules with `importScripts`.
- `stickyNotes/` contains the browser action popup UI.
- `scripts/content_script/` contains scripts injected into webpages to render, edit, drag, resize, pin, color, and remove sticky notes.
- `scripts/custom_bgScripts/` contains service worker logic for note creation, note updates, tab coordination, install/update reloads, and cleanup.
- `stickyNote_html_page/` contains the full-page "All Notes" view, the unsupported-page popup, and the first-run welcome page.
- `scripts/custom_script/` contains shared helpers for storage, localization, tooltips, and the full-page notes view.
- `styles/` contains popup, injected note, full-page, error page, color palette, and vendored Bootstrap CSS.
- `_locales/` contains Chrome i18n message files.
- `assets/icons/` contains extension icons.

## Theme And UI Layer

The extension now uses a shared theme layer for the major visible surfaces.

- `styles/theme.css` defines shared design tokens for typography, spacing, radii, shadows, surfaces, borders, text colors, primary actions, warning/danger states, note colors, and light/dark mode.
- `styles/colorPalette.css` imports `theme.css` and exposes legacy variable aliases such as `--popup-bg`, `--page-bg`, and `--color-red` so older CSS and note color classes continue to work.
- `stickyNotes/stickyNotes.css` styles the valid-site action popup using the shared tokens.
- `styles/error.css` styles the unsupported-page popup using the shared tokens.
- `styles/index.css` styles the full "All Notes" page, including header, sidebar, search, host cards, note cards, grid/list layout, and tooltips.
- `styles/content_script.css` styles injected Shadow DOM notes with its own token set because injected notes are isolated from extension page CSS.

Theme selection currently follows `prefers-color-scheme`, with explicit `[data-theme="light"]` and `[data-theme="dark"]` token support available for a future manual theme toggle.

The UI surfaces that have been modernized are:

- Valid-site extension popup.
- Unsupported-page popup.
- Injected on-page note card.
- Full "All Notes" page.
- Shared clean tooltips.

## Extension Registration

`manifest.json` registers:

- Manifest version: `3`.
- Action popup: `stickyNotes/stickyNotes.html`.
- Background service worker: `background.js`.
- Permissions: `activeTab`, `storage`, and `tabs`.
- Content scripts on `http://*/*` and `https://*/*`:
  - `scripts/custom_script/messageTypes.js`
  - `scripts/custom_script/localizedText.js`
  - `scripts/content_script/content_script.js`
  - `scripts/content_script/draggable.js`
  - `scripts/content_script/content_popup.js`
  - `scripts/content_script/minimizedTray.js`
  - `scripts/content_script/content_eventHandling.js`
- Content CSS: `styles/colorPalette.css`.
- Web accessible resources for assets, styles, and extension HTML pages.

The background service worker imports:

- `scripts/custom_script/messageTypes.js`
- `scripts/custom_script/localdb.js`
- `scripts/custom_bgScripts/autoRef.js`
- `scripts/custom_bgScripts/mainBg.js`
- `scripts/custom_bgScripts/tabListener.js`
- `scripts/custom_bgScripts/removeTabListener.js`
- `scripts/custom_bgScripts/uninstallSurvey.js`

## Data Model

All notes are stored in `chrome.storage.local` under the `notes` key as a single array.

A note object is created with these core fields:

```js
{
  id,
  date,
  time,
  hostName,
  url,
  content,
  enablePin
}
```

Additional fields are added later by user interactions:

- `title`: created by background note creation, currently defaulted to `"Title"`.
- `position`: saved after dragging a note.
- `width` and `height`: saved after resizing a note.
- `color`: saved after choosing a note color.
- `minimized`: whether the note is collapsed into the docked minimized tray; defaulted to `false` by `createNote` and toggled by the note's minimize button and tray restore.
- `enablePin`: whether the note is shown site-wide (on every page of its host) in addition to its own page. Every note always restores on its own exact page; `enablePin` is the opt-in for site-wide visibility. New notes default to `false` (page-specific).
- `scope`: `'page' | 'site' | 'global'`. `'global'` marks the single shared note shown on every supported site (see "Global Note" below); `'page'`/`'site'` mirror the `enablePin` model. New notes default to `'page'`.
- `schemaVersion`: the note schema version (currently `3`). A one-time `migrateNotes()` on service-worker start upgrades older notes: pre-v2 notes reset to page-specific, and v2 notes gain an explicit `scope` (`'site'` if pinned, else `'page'`). Migration never produces a global note.

### Global Note

There is at most one **global note** (`scope: 'global'`), a singleton shown on every supported site rather than being bound to a page or host.

- **Visibility** goes through the shared rule `UserLocalStorage.shouldShowNoteOnPage(note, href, hostName)` (a global note returns `true` on any supported page). Both background restore paths (`tabListener.js`, the `enablePin` handler in `mainBg.js`) and the popup use this one predicate.
- **Sync** is eventual, not collaborative: after the debounced edit, the background broadcasts the change to every tab (`broadcastToAllTabs`) instead of matching by URL. Content edits, color changes, and deletion are broadcast. Position, size, and minimized state are also shared across all instances: dragging, resizing, or minimizing the global note on one tab mirrors to the others via `SYNC_GLOBAL_STATE` (content side `syncNoteState` / `MinimizedTray.syncMinimized`, applied without re-persisting so it never loops), and any tab reads the same values on load.
- **Singleton + safety**: `UserLocalStorage.ensureGlobalNote(url)` returns the existing global note or creates one (never a second). The global note is excluded from empty-draft cleanup, from host `Remove All`, and from `Pin/Unpin All`. **Closing (X) the global note behaves like a normal note**: it only dismisses it from the current tab's view (the `updatePin` branch is a no-op for it), so it is not deleted and reappears on reload. Permanent removal is the explicit delete from the popup card or the All Notes page, which removes it from every tab and from storage.
- **Position/size** are shared across all sites (it is one note object).

Shared storage access is wrapped by `UserLocalStorage` in `scripts/custom_script/localdb.js`. Its read and write helpers return Promises and reject when `chrome.runtime.lastError` is present.

Empty note cleanup is centralized in `UserLocalStorage`. Whitespace-only notes are treated as empty and are removed on note close, tab close for the matching URL, and popup startup cleanup.

## Popup Flow

The popup is implemented by `stickyNotes/stickyNotes.html`, `stickyNotes/stickyNotes.js`, and `stickyNotes/stickyNotes.css`. It uses the shared theme tokens from `styles/theme.css` through `styles/colorPalette.css`.

On `DOMContentLoaded`, `stickyNotes.js`:

1. Finds popup controls such as Add Note, Remove All, settings menu, All Notes link, and note list.
2. Reads localized strings through `localizedText.js`.
3. Queries the active tab and extracts `hostName` and `url`.
4. Loads all notes from `chrome.storage.local`.
5. Filters notes by active tab hostname.
6. Renders up to two notes per page in the popup list.
7. Builds simple pagination.
8. Injects notes that should show on the active tab: any note whose exact URL matches the active tab, plus any pinned note whose hostname matches (site-wide).

### Add Note

When the user clicks `Add Note`:

1. The popup builds a new note object from the active tab URL and hostname.
2. It sends a message to the active tab content script:

   ```js
   { message: "start", noteData }
   ```

3. The content script creates the sticky note popup in the webpage.
4. If the content script responds with `status: "success"`, the popup appends the note to `chrome.storage.local.notes`.
5. The popup re-renders the current hostname note list and pagination.

### Popup Note Cards

Popup note cards show:

- Date.
- A content preview.
- Delete button.
- Pin/unpin button.
- Header color if the note has a saved `color`.

The popup shell includes a themed brand mark, settings icon button, primary Add Note action, a secondary Global Note action, count row, delete-all action, note cards, and pagination.

A **Global Note** button (below Add Note) creates the singleton global note if it does not exist yet — via `UserLocalStorage.ensureGlobalNote` — otherwise re-opens it on the active tab. The global note is rendered as a distinct, globe-marked card pinned to the top of the list on every site, and is kept out of the per-host note count and pagination.

Deleting a popup note:

1. Confirms with the user.
2. Removes the note from the storage array.
3. Removes the popup card.
4. Sends `removeElementFromDom` to the active tab.
5. Closes any open All Notes tab by sending `removeTab` with title `"StickyNotes"`.
6. Re-renders pagination.

Pin/unpin from the popup sends the pin change straight to the background:

```js
{ action: "enablePin", isPinEnable, id }
```

The background updates storage, then injects or removes the note on the active
tab based on the `samePage || (pinned && sameHost)` rule. The on-page pin
control stays in visual sync with the stored state via `createCardAndUpdate`.

### Remove All For Current Hostname

The popup remove-all action:

1. Confirms with the user.
2. Clears the popup list.
3. Sends `removeUsingHostName` to background.
4. Closes any All Notes tab.
5. Sets the popup note count to zero.

The background removes all stored notes with the matching hostname and asks matching tabs to remove those note elements from the DOM.

### Settings Menu

The gear button toggles `#settingsMenu`.

The menu contains:

- `All Notes`: sends `createTabAndInject` to open the full notes page.
- `Pin` / `Un Pin All`: toggles `enablePin` for all notes on the active hostname through `UserLocalStorage.updateNote`.

## Injected Webpage Note Flow

Injected notes are rendered with Shadow DOM by `scripts/content_script/content_popup.js`.

The main classes and functions are:

- `SimpleShadowDOM.getHtmlTemplate(note)`: returns the Shadow DOM note shell HTML string.
- `SimpleShadowDOM.createPopup(note)`: creates a host element, attaches a shadow root, injects the note template, links `styles/content_script.css`, and wires dragging, resizing, and note events.
- `createCardAndUpdate(note)`: updates an existing note element if one with the same `id` is already present, otherwise creates a new popup. Injected note content is placed with `textContent`.
- `makeResizable(element, size)`: applies saved dimensions and stores new dimensions after resizing.
- `makeDraggable(element, handle, id, position)` (defined in `scripts/content_script/draggable.js`): applies saved position and stores new position after dragging.

The injected note UI is a themed Shadow DOM card with a header toolbar, add/color/pin/minimize/close controls, color palette, editable body, empty placeholder, resize handles, persisted position, and persisted size.

`scripts/content_script/minimizedTray.js` provides `MinimizedTray`, a shared Shadow DOM strip anchored to the bottom-right of the viewport. Minimizing a note (`minimize-btn`) hides its floating window and adds one compact pill (color dot plus a short content preview) to the tray; clicking a pill restores the note to its place. The tray is created lazily and removed when the last note is restored, and `createPopup` renders a note that loads with `minimized: true` straight into the tray. Minimized state is persisted through the background `updateMinimized` message.

The content script listener in `scripts/content_script/content_script.js` handles messages:

- `start`: creates a new note in the page.
- `injectPopUps`: injects a note or updates an existing one (content and pin visual).
- `removeElementFromDom`: removes a note element by id.
- `hideStickyNotes`: hides or shows all injected note containers.
- `updateContentInCard`: updates a note from the full-page All Notes editor.

## Injected Note Interactions

`scripts/content_script/content_eventHandling.js` wires events inside each note shadow root.

Supported interactions:

- Add another note from an existing note's plus button.
- Toggle color palette from the options button.
- Save selected note color through background `addSelectedColor`.
- Pin/unpin note through background `enablePin`.
- Minimize note into the docked tray, hiding the window and persisting `minimized: true` through background `updateMinimized`.
- Close note through background `updatePin`.
- Edit note content with a debounced `input` handler that sends `updateNoteContent` to the background.
- Stop keyboard and focus events from bubbling into the host webpage.

Closing a note does not always delete it. The close button sends `updatePin` with `isPinEnable: false`. Background removes the note if its content is empty; otherwise it saves the note with `enablePin: false`.

## Background Flow

Background logic is split across multiple scripts imported by `background.js`.

### `mainBg.js`

This file handles most runtime messages:

- `storeNoteData`: creates a note object for the sender URL, saves it, and returns it.
- `createTabAndInject`: opens `stickyNote_html_page/index.html`.
- `filterLocalStorage`: removes a single note by id and removes it from matching tabs.
- `updateNoteContent`: updates note content from the injected note or All Notes page, saves it, and sends the updated note to any tab with the same URL.
- `removeUsingHostName`: removes all notes for a hostname and removes matching DOM elements from tabs.
- `removeTab`: closes tabs whose title matches the requested title.
- `storePosition`: saves note drag position.
- `updatePin`: updates pin state; deletes empty notes when closing them.
- `enablePin`: updates pin state, then injects or removes the note on the active tab depending on whether it should still show there (same exact page, or pinned and same host).
- `StoreAndUpdateWidthAndHeight`: saves note dimensions.
- `addSelectedColor`: saves selected note color.
- `updateMinimized`: saves whether a note is collapsed into the docked minimized tray.

### `tabListener.js`

This file handles note re-injection and unsupported pages.

When a content script sends `contentScriptInjected`, the background:

1. Reads the sender tab from the message.
2. Reads stored notes.
3. Injects notes that should show on the sender tab via `shouldShowNoteOnTab` (which delegates to `UserLocalStorage.shouldShowNoteOnPage`): any note whose exact URL matches, any pinned note whose hostname matches (site-wide), plus the global note (every supported tab).

When a tab finishes loading, the background:

1. Parses the tab URL defensively.
2. Sets the action popup to `stickyNote_html_page/error.html` for unsupported schemes, known internal pages, and the All Notes page.
3. Sets the action popup back to `stickyNotes/stickyNotes.html` for supported pages.
4. Reads stored notes.
5. Injects the notes that should show on the tab (same exact URL, or pinned and same hostname).

### `autoRef.js`

On extension install or update, it reloads all open tabs so the content scripts are available immediately. On first install (`reason === "install"`), it opens `stickyNote_html_page/welcome.html`, a themed onboarding page (styled with `styles/welcome.css` from the shared tokens). On a version update (`reason === "update"` with a changed `previousVersion`), it opens the welcome page at `#whats-new` so existing users land on the "What's new" section describing the latest changes.

### `removeTabListener.js`

This file tracks tab URLs in memory. When a tab closes, it removes stored notes for that exact tab URL if their content is empty, using the shared empty-note cleanup helper.

## Full Notes Page Flow

The full notes page is `stickyNote_html_page/index.html`, driven by `scripts/custom_script/tab.js`.

At startup, `tab.js`:

1. Reads the saved grid/list preference from `chrome.storage.local`.
2. Loads all notes from `chrome.storage.local.notes`.
3. Builds a sidebar with one card per unique hostname.
4. Selects the first hostname by default.
5. Renders all notes for the selected hostname in the main area.
6. Wires search, navigation, edit, delete, delete-all-host, grid toggle, refresh, and sidebar collapse events.
7. Shows empty states when there are no notes or no search matches.

Main page features:

- Sidebar groups notes by hostname, with the global note pinned as its own globe-marked "Global note" card at the top (rendered by `renderGlobalGroup`, selected via `renderMainGlobalNote`). Deleting the global note from its main card also removes this pinned sidebar card.
- Search filters by hostname or content.
- Search preserves the selected hostname when it still exists in the filtered results, otherwise it selects the first matching hostname.
- Matching text is highlighted with `<mark>`.
- If no hostname is selected, search handling treats the selection as nullable instead of reading from a stale sidebar DOM node.
- The main area supports grid and list layouts.
- Notes are editable with a debounced update message to background.
- Single note delete removes storage and asks all tabs to remove the injected DOM note.
- Host-level delete sends `removeUsingHostName`.
- Navigation icon opens the note URL in a new tab.
- Refresh icon reloads the All Notes page.

The full page uses the shared theme layer for its app header, toolbar buttons, sidebar, search field, sidebar host cards, collapse control, note cards, note color headers, grid/list display, and hover/selected states.

## Error Popup Flow

`stickyNote_html_page/error.html` is used when the extension should not operate on a page, such as Chrome internal pages. It displays a themed unsupported-page popup with a warning icon, short message, and `Open Notes Tab` button.

`stickyNote_html_page/error.js` sends `createTabAndInject` when the user clicks that button.

## Localization Flow

`localizedText.js` wraps `chrome.i18n.getMessage` for specific message keys. The popup, tooltip script, and full notes page call these functions to display localized labels, confirmations, and tooltip text.

The default locale is English. Additional locale folders exist for `ch`, `sp`, `fr`, `ja`, and `ge`.

## Current Behavior Summary

- The popup is scoped to the active tab hostname.
- The full notes page shows notes grouped by hostname.
- Notes are persisted as one array in `chrome.storage.local`.
- Pinned notes are automatically injected into webpages.
- Note content, pin state, color, size, and position can persist.
- Major UI surfaces share a consistent light/dark theme token system.
- Most cross-context coordination happens through `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.
- Injected note UI is isolated from webpages with Shadow DOM, while the extension pages use normal DOM.
