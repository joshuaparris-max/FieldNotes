# FieldNotes

A simple, browser-based app for capturing field observations — site notes, locations, tags, and details. Data is stored locally in your browser using `localStorage` (no server, no account).

## What it does

- Create, view, edit, and delete field notes
- Add title, details, location, and comma-separated tags
- Search across all note fields
- Works offline after the first load

## Run locally

You need a local static file server (opening `index.html` directly from disk can work, but a server is more reliable):

**Option A — Python (if installed)**

```bash
cd FieldNotes
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

**Option B — Node/npx**

```bash
cd FieldNotes
npx --yes serve .
```

Open the URL shown in the terminal (usually port 3000).

## Deploy on Vercel

1. Import the GitHub repo `joshuaparris-max/FieldNotes` in [Vercel](https://vercel.com).
2. Use these project settings:

| Setting | Value |
|--------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `./` |
| **Build Command** | *(leave blank)* |
| **Output Directory** | `.` or *(leave blank)* |
| **Install Command** | *(leave blank)* |

3. Deploy. Vercel will serve the static files from the repo root.

No environment variables or API keys are required.

## Project structure

```
FieldNotes/
├── index.html    # Entry page and script load order
├── styles.css    # Layout and theme
├── data.js       # localStorage CRUD
├── format.js     # Dates, HTML escaping, tags
├── ui.js         # DOM rendering
├── actions.js    # Events and navigation
└── boot.js       # App startup
```

Scripts must load in this order (defined in `index.html`).

## Privacy

Notes never leave your device unless you export or sync them yourself. Clearing browser data for the site will remove stored notes.

## License

Personal/educational use — adjust as needed for your project.
