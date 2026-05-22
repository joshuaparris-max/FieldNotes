# IT Support Field Notes

A **plain static** browser app for structured IT support and incident notes. Capture troubleshooting, copy into tickets, filter past work, and back up notes locally.

**Live app:** [field-notes-two.vercel.app](https://field-notes-two.vercel.app/)  
**Repository:** [github.com/joshuaparris-max/FieldNotes](https://github.com/joshuaparris-max/FieldNotes)

<!-- Screenshots: add docs/screenshots/list.png and detail.png when available -->

---

## Who it is for

IT support staff and learners who need fast, private field notes without a ticket system login or cloud backend.

## What it does

- Structured incident notes (issue → checked → changed → result → follow-up)
- **Filter & sort** with saved UI preferences
- **12 quick templates** (printer, Wi‑Fi, M365, escalation, learning, etc.)
- **Quick-fill snippets** for common troubleshooting phrases
- **5 copy formats** (full, short, escalation, manager-safe, learning)
- Export single `.txt`, **all JSON**, **CSV summary**, **combined TXT**
- **Import / restore JSON** (merge or replace)
- Pin, archive, **privacy mode**, **dark mode**
- Optional voice dictation and basic offline shell (PWA)

## Privacy warning

Do not store passwords, student names, client-sensitive information, or private credentials. See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## LocalStorage

| Key | Purpose |
|-----|---------|
| `fieldnotes_incidents_v2` | Incident notes (schema v4 inside) |
| `fieldnotes_ui_prefs_v1` | Filters, sort, theme, privacy mode |
| `fieldnotes_notes_v1` | Legacy archive (migrated once if v2 empty) |

Export JSON regularly before clearing browser data.

## Quick start

```bash
cd FieldNotes
python -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

## Vercel deployment

| Setting | Value |
|--------|--------|
| Framework Preset | **Other** |
| Root Directory | **`./`** |
| Build / Install | *(blank)* |
| Output Directory | **`.`** or blank |
| Environment variables | **none** |

Details: [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)

## Documentation

| Document | Purpose |
|----------|---------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to use templates, import, copy formats |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, data flow, schema |
| [ROADMAP.md](docs/ROADMAP.md) | Product phases |
| [TODO.md](docs/TODO.md) | Backlog |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | Manual test checklist |

## Known limitations

- No cloud sync or multi-device backup (export JSON yourself)
- No HaloPSA API integration
- Voice input varies by browser
- PWA caches shell only

## Roadmap summary

- **Phase 1–3 (current):** Workflow filters, templates, import/export, privacy tools — largely complete
- **Phase 4+:** Keyboard shortcuts, printable view, optional future sync (deferred)

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Project structure

```
FieldNotes/
├── index.html
├── constants.js
├── prefs.js
├── templates.js
├── data.js
├── format.js
├── ui.js
├── actions.js
├── boot.js
├── styles.css
├── service-worker.js
└── docs/
```
