# Chrome Web Store submission notes — Stick it - web notes

Reference text for the Web Store "Privacy practices" and listing forms. Paste
the relevant blurbs into the corresponding fields.

## Single purpose

Stick it - web notes has a single purpose: to let users create sticky notes on
web pages and manage those notes. All functionality (adding, editing, coloring,
positioning, pinning, minimizing, searching, and deleting notes, and the "All
Notes" management page) serves that one purpose.

## Permission justifications

Fill each of these into the matching "Justification" box in the Privacy
practices tab.

- **storage** — Stores the user's notes and display preferences locally on the
  device so they persist between sessions. Nothing is stored remotely.

- **activeTab** — Reads the address of the current tab when the user chooses to
  add a note to it, so the note can be associated with that page.

- **tabs** — Determines which open tabs correspond to a note's page so notes can
  be shown, updated, or removed on the correct page, and opens the extension's
  "All Notes" management page in a new tab.

- **Host permissions (`http://*/*`, `https://*/*`)** — The core feature is
  displaying sticky notes on the web pages the user visits, so the note
  interface must be able to render on any website the user chooses. The
  extension injects only its own note UI and records the page URL/hostname the
  user attaches a note to; it does not read or collect page content.

## Remote code

No. The extension executes no remotely hosted code. All scripts and libraries
(Popper, Tippy, Bootstrap CSS) are bundled inside the package.

## Data usage / privacy disclosures

- **Does this extension transmit your notes off the device?** No. All notes and
  preferences are stored locally via `chrome.storage.local`. During use, the
  extension makes no network requests and contacts no servers or third parties.
- **Data handled locally (not transmitted):** note text, the URL/hostname a note
  is attached to, note appearance/state (color, position, size, pin, minimize,
  timestamps), and display preferences.
- **Optional uninstall survey:** on removal, Chrome opens an optional, anonymous
  feedback survey hosted on Google Forms. The user chooses whether to submit it;
  the extension attaches no note content, page URLs, or personal identifiers
  (at most non-identifying technical details such as version/OS). Disclosed in
  the privacy policy. If the store form asks, declare that responses submitted to
  the survey are handled by Google Forms.
- The three required certifications can be affirmed truthfully:
  - The extension does **not** sell or transfer user data to third parties
    (outside approved use cases).
  - The extension does **not** use or transfer user data for purposes unrelated
    to its single purpose.
  - The extension does **not** use or transfer user data to determine
    creditworthiness or for lending purposes.

## Privacy policy URL

The privacy policy is maintained in a separate public repository
(`stickyNotesPrivacy`, containing `PRIVACY.md`). Enter this URL in the store
listing's "Privacy policy" field:

`https://github.com/mohit-uniyal-dev/stickyNotesPrivacy/blob/main/PRIVACY.md`

## Note on scope

Content scripts are limited to `http://*/*` and `https://*/*`. The extension
does not run on `file://`, browser-internal (`chrome://`), or other privileged
pages; those show the "notes cannot be added on this page" popup instead.

## Store copy

### Short description (summary, ≤132 chars — matches the manifest)

> Add sticky notes to any web page and pick up right where you left off. Everything stays on your device.

### Detailed description (paste into the store "Description" field)

```text
Stick it - web notes lets you drop a sticky note on any web page — a reminder, a quote, a to-do, or a bit of research — and find it again right where you left it.

Notes live on the page you created them on. Pin one and it comes back automatically the next time you visit that page, so your notes stay in context instead of getting buried in another app.

WHAT YOU CAN DO
• Add a note to any website in one click
• Pin notes so they reappear when you return to the page
• Drag, resize, and recolor each note (six colors)
• Minimize notes into a tidy tray to reclaim space, then restore them with a click
• Manage everything from the All Notes page — search, edit, and delete, grouped by website, in grid or list view
• Clean, modern design that follows your light or dark theme

PRIVATE BY DESIGN
Your notes never leave your device. Everything is stored locally in your browser — no account, no servers, no tracking, and no analytics.

GETTING STARTED
Open Stick it from the toolbar on any site and click "Add Note." That's it.
```

### What's new — v1.2.0 (release note)

```text
New
• Minimize notes — collapse a note into a docked tray in the corner and restore it with a click.
• A welcome page to help you get started on first install.
• A refreshed, cleaner look in both light and dark mode.
• More languages: German, Spanish, French, Japanese, Chinese, Portuguese, and Hindi.

Fixes & improvements
• The cursor no longer jumps to the start while you type in a note.
• Notes can no longer be dragged off-screen.
• Better keyboard navigation and clearer empty states.
• Faster, more reliable saving, and various stability fixes.
```
