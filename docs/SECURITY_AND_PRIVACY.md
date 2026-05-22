# Security and Privacy — IT Support Field Notes

## Design principles

- **Local-only:** Notes live in browser `localStorage` on your device.
- **No backend:** No server receives, stores, or processes your notes.
- **No accounts:** No login, no user IDs, no session tokens in this app.
- **No telemetry:** No analytics, error reporting SDKs, or third-party trackers in the codebase.
- **No encryption:** Data is stored as plain JSON in localStorage (browser-managed).

---

## Risks of localStorage

| Risk | Mitigation |
|------|------------|
| Browser data cleared | Export JSON backup regularly |
| Shared / public PC | Do not use for sensitive incidents; clear data after use |
| Malware on device | Standard endpoint security; not specific to this app |
| No sync | Manual export if you need notes on another device |
| Physical access | OS login + disk encryption; lock workstation |

---

## What must NOT be stored

- Passwords, PINs, API keys, private credentials  
- Student or staff **full names** (unless your org policy explicitly allows and you accept risk)  
- Client-confidential business data  
- Medical, health, or highly personal information  
- Unredacted security incident secrets (live exploit details, unchecked creds)

---

## Safe reference examples

- Ticket ID: `INC-10422`  
- Asset tag: `DCS-LT-8842`  
- Device role: `Staff laptop — finance` (without naming individuals)  
- Vendor case: `Vendor ref #99812`

---

## Backup and export responsibility

- **You** own backups. Use **Export all JSON** before:
  - Clearing browser site data  
  - Using **Clear all local data**  
  - Reinstalling browser or OS  
- Exported JSON is still plain text — store it securely (encrypted drive, access-controlled folder).

---

## Copy / clipboard

Copied ticket text may land in clipboard history tools or sync (e.g. cloud clipboard). Review content before copying on shared systems.

---

## Privacy mode

**Privacy mode** (top bar) hides issue/result preview text on the home list. It does **not** encrypt data or remove sensitive text from detail view or exports. Use it when others might glance at your screen; still avoid storing secrets in notes.

UI preferences (including privacy mode and theme) are stored in `fieldnotes_ui_prefs_v1` — separate from incident notes.

---

## Shared-device risk

Anyone with access to your unlocked browser profile can open DevTools and read localStorage. Log out of shared machines; use **Clear all local data** when finished.

---

## Future features (policy)

Backend sync, AI, or ticket APIs would require a **new security review** and are **out of scope** for the current product.
