# IT Support Field Notes

A **plain static** browser app for recording structured IT support and incident notes — troubleshooting steps, outcomes, and follow-ups. Built for Josh’s work and learning contexts (Avance IT, DCS, Parris Tech Services, personal lab, and more).

**Repository:** [github.com/joshuaparris-max/FieldNotes](https://github.com/joshuaparris-max/FieldNotes)

---

## Who it is for

IT support staff, technicians, and learners who need a **fast, local, private** way to capture field notes without a ticket system login or backend.

## What problem it solves

Ticket systems are not always at hand during walk-ups, labs, or learning sessions. FieldNotes gives you a **structured template** (issue → checked → changed → result → follow-up) and **one-click copy** for pasting into HaloPSA, email, or handover notes — without storing data on a server.

## Current features

- Structured incident notes with status, priority, and category
- Contexts: Avance IT, DCS, Parris Tech Services, Personal Lab, Other
- Search across all fields
- Copy full ticket note + export single `.txt`
- Export all notes as JSON backup
- Optional browser voice dictation (Web Speech API)
- Basic offline/PWA shell cache
- Legacy note migration from older app versions
- Clear local data (with strong confirmation)

## Privacy warning

**Do not store** passwords, student names, client-sensitive information, medical/private data, or credentials in this app. See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## LocalStorage

Notes are saved under the key `fieldnotes_incidents_v2` in your browser only. They do not sync across devices. Export JSON before clearing browser data or using “Clear all local data”.

## Quick start

```bash
cd FieldNotes
python -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

> Service worker registration is skipped on `localhost` during development.

## Vercel deployment (summary)

| Setting | Value |
|--------|--------|
| Framework Preset | **Other** |
| Root Directory | **`./`** |
| Build / Install | *(blank)* |
| Output Directory | **`.`** or *(blank)* |
| Environment variables | **none** |

Full steps: [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)

## Documentation

| Document | Purpose |
|----------|---------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to use the app |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Code and data flow |
| [ROADMAP.md](docs/ROADMAP.md) | Phased product plan |
| [TODO.md](docs/TODO.md) | Prioritised backlog |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | Manual test checklists |
| [SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Safety and data risks |
| [CHANGELOG.md](docs/CHANGELOG.md) | Release history |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture decisions |
| [VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) | Deploy and troubleshoot |

## Known limitations

- No cloud sync, accounts, or encryption
- No import-from-JSON UI yet (export only)
- No filters/sort UI yet (search only)
- Voice input varies by browser
- PWA is shell-cache only, not full offline-first

## Roadmap (summary)

1. **Phase 1** — Stabilise MVP (current)
2. **Phase 2** — IT workflow (filters, templates, more copy formats)
3. **Phase 3** — Backup/import (JSON import, CSV)
4. **Phase 4** — Productivity (pin, archive, dark mode, shortcuts)
5. **Phase 5** — Future optional sync (not planned now)

Details: [docs/ROADMAP.md](docs/ROADMAP.md)

## Project structure

```
FieldNotes/
├── index.html
├── constants.js
├── data.js
├── format.js
├── ui.js
├── actions.js
├── boot.js
├── styles.css
├── service-worker.js
├── manifest.webmanifest
├── icon.svg
└── docs/
```

## License

Personal / educational use — adjust as needed.
