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
- **12 quick templates** (printer, Wi-Fi, M365, escalation, learning, etc.)
- **Quick-fill snippets** for common troubleshooting phrases
- **6 copy formats** (full, short, escalation, manager-safe, learning, HaloPSA)
- Export single `.txt`, **all JSON**, **CSV summary**, **combined TXT**
- **Import / restore JSON** (merge or replace)
- Pin, archive, **duplicate**, **privacy mode**, **dark mode**
- **Keyboard shortcuts** and **Printable view**
- **Data Safety v1** (automated snapshots on destructive actions, undo/rollback UI)
- **Sync / Portability v1 (BYOS)** (Bring Your Own Storage local-file synchronization)
- Optional voice dictation and basic offline shell (PWA)

## Data Safety + Sync (v1.2.0)

**Data Safety**: FieldNotes protects your data. Any destructive action (deleting a note, clearing data, importing JSON, resolving sync conflicts) automatically generates an internal safety snapshot. If you make a mistake, you can restore from the last 5 snapshots directly in the UI.

**BYOS Sync**: Sync across devices without a dedicated cloud backend. Select a local JSON file (e.g., inside a Dropbox, OneDrive, Google Drive, or Syncthing folder) and FieldNotes will persist permission to it via IndexedDB. It uses a **true 3-way merge algorithm** to detect and resolve offline concurrent edits and deletions safely.

## Privacy warning

Do not store passwords, student names, client-sensitive information, or private credentials. See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## LocalStorage / IndexedDB

| Key/Store | Purpose |
|-----|---------|
| `fieldnotes_incidents_v2` | Incident notes (schema v4 inside) |
| `fieldnotes_ui_prefs_v1` | Filters, sort, theme, privacy mode |
| `fieldnotes_snapshots_v1` | Data Safety automatic backup snapshots |
| `fieldnotes_sync_base_v1` | Common ancestor snapshot for 3-way merge sync |
| `fieldnotes_tombstones_v1`| Deleted note IDs for sync deletion tracking |
| `fieldnotes_sync_db` | IndexedDB store for the persisted FileSystemFileHandle |

Export JSON regularly before clearing browser data.

## Quick start

```bash
cd FieldNotes
python -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

## Documentation

| Document | Purpose |
|----------|---------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to use templates, import, copy formats |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, data flow, schema |
| [ROADMAP.md](docs/ROADMAP.md) | Product phases |
| [TODO.md](docs/TODO.md) | Backlog |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | Manual test checklist |

## Known limitations

- **Sync Browser Support**: BYOS Sync requires Chromium-based desktop browsers (Chrome, Edge, Brave) that support the File System Access API. Mobile browsers (iOS Safari, Android Chrome) and Firefox do not currently support persistent local file handles for syncing.
- **Unencrypted Sync Payload**: Sync files are currently plain JSON. (Encryption via WebCrypto is planned for Sync v1.1).
- No HaloPSA API integration.
- Voice input varies by browser.

## CHANGELOG

- **v1.2.0**: Added Data Safety v1 (snapshots, rollback) and Sync / Portability v1 (BYOS 3-way merge synchronization with IDB handle persistence).
- Added keyboard shortcuts (Ctrl+N for new, Ctrl+F for search, Esc to close modals/go back)
- Added Printable view for note details
- Added "Duplicate" note action
- Added HaloPSA copy format
