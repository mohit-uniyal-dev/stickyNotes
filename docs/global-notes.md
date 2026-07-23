# Global Notes — Design

Status: **Implemented** (build order steps 1–7 complete)

## Summary

A **global note** is a single sticky note that, when pinned, is shown on every
supported website instead of being bound to one page. It follows the same pin
model as a normal note under the "pinned = shown" rule: **pinned**, it shows on
every site; **unpinned**, it is hidden everywhere (still saved and reachable from
the popup / All Notes). Its content is shared: editing it on one site reflects
onto the instances open on other sites. It is visually distinct so the user can
tell at a glance that a note is global rather than page-scoped.

## Product decisions

These are settled and drive the design below:

1. **Count: exactly one (singleton).** There is at most one global note. A
   creation path either opens the existing one or creates it if absent; it never
   makes a second.
2. **Position/size: shared everywhere.** The note keeps one position and size
   across all sites (a consequence of it being a single note object, see below).
3. **Sync: eventual, not collaborative.** After the user stops typing (the
   existing debounce), the finished text is pushed to the other open instances.
   There is no character-by-character/real-time merge and no cursor sharing.
   Last-write-wins is acceptable for v1.
4. **Appearance: badge + reserved theme.** A globe badge in the header plus a
   reserved header theme and accent border, distinct from the normal note color
   palette.

## Where this fits the current architecture

The extension already has an implicit notion of note scope:

- **Page note** (default): shows only on its exact URL.
- **Site note** (`enablePin: true`): also shows on every page of its hostname.

A single function decides visibility everywhere —
`shouldShowNoteOnTab(note, tabContext)` in
`scripts/custom_bgScripts/tabListener.js`:

```js
const samePage = note.url === tabContext.href;
const siteWidePinned = Boolean(note.enablePin) && note.hostName === tabContext.hostName;
return samePage || siteWidePinned;
```

Every restore/injection path (content-script injection, tab navigation, popup
open) funnels through this rule (the `ENABLE_PIN` handler in `mainBg.js` has an
inline copy). **Global** is simply a third scope layered on top of this, so most
of the pipeline is reused unchanged.

## Data model

Add a `scope` field to the note shape:

```js
scope: 'page' | 'site' | 'global'
```

- The one global note carries `scope: 'global'`.
- All other notes keep using `enablePin` exactly as today; we only ever
  special-case `'global'`. The `page`/`site` behavior is untouched.
- `UserLocalStorage.createNote(url)` gains `scope: 'page'` as the default.
- Migration is a **no-op** for existing notes: a missing `scope` simply means
  "not global", so no rewrite of stored data is required. (`migrateNotes()` may
  backfill `scope` for tidiness, but nothing depends on it.)

### Singleton accessor

```js
// notes.find(n => n.scope === 'global') — the one global note, or undefined.
UserLocalStorage.getGlobalNote()
```

This is both the read accessor and the guard used by the creation path to avoid
making a second global note.

### Storage location

The global note lives **in the existing `notes` array** (not a separate key).
Rationale:

- It reuses the entire existing pipeline — injection, drag/resize/color/minimize
  persistence, popup and All Notes rendering — with no parallel plumbing.
- Because it is one note object, **shared position/size is automatic**: the same
  `position`/`width`/`height` fields apply on every tab.

Trade-off — see [Concurrency](#concurrency-known-limitation).

## Visibility (the gate)

The global note follows the **same "pinned = shown" model as a normal note**. All
visibility funnels through `UserLocalStorage.shouldShowNoteOnPage`:

```js
if (!note.enablePin) return false;    // unpinned = hidden (all note types)
if (isGlobalNote(note)) return true;  // pinned global = every site
return note.url === href;             // pinned normal = its own page
```

So an **unpinned** note (global or not) is hidden everywhere, a **pinned** global
note shows on every supported site, and a **pinned** normal note shows on its own
page. New global notes are created **pinned**; the popup **Global Note** button
pins it (`setGlobalNotePinned(true)`) so opening it shows it everywhere.

`tabContext` is only constructed for **supported** pages — unsupported schemes
(`chrome:`, `file:`, etc.), the Chrome Web Store, and the All Notes page bail to
the error popup before any restore runs — so a pinned global note still cannot
inject on restricted pages.

## Sync

The global note is open on many tabs at once, so the current echo path —
"push the update only to tabs where `tab.url === note.url`" in
`UPDATE_NOTE_CONTENT` — does not reach the other instances.

Add a background helper:

```js
// Broadcast to every tab; sendMessageToTab already swallows the benign
// "receiving end does not exist" rejection for tabs with no content script.
broadcastToAllTabs(message, exceptTabId)
```

Route **global-note mutations** through it:

- **Live-synced** (pushed to other open instances): content edits, color,
  scope/pin changes, delete.
- **Shared state** (position, size, minimized): the global note is a single
  window that should look the same everywhere, so these are also mirrored to the
  other tabs (`SYNC_GLOBAL_STATE`) — but only on the settle event (drag end,
  resize end, minimize/restore toggle), never per animation frame, so it is not
  jarring. On the origin tab the change is already applied locally, so it is
  excluded from the broadcast; the applied state is not re-persisted, so it
  never echoes back into a loop.

The editing model is unchanged from today: the note body already has a
**debounced `input` handler** that sends `updateNoteContent` after the user
stops typing. For a global note we only change the routing (broadcast instead of
URL-match). Two existing behaviors make this safe:

- `createCardAndUpdate` skips the element the user is actively editing
  (`shadowRoot.activeElement === existingElement`) and skips no-op rewrites, so
  an incoming echo never resets the caret of a tab that is mid-edit.
- A tab that was closed or asleep re-reads the note from storage on its next
  load, so no catch-up protocol is needed.

### Concurrency (known limitation)

Because the global note lives in the shared `notes` array, two tabs editing it
during overlapping debounce windows both read-modify-write the whole array, and
the later write wins (a tab's few most-recent characters can be lost). This is
the single-array race already noted in `improvements.md`, made more likely by a
note that is open everywhere.

- **v1:** accept last-write-wins.
- **Escape hatch (deferred):** move *only* the global note to its own
  `globalNote` storage key so its writes never collide with page-note writes.
  This isolates the race at the cost of some parallel plumbing; do it only if the
  limitation proves annoying in practice.

## Appearance

Color already rides on a CSS class on `.note-title` (`color-${note.color}`), so
the clean hook is a scope class on the container/title, added in
`SimpleShadowDOM.getHtmlTemplate`:

```html
<div class="note-container scope-global"> ... </div>
```

In `styles/content_script.css`, `scope-global` gets:

- A **reserved header theme** (a gradient/tint outside the normal note palette)
  so color alone signals "global".
- A **globe badge** in the header (near/replacing the "Stick it" heading).
- A distinct **accent border**.

The per-note **color palette is hidden** for the global note — its theme is
reserved, so a user-picked color would fight the identity.

## Surfacing in the UI

### Popup (`stickyNotes/stickyNotes.html` + `stickyNotes.js`)

- A **"🌐 Global note" action** in the popup action row: creates the singleton
  if it does not exist, otherwise injects/focuses it on the active tab.
  (Chosen over a settings-menu toggle for discoverability.)
- The global note is **pinned to the top of the popup list on every host**,
  regardless of the active tab's hostname.

### All Notes page (`stickyNote_html_page/index.html` + `tab.js`)

- A pinned **"🌐 Global"** group at the top of the sidebar, above the hostname
  groups, containing the single global note.

## Build order

1. **Model + singleton** — `scope` field + default in `createNote`,
   `getGlobalNote()`, and a background handler that creates-or-returns the
   global note.
2. **Gate** — add the `scope === 'global'` branch in `tabListener.js` and the
   `ENABLE_PIN` inline copy. The note now injects on every supported tab.
3. **Sync** — add `broadcastToAllTabs` and route content/color/delete for global
   notes through it.
4. **Appearance** — `scope-global` theme + globe badge in
   `content_popup.js`/`content_script.css`; hide the color palette for globals.
5. **Popup** — creation action + always-on-top surfacing.
6. **All Notes** — the pinned "Global" sidebar group.
7. **Docs + release** — update `docs/current-flow.md` and the `RELEASE.md`
   smoke-test checklist.

Steps 1–4 deliver a working, visually distinct, syncing global note; 5–7 are
surfacing and polish.

## Out of scope (v1)

- Multiple global notes.
- Real-time collaborative editing / cursor sharing.
- Per-site position for the global note (position is shared everywhere).
- Cross-device sync (`chrome.storage.sync`); all data stays in
  `chrome.storage.local` as today.
