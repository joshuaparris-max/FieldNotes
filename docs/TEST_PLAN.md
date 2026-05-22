# Test Plan — IT Support Field Notes

Run before every push to `main` and after Vercel deploy.

**Local server:**

```bash
python -m http.server 8765
```

Open: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

---

## Manual functional checklist

- [ ] App loads with **no console errors**
- [ ] Home shows “IT Support Field Notes” branding
- [ ] Create incident with **all fields** populated → Save
- [ ] Detail view shows every field (including status, priority, category, resolution summary, escalated to, time spent)
- [ ] **Search** finds text in: summary, context, status, priority, category, issue, checked, changed, result, resolution summary, follow-up, reference, tags
- [ ] **Edit** incident → Save → changes persist
- [ ] **Delete** incident → removed from list
- [ ] **Copy ticket note** → toast “Copied ticket note” (or fallback modal)
- [ ] **Export .txt** downloads file with full formatted content
- [ ] **Export all JSON** downloads `fieldnotes-backup-YYYY-MM-DD.json`
- [ ] **Clear all local data** — cancelled at step 1 does nothing
- [ ] **Clear all local data** — type DELETE → list empty
- [ ] **Refresh page** — notes persist (except after clear)
- [ ] **Dictate** buttons present; app works if unsupported (disabled state)
- [ ] **Data tools** only on list view, not on form/detail

### Phase 2/3 workflow

- [ ] **Filter & sort** — context/status/priority/category; combines with search
- [ ] **Clear filters** resets filter fields; sort preference persists
- [ ] **Use template** on new form — confirm if form has content; fields prefilled
- [ ] **Quick fill** snippet appends to focused textarea
- [ ] **Pin** / **Unpin** — pinned notes sort above others
- [ ] **Archive** / **Unarchive** — hidden unless “Show archived” checked
- [ ] **Privacy mode** — list hides issue/result preview
- [ ] **Theme** light/dark/system persists after reload
- [ ] **Copy** full, short, escalation, manager-safe, learning — toast each
- [ ] **Export CSV** and **Export all TXT** download with dated filenames
- [ ] **Import JSON merge** — adds notes; duplicate IDs handled
- [ ] **Import JSON replace** — warns; replaces after valid JSON
- [ ] Round-trip: export JSON → clear data → import → notes return

---

## Migration tests

- [ ] Existing v2/v3 notes load; upgrade to schema v4 (`pinned`, `archived` false)
- [ ] Legacy v1 key still present if never migrated; migration populates v2 when v2 was empty
- [ ] Old note content visible (summary/issue/reference) after upgrade

**Optional:** In DevTools → Application → Local Storage, paste a minimal v1 array and reload.

---

## Browser checklist

| Browser | Load | Create | Copy | Export |
|---------|------|--------|------|--------|
| Chrome / Edge | | | | |
| Firefox | | | | |
| Safari (if available) | | | | |

---

## Copy / export tests

- [ ] Copied text includes Status, Priority, Category, Resolution Summary, Escalated To, Time Spent
- [ ] JSON export contains `schemaVersion: 4` (or current) and `notes` array
- [ ] `.txt` filename is filesystem-safe (no special chars)

---

## Dictation tests

- [ ] Supported browser: Dictate starts without console error
- [ ] Unsupported: Dictate disabled; form still submittable

---

## PWA tests

- [ ] On **localhost**: no service worker registered (check DevTools → Application)
- [ ] On **production** (after deploy): SW registers; offline reload shows shell
- [ ] After deploy update: hard refresh or clear site data if stale assets

---

## Vercel smoke test

- [ ] Production URL loads (not blank)
- [ ] `constants.js` returns 200
- [ ] Create and save one note on production URL
- [ ] No mixed-content or 404 script errors

---

## Accessibility checks

- [ ] Search input has accessible label (sr-only)
- [ ] Modal has `role="dialog"` and `aria-modal`
- [ ] Toast container has `aria-live="polite"`
- [ ] Keyboard: Tab through form and activate Save

---

## Regression checklist (quick)

1. Load home  
2. New incident → save  
3. Copy + export txt  
4. Export JSON  
5. Search unique word  
6. Edit one field  
7. Delete test note  
