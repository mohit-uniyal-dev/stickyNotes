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
- [ ] On a version update, the welcome page opens scrolled to **What's new**
      (the section shows the current `v` and renders in light and dark).

### Popup
- [ ] On a site with no notes: popup shows the "No notes on this site yet" empty
      state, and the count row is hidden.
- [ ] **Add Note** → a note appears on the page; the popup shows "All Notes 1".
- [ ] A long note preview truncates cleanly at two lines with an ellipsis.
- [ ] Delete a note back to zero → the empty state returns and the count row
      hides again.

### Injected note (on the page)
- [ ] An empty note shows helpful placeholder text; an empty **global** note
      shows its own text explaining it is one shared note shown on every site.
- [ ] Hovering each toolbar button shows a tooltip explaining it.
- [ ] Typing saves; the caret does **not** jump to the start while typing.
- [ ] Drag by the title bar moves it; it **cannot** be dragged off-screen.
- [ ] Resize works from each of the four edges.
- [ ] Color palette (options ⋮) recolors the header and persists.
- [ ] **Pin = shown, unpin = hidden:** unpin a note (its pin control or from the
      popup card) → it disappears from the page but stays in the popup list;
      pin it again → it reappears. Reloading shows only pinned notes.
- [ ] Opening the popup does **not** bring back a note you closed/unpinned.
- [ ] Minimize collapses the note into the docked tray pill (bottom-right);
      clicking the pill restores it to its place.
- [ ] Clicking the title-bar buttons does not start a drag.
- [ ] Close (X): removes an empty note; hides (unpins) a note that has content.

### Global note
- [ ] Popup **Global Note** → a globe-marked, accent-themed note appears (no
      add/color controls, but it **does** have a pin control); the popup lists it
      at the top. It starts **pinned** (shown on every site).
- [ ] Open/reload a second, different site → the pinned global note is there too.
- [ ] With the global note open on **two tabs at once**: unpin it on one tab →
      it disappears from **both** tabs live (no reload needed); pin it again
      (popup card or Global Note button) → it reappears on **both** tabs.
- [ ] Type on one site, switch to the other tab → the edit shows up (after the
      short debounce; no live per-keystroke sync expected).
- [ ] Drag / resize it on one site → the other open instance moves/resizes to
      match; reload either site → it keeps that position/size.
- [ ] Minimize it on one site → it minimizes on the other open instance too (a
      globe-marked gradient pill in the tray); restoring on one restores both.
- [ ] It does **not** appear on unsupported pages (chrome://, Web Store, file://).
- [ ] Reload a site → the pinned global note comes back in place.
- [ ] Close (X) the global note → it is hidden (unpinned), like a normal note,
      but is **not** deleted (still in the popup list to re-show).
- [ ] Delete it (popup card or its All Notes card) → it disappears from every
      open tab and from the popup/All Notes list, and does not return on reload.
- [ ] Host **Remove All** / **Pin-Unpin All** do **not** delete the shared
      global note.

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
