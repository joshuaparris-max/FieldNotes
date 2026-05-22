# Changelog — IT Support Field Notes

All notable changes to this project are documented here.

---

## [Unreleased]

### Fixed
- Schema v3 upgrade now compares raw stored notes before normalization so v2 incidents are persisted with `schemaVersion: 3` on first load.

### Added
- Full `docs/` documentation set (user guide, architecture, roadmap, TODO, test plan, security, decisions, Vercel guide)
- `constants.js` for shared enums and schema version
- Schema v3 fields: status, priority, category, resolutionSummary, timeSpent, escalatedTo
- Status / priority / category on list cards and detail view
- Toast notifications (save, copy, export, delete, clear)
- Data tools: export all JSON, clear all local data (double confirm + type DELETE)
- Reference field safety warning
- In-place v2 → v3 normalization on load

---

## 2026-05-22 — Structured IT support incident logger

### Added
- IT Support Field Notes branding
- Structured fields: issue, checked, changed, result, follow-up, reference, tags
- Contexts: Avance IT, DCS, Parris Tech Services, Personal Lab, Other
- `fieldnotes_incidents_v2` storage with v1 migration
- Copy ticket note + manual fallback modal
- Export single note as `.txt`
- Web Speech dictation (optional)
- Basic PWA: manifest, service worker, icon

---

## 2026-05-22 — Fix broken script loading

### Fixed
- Missing JS modules (`data.js`, `format.js`, `ui.js`, `actions.js`, `boot.js`)
- Replaced `document.write` loader with ordered script tags
- Working list/form/detail UI and localStorage persistence

---

## Initial — Static shell

### Added
- `index.html`, `app.js` (loader only), minimal `styles.css`
- Repository scaffold for Vercel static deploy
