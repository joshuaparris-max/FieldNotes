# Changelog — IT Support Field Notes

## [Unreleased]

### Added
- Filter & sort panel with persisted UI prefs (`fieldnotes_ui_prefs_v1`)
- 12 incident templates and quick-fill snippets
- Copy formats: full, short, escalation, manager-safe, learning
- JSON import (merge / replace), CSV export, combined TXT export
- Pin / archive notes with list filters
- Privacy mode and dark mode (system / light / dark)
- Improved empty state and onboarding tips
- Schema v4: `pinned`, `archived`, `templateUsed`
- Service worker cache `fieldnotes-shell-v4`

### Fixed
- Schema v3 upgrade persistence (raw JSON comparison before normalize)

---

## 2026-05-22 — Documentation and workflow fields (v3)

- Status, priority, category, resolution summary, time spent, escalated to
- Toasts, export all JSON, safe clear data
- Full `docs/` set and README refresh

---

## 2026-05-22 — Structured IT support incident logger

- IT branding, structured fields, v1→v2 migration
- Copy ticket note, export txt, voice dictation, basic PWA

---

## Initial — Static shell

- `index.html` scaffold; script loader fix
