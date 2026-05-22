# User Guide — IT Support Field Notes

## What this app does

IT Support Field Notes helps you record **structured troubleshooting notes** in the browser. Each incident captures what was reported, what you checked, what you changed, the result, and follow-up — plus workflow metadata (status, priority, category, context).

Data stays **only on your device** (localStorage). There is no login and no cloud backup unless you export JSON yourself.

---

## Field reference

| Field | Purpose |
|-------|---------|
| **Summary** | Short title for the incident |
| **Context** | Where the work happened (Avance IT, DCS, Parris Tech Services, Personal Lab, Other) |
| **Status** | Open, Resolved, Escalated, Waiting, Learning Note |
| **Priority** | Low, Normal, High, Urgent |
| **Category** | Network, Printer, Account, Microsoft 365, Hardware, etc. |
| **Reference** | Safe ID only: ticket number, device name — **not** passwords or personal data |
| **Issue / Request** | What was reported or requested |
| **Checked** | Diagnostics, logs, tests |
| **Changed** | Actions taken (restarts, installs, config) |
| **Result** | Current outcome / status narrative |
| **Resolution summary** | Brief closure text for tickets or handover |
| **Follow-up** | Next steps |
| **Escalated to** | Team, vendor, tier (safe names only) |
| **Time spent** | e.g. `45 min`, `1.5 h` |
| **Tags** | Comma-separated keywords for search |

---

## Safe vs unsafe examples

### Safe reference example

```
INC-22014
LAB-PRINTER-02
Staff laptop — front office
```

### Unsafe — do not store

```
Student name: Jane Smith
Password: Pa$$w0rd
Medical condition: …
Client confidential contract details
```

**Why:** This app has no encryption, no access control, and data can be lost if browser storage is cleared. Shared PCs increase exposure risk.

---

## Create a note

1. Open the app.
2. Click **+ New incident**.
3. Read the privacy banner.
4. Fill Summary, Context, Status, Priority, Category.
5. Complete Issue → Checked → Changed → Result sections.
6. Click **Save incident**.

## Search, filter, and sort

Use the search box on the home list. Search matches summary, context, status, priority, category, all text fields, reference, tags, and escalated-to.

Open **Filter & sort** to narrow by context, status, priority, category, pinned-only, or show archived. Filters combine with search. **Clear filters** resets filters (sort is kept). Preferences save automatically in this browser.

## Templates

On **+ New incident**, use **Use template** to prefill category, status, priority, prompts, and tags for common scenarios (password reset, printer, Wi‑Fi, M365, phishing, performance, 3CX, Datto, escalation, learning, etc.).

If the form already has text, you will be asked to confirm before applying a template.

## Quick-fill snippets

On the new/edit form, expand **Quick fill** and click a snippet. It appends to the currently focused textarea (or the first prompt field if none focused).

## Pin and archive

On a note’s detail view: **Pin** / **Unpin** keeps important notes at the top of the list. **Archive** hides a note from the default list (use **Show archived** in filters to see them). Archived notes are not deleted.

## Privacy mode

Toggle **Privacy mode** in the top bar. List cards hide issue/result preview text — useful on shared screens. Only summary, badges, context, and date show.

## Dark mode

Use the **Theme** dropdown: System (default), Light, or Dark. Preference is saved per browser.

## Edit or delete

- Open a note from the list.
- Click **Edit**, change fields, **Save changes**.
- **Delete** is on the edit form (confirmation required).

## Copy formats

On the detail view, use the copy menu:

| Button | Use when |
|--------|----------|
| **Copy full ticket note** | Complete handover with all fields |
| **Copy short ticket note** | Quick ticket update |
| **Copy escalation summary** | Tier 2 / vendor escalation |
| **Copy manager-safe summary** | Status update without sensitive detail |
| **Copy learning summary** | Personal learning / lab notes |

Single-note **Export .txt** always uses the **full** format.

## Export single note (.txt)

Click **Export .txt** on the detail view. Filename format: `fieldnote-summary-slug-YYYY-MM-DD.txt`.

## Export all notes

**Data tools** on the home list:

- **Export all JSON** — full backup for restore (`fieldnotes-backup-YYYY-MM-DD.json`)
- **Export all CSV** — spreadsheet summary (`fieldnotes-summary-YYYY-MM-DD.csv`)
- **Export all TXT** — every note in one file (`fieldnotes-all-notes-YYYY-MM-DD.txt`)

## Import / restore JSON

**Restore / import JSON** → choose a backup file → **Merge** (add/update; duplicate IDs resolved by newest update) or **Replace all** (requires confirmation; replaces every note after validation).

Export JSON before **Clear all local data** or browser site-data clears.

## Voice dictation

Beside major textareas, click **Dictate** if your browser supports the Web Speech API (often Chrome/Edge). Speak clearly; final phrases append to the field.

If Dictate is greyed out, typing still works — the app does not require voice.

## Before clearing browser data

1. Export JSON backup from **Data tools**.
2. Store the file somewhere safe (OneDrive, USB).
3. Only then clear site data or use **Clear all local data** (requires typing `DELETE`).

---

## Workflow examples

### Quick L1 support note

- **Status:** Resolved  
- **Priority:** Normal  
- **Category:** Printer  
- **Issue:** User cannot print to front desk printer  
- **Checked:** Print spooler stopped; queue stuck  
- **Changed:** Restarted spooler  
- **Result:** Test page OK  
- **Resolution summary:** Spooler restart fixed printing  

### Escalation note

- **Status:** Escalated  
- **Priority:** High  
- **Escalated to:** Tier 2 / vendor  
- **Follow-up:** Awaiting callback with case ref  

### Learning / lab note

- **Context:** Personal Lab  
- **Status:** Learning Note  
- **Category:** Network  
- Document what you tested and what you learned (no real client data).

### Manager-safe summary

Use **Copy manager-safe summary** or write neutral **Resolution summary** / **Result** text — no student names, no credentials. Review any copy before pasting into tickets.
