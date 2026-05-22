# Vercel Deployment — IT Support Field Notes

## Prerequisites

- GitHub repo: [joshuaparris-max/FieldNotes](https://github.com/joshuaparris-max/FieldNotes)
- Vercel account linked to GitHub

---

## Exact project settings

| Setting | Value |
|--------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Build Command** | *(leave blank)* |
| **Output Directory** | `.` or *(leave blank)* |
| **Install Command** | *(leave blank)* |
| **Environment variables** | *(none)* |

No build step. Vercel serves files from the repository root.

---

## First deploy

1. Vercel Dashboard → **Add New Project**
2. Import `joshuaparris-max/FieldNotes`
3. Confirm settings above
4. Deploy

Production URL will look like `https://field-notes-*.vercel.app` or your custom domain.

---

## Redeploy after changes

1. Push to GitHub `main`
2. Vercel auto-deploys (if connected)
3. Or: Project → Deployments → **Redeploy**

---

## Troubleshooting: blank page

| Check | Action |
|-------|--------|
| 404 on `*.js` | Ensure scripts are at repo root; paths in `index.html` are relative (`constants.js`, not `/constants.js` unless intentional) |
| Console error “FieldNotesData undefined” | Script order: `constants.js` → `prefs.js` → `templates.js` → `data.js` → `format.js` → `ui.js` → `actions.js` → `boot.js` |
| Old deployment | Hard refresh (Ctrl+Shift+R) |
| Wrong root directory | Root must be `./` if app files are at repo root |

---

## Troubleshooting: stale service worker

Symptoms: old UI after deploy, missing buttons, wrong styles.

**Fix for users:**

1. DevTools → Application → Service Workers → **Unregister**
2. Application → Storage → **Clear site data** (note: deletes localStorage notes on that device)
3. Hard refresh

**Fix for developers:**

- Service worker cache name bumped in `service-worker.js` (`fieldnotes-shell-v4`) on releases
- Local dev skips SW on `localhost` / `127.0.0.1`

**After deploy:** Ask testers to hard-refresh once if they used an older PWA install.

---

## Post-deploy smoke tests

1. Open production URL — title “IT Support Field Notes”
2. DevTools → Network — all JS files **200**
3. Create one test incident (no real sensitive data)
4. Copy ticket note — toast appears
5. Export JSON from Data tools
6. Confirm `constants.js` loads

---

## Custom domain (optional)

Vercel → Project → Settings → Domains → add domain → follow DNS instructions.

HTTPS is automatic.

---

## Offline note

After first visit, static shell may load offline via service worker. **Notes remain in localStorage** on that browser only; export JSON for backup.
