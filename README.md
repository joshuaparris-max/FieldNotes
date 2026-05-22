# IT Support Field Notes

A simple, browser-based app for recording **IT support and incident field notes** — troubleshooting steps, outcomes, and follow-ups. Built for work, learning, lab testing, and client support contexts (Avance IT, DCS, Parris Tech Services, personal lab, and more).

Data is stored **only in your browser** using `localStorage`. There is no backend, no accounts, and no API keys.

## Important — not for sensitive data

This app is **not suitable** for storing:

- Passwords or private credentials
- Student names
- Client-sensitive or confidential information
- Medical or private personal data

Use the **Reference** field only for safe identifiers such as ticket numbers or device names.

## Main features

- Structured IT incident notes (summary, context, issue, checked, changed, result, follow-up, reference, tags)
- Search across all fields
- `localStorage` persistence (per browser/device)
- **Copy ticket note** — formatted text for pasting into tickets or email
- **Export .txt** — download the same formatted note as a text file
- Optional **browser voice input** (Web Speech API — no external service)
- Basic **offline / PWA** support via service worker (production hosts only)

## Run locally

Use a static file server (recommended):

```bash
cd FieldNotes
python -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

> Service worker registration is **skipped** on `localhost` / `127.0.0.1` to avoid stale cache issues during development.

## Deploy on Vercel

1. Import [joshuaparris-max/FieldNotes](https://github.com/joshuaparris-max/FieldNotes) on [Vercel](https://vercel.com).
2. Project settings:

| Setting | Value |
|--------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Build Command** | *(leave blank)* |
| **Output Directory** | `.` or *(leave blank)* |
| **Install Command** | *(leave blank)* |
| **Environment variables** | *(none)* |

3. Deploy. Static files are served from the repo root with no build step.

## Project structure

```
FieldNotes/
├── index.html
├── styles.css
├── data.js              # localStorage + v1 → v2 migration
├── format.js            # dates, ticket text, export filename
├── ui.js                # views and forms
├── actions.js           # navigation, copy, export, voice
├── boot.js              # startup + service worker (non-localhost)
├── service-worker.js    # offline app shell cache
├── manifest.webmanifest
├── icon.svg
└── README.md
```

## Storage keys

| Key | Purpose |
|-----|---------|
| `fieldnotes_incidents_v2` | Current IT incident notes |
| `fieldnotes_notes_v1` | Legacy generic notes (read once for migration; not deleted) |

Older notes are migrated automatically into the v2 format on first load if v2 is empty.

## License

Personal / educational use — adjust as needed.
