# Release checklist — Stick it - web notes

A dependency-free release process. This file is **not** shipped in the store
package (excluded by `tools/zip.mjs`).

## 1. Prepare

- [ ] `npm run check` passes (syntax, manifest refs, stale-string scan).
- [ ] Bump the version in **`manifest.json`** (and `package.json` to match). The
      uploaded version must be **higher** than any version already published on
      the Web Store.
- [ ] Update the changelog / "Recently Addressed" notes in `docs/improvements.md`.

## 2. Build

- [ ] `npm run zip` — runs the checks, then writes
      `dist/sticky-notes-v<version>-<timestamp>.zip` containing only runtime
      files (manifest at the zip root; `tools/`, `docs/`, `package.json`,
      dotfiles, and this file are excluded).

## 3. Smoke test (load the zip or the unpacked folder)

Do this on a clean profile / fresh load, in a normal **https** tab.

### Install
- [ ] On first install, the **welcome page** opens; it renders correctly in
      light and dark, and "Open the All Notes page" works.

### Popup
- [ ] On a site with no notes: popup shows the "No notes on this site yet" empty
      state, and the count row is hidden.
- [ ] **Add Note** → a note appears on the page; the popup shows "All Notes 1".
- [ ] A long note preview truncates cleanly at two lines with an ellipsis.
- [ ] Delete a note back to zero → the empty state returns and the count row
      hides again.

### Injected note (on the page)
- [ ] Typing saves; the caret does **not** jump to the start while typing.
- [ ] Drag by the title bar moves it; it **cannot** be dragged off-screen.
- [ ] Resize works from each of the four edges.
- [ ] Color palette (options ⋮) recolors the header and persists.
- [ ] Pin / unpin works.
- [ ] Minimize collapses the note into the docked tray pill (bottom-right);
      clicking the pill restores it to its place.
- [ ] Clicking the title-bar buttons does not start a drag.
- [ ] Close (X): removes an empty note; unpins a note that has content.

### Restore on reload
- [ ] Pin a note, reload the page → it comes back in place.
- [ ] Minimize a pinned note, reload → it comes back **minimized** in the tray.

### All Notes page (popup settings → See All Notes, or the welcome button)
- [ ] Sidebar lists sites; selecting one shows its notes.
- [ ] Search filters by site/content and highlights matches.
- [ ] Editing a note here reflects on the page (in an open matching tab).
- [ ] Delete a note, then **delete-all-host**.
- [ ] After deleting a single note, clicking other host cards still selects them
      (no duplicate-listener regression).
- [ ] Keyboard: Tab to a host card, Enter/Space selects it; the nested icons are
      reachable and don't also select the host.
- [ ] Grid/list toggle and full sidebar collapse both work.

### Unsupported pages
- [ ] On a `chrome://` page, a `file://` page, and the **Chrome Web Store**, the
      popup shows "notes cannot be added on this page".

### Error log
- [ ] `chrome://extensions` → **Errors** shows no uncaught errors from normal
      use (in particular, no "Receiving end does not exist").

### Uninstall survey
- [ ] Remove the extension → the feedback survey opens in a new tab.

## 4. Store submission

- [ ] **Privacy policy URL:**
      `https://github.com/mohit-uniyal-dev/stickyNotesPrivacy/blob/main/PRIVACY.md`
- [ ] **Screenshots:** at least one at 1280×800 (or 640×400) — real captures of
      the popup, a note on a page, and the All Notes page.
- [ ] **Promo tiles (optional):** generate from `docs/promo-tiles.html`
      (marquee 1400×560, small 440×280).
- [ ] **Permission justifications**, **single purpose**, and **data-usage**
      answers: copy from `docs/store-listing.md`.
- [ ] Upload `dist/sticky-notes-v<version>-*.zip`.
