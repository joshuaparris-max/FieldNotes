# Roadmap — IT Support Field Notes

## Phase 1 — Stabilise and polish current MVP ✅

**Goals:** Reliable static deploy, structured notes, copy/export, docs, safe data handling.

**Features:**
- [x] Structured IT incident fields
- [x] Status, priority, category
- [x] Copy ticket note + export txt
- [x] Export all JSON + clear data with confirmation
- [x] Toasts, privacy warnings, documentation set
- [x] PWA shell cache

**Definition of done:** Met.

---

## Phase 2 — Better IT workflow support ✅

**Goals:** Faster note-taking and ticket handover.

**Features:**
- [x] Filter by context / status / category / priority / archived / pinned
- [x] Sort by date, status, priority, category, context, summary
- [x] Quick templates (12 IT scenarios)
- [x] Quick-fill snippets
- [x] Copy short, escalation, manager-safe, learning summaries
- [x] Pin important notes
- [ ] Duplicate note (backlog)
- [ ] HaloPSA-specific copy format (backlog)

**Definition of done:** Met for core workflow items.

---

## Phase 3 — Backup / export / import ✅

**Goals:** User-owned data portability without a backend.

**Features:**
- [x] Import from JSON backup (merge or replace with confirmation)
- [x] Export all as CSV summary
- [x] Export all as combined `.txt`
- [ ] Backup reminder modal before clear (enhanced — backlog)
- [ ] Optional scheduled export reminder (local only — backlog)

**Definition of done:** Round-trip export → import works (manual test in TEST_PLAN).

---

## Phase 4 — Advanced local-only productivity (partial)

**Goals:** Power-user features without platform bloat.

**Features:**
- [x] Dark mode
- [ ] Keyboard shortcuts
- [ ] Printable view
- [x] Privacy mode (hide list previews)
- [x] Archive notes
- [ ] Next review date field
- [ ] Sensitive-data reminder before every copy/export

---

## Phase 5 — Future possibilities (not current scope)

**Clearly marked optional / deferred:**

- Cloud sync (requires backend, auth, security review)
- HaloPSA API integration
- AI summarisation (external API, cost, privacy)
- Multi-user / shared team inbox
- Encryption at rest in browser
