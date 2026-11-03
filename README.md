# Ballast

**Use it in your browser:** https://gitgit1212again.github.io/ballast/

Ballast is a private, offline DBT (Dialectical Behavior Therapy) skills companion for people who
recognise BPD-pattern behaviours in themselves and want a place to practise the skills. It has a
daily diary card (emotions, urges, sleep logged as separate stretches so broken sleep shows, other vulnerabilities, skills used) with a 14-day heat map; the Drawer,
which locks an impulsive message for a time you choose and walks you through check-the-facts
prompts before you can copy it out; a guided crisis mode with STOP, paced breathing, TIPP timers,
your own soothe/distract lists, a crisis plan, contacts and hotlines; chain analysis of a
behaviour; a per-person ledger that tracks how often your abandonment predictions actually came
true; a suspicion check with a calibration score (how often "X% sure" beliefs came true); emotion check-in with does-it-fit-the-facts and opposite action; a DEAR MAN script
builder; weekly and monthly plain-text summaries you can export; and settings where every list is
editable and the whole dataset can be exported or imported as JSON.

## Important: this is a self-help tool, not care

Ballast is not therapy, not medical or mental-health advice, and not a crisis service. It cannot
call anyone for you and nobody sees what you write. If you might hurt yourself or someone else, or
you are in crisis, contact a person or a service now:

- **United States:** call or text **988** (Suicide & Crisis Lifeline, 24/7), or text HOME to
  **741741** (Crisis Text Line). In immediate danger, call **911**.
- **Elsewhere:** call your local emergency number, or find a local line at
  [findahelpline.com](https://findahelpline.com).

The numbers inside the app (crisis mode, Settings > Hotlines) are US defaults. Change them to
the ones that apply to you.

## Ways to use it

| How | Needs | Where your data lives |
| --- | --- | --- |
| Open `dist/Ballast.html` in any browser (double-click it) | A modern browser. No install, no Python, no server. | That browser's localStorage |
| Run the local server (`Run-Ballast.cmd` on Windows, `Run-Ballast.command` on Mac) | Python 3 | `data/ballast.json` in this folder |
| Open the published web page on a phone (see "iPhone") | A modern browser | That browser, on that device |

Nothing is installed and nothing is uploaded. The local server listens on `127.0.0.1` only.
The static page makes no requests of its own after it has loaded.

## Requirements

- Windows 10/11 or macOS, for the local server. (The single HTML file needs only a browser.)
- Python 3.10 or newer for the server. It has been run on 3.11 and 3.12. The 3.9 that Apple's
  developer tools ship should also work, since nothing newer is used, but that is untested.
  Standard library only; nothing to `pip install`.

## Run on Windows

1. Install Python 3 from [python.org](https://www.python.org/downloads/) and tick "Add python.exe
   to PATH" in the installer. (Skip this if you just want the single HTML file.)
2. Double-click `Run-Ballast.cmd`. It starts the local server and opens your browser on
   `http://127.0.0.1:8774`. Close the browser tab and the server quits by itself.
3. Optional: double-click `Install-Desktop-Icon.cmd` once. It puts a "Ballast" shortcut on your
   Desktop that launches `Run-Ballast.cmd`, using `src/assets/ballast.ico`.

Or from a terminal in this folder: `python server.py` (use `python server.py 8800` for another
port, `--no-open` to skip launching the browser). If `python` is not found, the launcher tries
`py -3`.

## Run on Mac

1. Open Terminal and check `python3 --version`. If macOS offers to install the Command Line
   Tools, accept; or install Python from [python.org](https://www.python.org/downloads/) or with
   `brew install python`.
2. Get this folder onto your Mac (download the ZIP and unzip it, or `git clone` it).
3. Windows cannot set the "executable" bit on a file, so set it once yourself. In Terminal:

   ```
   cd /path/to/ballast
   chmod +x Run-Ballast.command
   ```

4. Double-click `Run-Ballast.command` in Finder, or run `./Run-Ballast.command` in Terminal. It
   starts the local server and opens your default browser on `http://127.0.0.1:8774`. Close the
   browser tab and the server quits by itself (closing the Terminal window stops it too).
5. If macOS says the file cannot be opened because it came from the internet, right-click it,
   choose Open, then Open again. Or clear the flag once: `xattr -d com.apple.quarantine Run-Ballast.command`.

There is no Desktop-icon installer on Mac. To keep it handy, drag `Run-Ballast.command` (or
`dist/Ballast.html`) onto the right-hand side of the Dock. For a custom icon: open
`src/assets/ballast.png` in Preview, Edit > Copy, select the file in Finder, Get Info (Cmd+I),
click the small icon at the top left and paste.

You can also skip Python entirely: double-click `dist/Ballast.html` and bookmark it. Data then
stays in that browser (see "Where data lives").

Or from Terminal in this folder: `python3 server.py` (`python3 server.py 8800` for another
port, `--no-open` to skip launching the browser).

## iPhone

**iPhone: open the Pages link in Safari, Share > Add to Home Screen.** The link is the repo's
GitHub Pages address. After that Ballast opens full-screen from its own icon.

- Your data lives only in that browser on that device. A server-less install has no
  `data/ballast.json`; it is not synced anywhere, and nothing you type is sent to the host.
- On iPhone, the Home Screen icon and Safari generally keep separate data. Add it to the Home
  Screen first, then always open it from the icon. To move entries, use Settings > Export in one
  and Settings > Import in the other.
- Safari can delete a website's stored data if you do not visit for about a week. Apps added to
  the Home Screen are exempt from that rule, which is one more reason to install it. Export a
  backup now and then regardless: Settings > Export (in the Home Screen app it is meant to open the
  share sheet; choose "Save to Files").
- Do not use Private Browsing; its storage is erased when the tab closes.
- It needs a connection to load the page. There is no offline service worker, so opening it
  without a connection depends on what the phone has cached. Once open, nothing more is needed.
- Expect iOS 15 or newer. This was prepared without an iPhone to test on: the layout was
  checked in a narrow desktop browser window, and the phone-specific behaviour (Home Screen
  icon, safe areas, share sheet) has not been seen on a real device.

Other phones work the same way: open the page, then "Add to Home screen" or "Install" in the
browser menu.

## Where data lives

- Through the local server: `data/ballast.json` in this folder. Written atomically on every
  change. `data/` is git-ignored and is created on first save, so a fresh copy of the app starts
  empty.
- Opened from disk or from a web page (no server): browser localStorage under the key
  `ballast.v1`. The first time the server does answer, anything already in localStorage is
  migrated to the file. Browsers keep separate localStorage per address, so the copy at
  `http://127.0.0.1:8774`, the copy from `dist/Ballast.html` opened from disk, and a copy on
  another site do not see one another.

Back up from **Settings > Export** (a JSON file) and restore with **Settings > Import**. Import
replaces what is currently in the app. With the server, copying `data/ballast.json` somewhere
safe does the same job.

## Privacy and security

- Entries are stored as plain text. There is no encryption and no password inside the app. Use
  your operating-system account lock and disk encryption (BitLocker, FileVault, iOS passcode).
- Avoid shared browser profiles and shared computers.
- The Drawer's lock is a promise to yourself, not enforcement: the text is in your own data
  and nothing stops you reading it there.
- The local server answers `/api/state` only to requests addressed to `127.0.0.1` or
  `localhost`, so a web page cannot reach your diary through a rebinding trick.
- Ballast contains no analytics, no accounts and no calls to any online service or AI.

## Building

```
python build.py        # Mac: python3 build.py
```

writes `dist/Ballast.html`, a single self-contained file: stylesheets, all ES modules and the
page icons are inlined, all URLs are relative, and no server is needed. Because nothing sits
beside it, that one file can be renamed (for example `index.html`) and hosted at any path on a
static host such as GitHub Pages. `src/assets/` is also copied to `dist/assets/` (git-ignored; the
built page does not need it). No third-party packages.

## Tests

```
node --test tests/*.test.cjs                  # storage behaviour (needs Node 18+)
python -m unittest discover -s tests -v       # server and built page (Mac: python3)
```

The Python tests copy the server into a temporary folder, so they never touch your `data/`.

## Folder map

```
Ballast/
  README.md
  build.py                 bundler: src/ -> dist/Ballast.html
  server.py                local server + GET/PUT /api/state persistence, autoquits with the tab
  tools/                   autoquit.py (exit when the tab closes) and serve.py (static handler)
  Run-Ballast.cmd          Windows double-click launcher
  Run-Ballast.command      Mac double-click launcher (needs chmod +x once)
  Install-Desktop-Icon.cmd Windows: creates the Desktop shortcut
  data/ballast.json        your data via the server (created on first save, git-ignored)
  dist/Ballast.html        build output, single offline file (open it, or host it as index.html)
  tests/                   storage tests (Node) and server/build tests (Python)
  src/
    index.html             markup only: tab bar, view root, crisis overlay, toast
    css/                   base, layout, components, views, crisis
    assets/                ballast.ico, ballast.png, apple-touch-icon.png
    js/
      main.js              entry: loads state, registers views, wires tabs and crisis button
      router.js            tab switching; each view renders into a fresh #view element
      state.js             in-memory state, defaults, day helpers, save()
      storage.js           api/state first (local server only), localStorage otherwise, debounced writes
      compat.js            small guards for older browsers (structuredClone)
      data/skills.js       DBT reference tables: skills, prompts, emotion guide, DEAR MAN,
                           default settings (hotlines, lists)
      ui/                  one module per tab: today, drawer, chain, people, coach, suspicion,
                           review, settings; crisis (overlay); dom.js helpers and toast
```

## Adding a feature

A view is one module in `src/js/ui/` that exports `render(root)` (and optionally `unmount()`).
Read and write `state` from `js/state.js` and call `save()` after changes. Register the module
in `main.js` with `register("name", mod)` and add a matching `<button data-tab="name">` to the
tab bar in `index.html`. Reference data belongs in `js/data/skills.js`; styling in a file under
`src/css/` linked from `index.html`. Run `python build.py` afterwards so `dist/` stays current.

## Known limits

- Single user, single device. No accounts, no sync between devices (use Export/Import).
- No reminders or notifications; the app only does things while the tab is open.
- Hotline defaults are US numbers (988). Change them in Settings.
- Its guidance has not been reviewed by a qualified clinician. Treat the suggestions and the
  calibration scores as prompts for your own reflection, not as diagnoses or as reliable
  judgements about other people.
