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

## Search

Use the search box on the home list. Search matches summary, context, status, priority, category, all text fields, reference, tags, and escalated-to.

## Edit or delete

- Open a note from the list.
- Click **Edit**, change fields, **Save changes**.
- **Delete** is on the edit form (confirmation required).

## Copy ticket note

On the detail view, click **Copy ticket note**. A toast confirms success. If clipboard access fails, a dialog shows the text for manual copy.

## Export single note (.txt)

Click **Export .txt** on the detail view. Filename format: `fieldnote-summary-slug-YYYY-MM-DD.txt`.

## Export all notes (JSON backup)

On the home list, scroll to **Data tools** → **Export all JSON backup**.

File format: `fieldnotes-backup-YYYY-MM-DD.json` containing all notes and schema version.

**Restore/import from JSON is planned** — keep backups until import is available.

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

Use **Resolution summary** and **Result** with neutral language — no student names, no credentials. Copy the full ticket note only after reviewing for sensitive content.
