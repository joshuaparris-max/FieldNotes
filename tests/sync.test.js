const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine Chrome executable
let executablePath;
if (process.platform === 'win32') {
    executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
} else if (process.platform === 'linux') {
    executablePath = '/usr/bin/google-chrome';
} else {
    executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

const express = require('express');
const app = express();
app.use(express.static(__dirname + '/..'));
const server = app.listen(0);
const port = server.address().port;
const url = `http://localhost:${port}/`;

// Mock SyncFile object
const mockSyncFileCode = `
    window.__fakeSyncData = null;
    
    class FakeFile {
        async text() {
            const res = await fetch('/__fake_sync_file');
            if (res.status === 404) return "";
            return res.text();
        }
    }
    class FakeWritable {
        async write(data) {
            if (window.__fakeWriteFail) throw new Error("Fake write fail");
            await fetch('/__fake_sync_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data
            });
        }
        async close() {}
    }
    class FakeHandle {
        constructor() { this.name = 'sync.json'; }
        async getFile() { return new FakeFile(); }
        async createWritable() { return new FakeWritable(); }
        async queryPermission() { return window.__fakePermission === false ? "denied" : "granted"; }
        async requestPermission() { return window.__fakePermission === false ? "denied" : "granted"; }
    }
    
    window.showOpenFilePicker = async () => {
        localStorage.setItem('__fakeHandle', 'true');
        return [new FakeHandle()];
    };
    window.showSaveFilePicker = async () => {
        localStorage.setItem('__fakeHandle', 'true');
        return new FakeHandle();
    };

    // We must also mock indexedDB since FakeHandle can't be cloned by indexedDB
    const fakeIdb = {
        async getStoredHandle() { return localStorage.getItem('__fakeHandle') ? new FakeHandle() : null; },
        async setHandle() {},
        async clearHandle() { localStorage.removeItem('__fakeHandle'); }
    };
    
    // Override the SyncFile's internal IDB usage by intercepting it when assigned
    let _syncFile = null;
    Object.defineProperty(window, 'FieldNotesSyncFile', {
        get() { return _syncFile; },
        set(orig) {
            _syncFile = {
                ...orig,
                getStoredHandle: fakeIdb.getStoredHandle,
                disconnect: async () => { await fakeIdb.clearHandle(); }
            };
            _syncFile.pickFile = async () => {
                const [h] = await window.showOpenFilePicker();
                return h;
            };
            _syncFile.createFile = async () => {
                return await window.showSaveFilePicker();
            };
        }
    });
`;

let fakeSyncFile = null;

app.get('/__fake_sync_file', (req, res) => {
    if (!fakeSyncFile) return res.status(404).send('Not found');
    res.json(JSON.parse(fakeSyncFile));
});

app.post('/__fake_sync_file', express.json({limit: '50mb'}), (req, res) => {
    fakeSyncFile = JSON.stringify(req.body);
    res.sendStatus(200);
});

async function runTests() {
    console.log("Starting FieldNotes Sync Tests...");
    let browser;
    let failed = false;
    try {
        browser = await puppeteer.launch({
            executablePath,
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        async function createDevice(deviceId) {
            const ctx = await browser.createBrowserContext();
            const page = await ctx.newPage();
            page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            page.on('pageerror', err => console.error('PAGE ERROR:', err));
            await page.evaluateOnNewDocument(mockSyncFileCode);
            await page.goto(url);
            await page.evaluate((id) => {
               localStorage.setItem('fieldnotes_device_id', id);
            }, deviceId);
            return { ctx, page };
        }

        // Scenario: Connect file & Basic sync
        console.log("Running: Connect file & Basic sync");
        fakeSyncFile = null;
        let d1 = await createDevice('A');
        
        await d1.page.evaluate(() => { FieldNotesData.create({ summary: "NOTE_A" }); });
        await d1.page.reload();
        
        // click connect
        await d1.page.evaluate(() => {
            window.confirm = () => true;
            const btn = document.querySelector('[data-action="sync-connect"]');
            console.log("BUTTON FOUND?", !!btn, btn ? btn.outerHTML : "");
            btn.click();
        });
        await new Promise(r => setTimeout(r, 500));
        
        console.log("D1 sync done. Fake file length:", fakeSyncFile ? fakeSyncFile.length : "null");
        
        let d2 = await createDevice('B');
        await d2.page.evaluate(() => {
            window.confirm = () => true;
            document.querySelector('[data-action="sync-connect"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        
        let d2Text = await d2.page.evaluate(() => document.body.innerText);
        if (!d2Text.includes("NOTE_A")) {
           console.error("D2 TEXT:", d2Text);
           throw new Error("NOTE_A did not sync to Device B");
        }

        // Scenario: Bidirectional sync
        console.log("Running: Bidirectional sync");
        await d2.page.evaluate(() => { FieldNotesData.create({ summary: "NOTE_B" }); });
        await d2.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        await d1.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        let d1Text = await d1.page.evaluate(() => document.body.innerText);
        if (!d1Text.includes("NOTE_B")) throw new Error("NOTE_B did not sync back to Device A");

        // Scenario: Same-note conflict
        console.log("Running: Same-note conflict");
        let noteId = await d1.page.evaluate(() => FieldNotesData.getAll().find(n => n.summary === "NOTE_A").id);
        
        // A edits NOTE_A
        await d1.page.evaluate((id) => FieldNotesData.update(id, { summary: "NOTE_A_EDIT_A" }), noteId);
        // B edits NOTE_A
        await d2.page.evaluate((id) => FieldNotesData.update(id, { summary: "NOTE_A_EDIT_B" }), noteId);
        
        // B syncs first
        await d2.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        // A syncs -> Conflict
        await d1.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        let confTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!confTxt.includes("Sync Conflict Detected!")) throw new Error("Conflict UI did not appear");
        
        // Keep Both (Choice 3)
        await d1.page.evaluate(() => {
            window.prompt = () => "3";
            document.querySelector('[data-action="resolve-conflict"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        
        let aFinalTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!aFinalTxt.includes("NOTE_A_EDIT_A") || !aFinalTxt.includes("NOTE_A_EDIT_B")) {
            throw new Error("Keep Both failed to keep both edits");
        }

        // Scenario: Delete propagation
        console.log("Running: Delete propagation");
        let noteBId = await d1.page.evaluate(() => FieldNotesData.getAll().find(n => n.summary === "NOTE_B").id);
        
        // A deletes NOTE_B
        await d1.page.evaluate((id) => FieldNotesData.remove(id), noteBId);
        await d1.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        // B syncs
        await d2.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        let bFinalTxt = await d2.page.evaluate(() => document.body.innerText);
        if (bFinalTxt.includes("NOTE_B")) throw new Error("Deletion did not propagate to B");

        // Scenario: Corrupt file
        console.log("Running: Corrupt file");
        fakeSyncFile = "{ invalid json ]";
        await d1.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
        await new Promise(r => setTimeout(r, 500));
        
        let cTxt = await d1.page.evaluate(() => document.body.innerText);
        if (cTxt.includes("NOTE_B")) throw new Error("Corrupt file destroyed local data"); // should still be deleted
        if (!cTxt.includes("Invalid sync file format") && !cTxt.includes("Failed to read sync file") && !cTxt.includes("local data safe")) {
            throw new Error("Did not show clear error for corrupt file. Text: " + cTxt);
        }

        // Scenario: Permission loss
        console.log("Running: Permission loss");
        await d1.page.evaluate(() => { window.__fakePermission = false; document.querySelector('[data-action="sync-now"]').click(); });
        await new Promise(r => setTimeout(r, 500));
        let pTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!pTxt.includes("Permission required")) throw new Error("Did not report Permission required");

        // Scenario: Failed write
        console.log("Running: Failed write");
        fakeSyncFile = JSON.stringify({ format: "fieldnotes-sync", version: 1, notes: [], tombstones: [] }); // Reset so read succeeds
        await d1.page.evaluate(() => { window.__fakePermission = true; window.__fakeWriteFail = true; document.querySelector('[data-action="sync-now"]').click(); });
        await new Promise(r => setTimeout(r, 500));
        let wTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!wTxt.includes("local data safe")) throw new Error("Did not report safe failure on write fail");

        // Scenario: Reconnect handle
        console.log("Running: Reconnect handle");
        await d1.page.reload();
        await new Promise(r => setTimeout(r, 500)); // allow boot init
        let lsCheck = await d1.page.evaluate(() => localStorage.getItem('__fakeHandle'));
        console.log("LocalStorage __fakeHandle:", lsCheck);
        
        let rTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!rTxt.includes("Sync file connected") && !rTxt.includes("Synced ")) {
            console.log("TEXT WAS:", rTxt);
            throw new Error("Did not auto-reconnect handle on startup");
        }

        console.log("ALL SYNC TESTS PASSED");
        
    } catch (e) {
        console.error("Test failed:", e);
        failed = true;
    } finally {
        if (browser) await browser.close();
        server.close();
    }
    
    if (failed) {
        process.exit(1);
    }
}

runTests();
