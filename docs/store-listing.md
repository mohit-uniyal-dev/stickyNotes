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

- **Does this extension collect or transmit user data off the device?** No. All
  notes and preferences are stored locally via `chrome.storage.local`. The
  extension makes no network requests and contacts no servers or third parties.
- **Data handled locally (not transmitted):** note text, the URL/hostname a note
  is attached to, note appearance/state (color, position, size, pin, minimize,
  timestamps), and display preferences.
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
