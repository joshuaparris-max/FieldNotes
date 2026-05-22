# Architecture Decision Records — IT Support Field Notes

Short records of important project decisions.

---

## ADR-001 — Vanilla JavaScript only

**Decision:** No React, Next.js, Vite, TypeScript, or npm build chain.

**Why:** Zero build step for Vercel; easiest for Josh to open and edit any file; smallest deploy surface.

**Consequences:** Manual DOM rendering; no component ecosystem; discipline needed to avoid spaghetti.

---

## ADR-002 — localStorage only

**Decision:** Persist notes in browser `localStorage` under `fieldnotes_incidents_v2`.

**Why:** No backend cost, no auth, no API keys, aligns with “notes stay on device” privacy goal.

**Consequences:** No sync; user must export JSON for backup; schema migrations must be careful.

---

## ADR-003 — No backend

**Decision:** No server, database, or serverless functions for note storage.

**Why:** Security simplicity; static Vercel hosting; no data custody liability for hosted notes.

**Consequences:** Import/sync deferred to future phase if ever needed.

---

## ADR-004 — No sensitive data in notes

**Decision:** Product copy and docs actively discourage passwords, student names, and client secrets.

**Why:** Plaintext local storage; shared-device risk; no encryption.

**Consequences:** Features must not encourage PII fields (e.g. no “student name” field).

---

## ADR-005 — Vercel static hosting

**Decision:** Deploy repo root as static files; Framework Preset “Other”; blank build command.

**Why:** Matches architecture; instant deploy from GitHub `main`.

**Consequences:** All paths must be root-relative; service worker scope `./`.

---

## ADR-006 — Beginner-maintainable code

**Decision:** Small files by concern (`data`, `format`, `ui`, `actions`); comments on non-obvious logic.

**Why:** Solo maintainer; learning-friendly codebase.

**Consequences:** Some duplication acceptable over heavy abstraction.

---

## ADR-007 — Basic PWA shell cache only

**Decision:** Service worker caches static assets; not a full offline-first data strategy.

**Why:** Improves reload on poor network without complicating localStorage sync logic.

**Consequences:** Notes still require app load; SW skipped on localhost for dev.

---

## ADR-008 — Voice via browser Web Speech API only

**Decision:** Optional dictation; no paid speech API.

**Why:** No keys, no cost, no audio sent to third parties by app code.

**Consequences:** Uneven browser support; dictate buttons disabled when unavailable.

---

## ADR-009 — Schema v3 in existing v2 storage key

**Decision:** Bump `schemaVersion` to 3 on notes; keep `fieldnotes_incidents_v2` key; normalize on read.

**Why:** Avoid second migration key confusion; preserve existing user data.

**Consequences:** `upgradeStoredNotesIfNeeded` rewrites array when upgrading fields.

---

## ADR-010 — Schema v4 (pin, archive) + separate UI prefs

**Decision:** Schema v4 adds `pinned`, `archived`, optional `templateUsed`. UI filters/theme/privacy in `fieldnotes_ui_prefs_v1`.

**Why:** Workflow fields belong on notes; UI state should not mix into incident backup JSON shape unnecessarily (prefs excluded from export payload).

**Consequences:** Migration compares **raw** stored JSON before normalize (same pattern as v3 fix).

---

## ADR-011 — JSON import merge/replace without backend

**Decision:** Client-side validation; replace only after confirm; merge resolves duplicate IDs by `updatedAt`.

**Why:** User-owned backups; no server trust boundary.

**Consequences:** User must understand replace wipes current notes; docs and modal warnings required.
