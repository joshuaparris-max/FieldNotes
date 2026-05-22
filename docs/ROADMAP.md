# Roadmap — IT Support Field Notes

## Phase 1 — Stabilise and polish current MVP

**Goals:** Reliable static deploy, structured notes, copy/export, docs, safe data handling.

**Features:**
- [x] Structured IT incident fields
- [x] Status, priority, category
- [x] Copy ticket note + export txt
- [x] Export all JSON + clear data with confirmation
- [x] Toasts, privacy warnings, documentation set
- [x] PWA shell cache

**Risks:** localStorage loss; users storing sensitive data despite warnings.

**Definition of done:** App deploys on Vercel with no build; manual test plan passes; docs complete; no console errors on load.

---

## Phase 2 — Better IT workflow support

**Goals:** Faster note-taking and ticket handover.

**Features:**
- Filter by context / status / category
- Sort by date, status, priority
- Quick templates (printer, Wi‑Fi, M365, escalation, learning)
- Quick-fill snippets (“Restarted device”, “Escalated”)
- Copy short summary, manager-safe summary, HaloPSA format
- Duplicate note
- Pin important notes

**Risks:** UI complexity; template maintenance.

**Definition of done:** Common L1 scenarios creatable in under 60 seconds; copy formats documented.

---

## Phase 3 — Backup / export / import

**Goals:** User-owned data portability without a backend.

**Features:**
- Import from JSON backup (merge or replace with confirmation)
- Export all as CSV summary
- Export all as combined `.txt`
- Backup reminder before clear (enhanced)
- Optional scheduled export reminder (local only)

**Risks:** Import corrupting data; merge conflicts.

**Definition of done:** Round-trip export → import restores notes on a fresh browser profile.

---

## Phase 4 — Advanced local-only productivity

**Goals:** Power-user features without platform bloat.

**Features:**
- Dark mode
- Keyboard shortcuts
- Printable view
- Privacy mode (hide list previews)
- Archive notes
- Next review date field
- Sensitive-data reminder before every copy/export

**Risks:** Accessibility regressions; mobile layout breakage.

**Definition of done:** Features work on mobile width; keyboard users can complete core flows.

---

## Phase 5 — Future possibilities (not current scope)

**Clearly marked optional / deferred:**

- Cloud sync (requires backend, auth, security review)
- HaloPSA API integration
- AI summarisation (external API, cost, privacy)
- Multi-user / shared team inbox
- Encryption at rest in browser

**Risks:** Scope explosion; privacy compliance; cost.

**Definition of done:** N/A until explicit product decision.
