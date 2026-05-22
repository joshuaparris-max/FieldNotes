# Backlog — IT Support Field Notes

Format: `- [ ] P# / size — Title` with notes.

---

## 1. Critical fixes

- [ ] P0 / S — Regression pass before each release
  - Run [TEST_PLAN.md](TEST_PLAN.md) checklist on Chrome and one alternate browser.

---

## 2. UX polish

- [x] P1 / M — Toast notifications for save, copy, export, delete
- [ ] P1 / S — Focus management after modal close (expand)
- [ ] P2 / M — Empty state with example note preview card
- [ ] P2 / S — Confirmation toast after JSON export with filename hint
- [ ] P2 / M — Dark mode toggle

---

## 3. IT support workflow

- [x] P1 / M — Status dropdown (Open, Resolved, Escalated, Waiting, Learning Note)
- [x] P1 / M — Priority dropdown (Low, Normal, High, Urgent)
- [x] P1 / M — Category dropdown
- [x] P1 / S — Resolution summary field
- [x] P1 / S — Escalated to field
- [x] P1 / S — Time spent field
- [ ] P1 / M — Filter by context / status / category
- [ ] P1 / M — Sort by newest / oldest / status / priority
- [ ] P2 / M — Quick templates (password reset, printer, Wi‑Fi, M365, phishing, performance, escalation, learning)
- [ ] P2 / S — Quick-fill buttons (“Restarted device”, “Checked network”, “Escalated”)
- [ ] P2 / S — Duplicate note
- [ ] P2 / S — Pin important note
- [ ] P2 / M — Archive note
- [ ] P2 / S — Next review date field

---

## 4. Documentation

- [x] P1 / L — Professional docs/ folder (USER_GUIDE, ARCHITECTURE, etc.)
- [x] P1 / M — README entry point refresh
- [ ] P3 / S — Screenshots section in README
- [ ] P3 / S — “How data flows” diagram in README (link to ARCHITECTURE)

---

## 5. Testing

- [x] P1 / M — TEST_PLAN.md manual checklist
- [ ] P2 / M — Automated smoke script (optional, no framework — simple Node or manual only)
- [ ] P2 / S — Migration test fixtures (sample v1 JSON)

---

## 6. Accessibility

- [ ] P1 / M — ARIA audit on modals and data tools
- [ ] P2 / M — Keyboard shortcuts (documented)
- [ ] P2 / S — High contrast / focus ring pass
- [ ] P2 / S — Screen reader test on list + form

---

## 7. Privacy / safety

- [x] P1 / S — Privacy banner on forms
- [x] P1 / S — Reference field warning
- [x] P1 / M — Clear all data with double confirmation + DELETE typing
- [x] P1 / S — SECURITY_AND_PRIVACY.md
- [ ] P1 / S — Sensitive reminder before copy/export
- [ ] P2 / M — Privacy mode (hide list card body text)
- [ ] P2 / S — Backup reminder modal before clear (link to export)

---

## 8. Data / export / import

- [x] P1 / M — Export all JSON backup
- [x] P1 / M — Extended copy/export ticket format (all v3 fields)
- [ ] P1 / L — Import from JSON (merge + replace modes)
- [ ] P2 / M — Export all CSV summary
- [ ] P2 / M — Export all combined `.txt`
- [ ] P2 / S — Copy short ticket note
- [ ] P2 / S — Copy manager-safe summary
- [ ] P2 / S — Copy for HaloPSA format
- [ ] P3 / M — Printable view

---

## 9. PWA / offline

- [x] P2 / M — Basic service worker shell cache
- [x] P2 / S — Skip SW on localhost for dev
- [ ] P2 / S — User-facing offline note in UI
- [ ] P2 / S — Document stale cache troubleshooting (VERCEL_DEPLOYMENT)

---

## 10. Future ideas

- [ ] P3 / L — JSON import UI
- [ ] P3 / XL — Backend sync (deferred — see ROADMAP Phase 5)
- [ ] P3 / XL — HaloPSA API (deferred)
- [ ] P3 / L — AI summarise note (deferred — privacy/cost)
