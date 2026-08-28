const puppeteer = require('puppeteer-core');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

let fakeSyncFile = null;
app.get('/__fake_sync_file', (req, res) => {
    if (!fakeSyncFile) return res.status(404).send('Not found');
    res.json(JSON.parse(fakeSyncFile));
});

app.post('/__fake_sync_file', express.json({limit: '50mb'}), (req, res) => {
    fakeSyncFile = JSON.stringify(req.body);
    res.sendStatus(200);
});

let server = app.listen(0, async () => {
    const port = server.address().port;
    const url = `http://localhost:${port}/`;
    
    // The exact browser path fieldnotes was tested with
    const executablePath = process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : undefined;

const mockSyncFileCode = `
    window.__fakeSyncData = null;
    
    class FakeFile {
        async text() {
            const res = await fetch('/__fake_sync_file');
            if (res.status === 404) return "";
            return await res.text();
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
        // For IDB cloning, these won't survive. We re-attach them.
        async getFile() { return new FakeFile(); }
        async createWritable() { return new FakeWritable(); }
        async queryPermission() { return window.__fakePermission === false ? "denied" : "granted"; }
        async requestPermission() { return window.__fakePermission === false ? "denied" : "granted"; }
    }
    
    window.showOpenFilePicker = async () => {
        return [new FakeHandle()];
    };
    window.showSaveFilePicker = async () => {
        return new FakeHandle();
    };

    let _syncFile = null;
    Object.defineProperty(window, 'FieldNotesSyncFile', {
        get() { return _syncFile; },
        set(orig) {
            _syncFile = { ...orig };
            
            const origGetStoredHandle = _syncFile.getStoredHandle;
            _syncFile.getStoredHandle = async () => {
                if (window.__forceIDBNull) return null;
                const h = await origGetStoredHandle();
                if (h) {
                    h.getFile = async () => new FakeFile();
                    h.createWritable = async () => new FakeWritable();
                    h.queryPermission = async () => window.__fakePermission === false ? "denied" : "granted";
                    h.requestPermission = async () => window.__fakePermission === false ? "denied" : "granted";
                }
                return h;
            };

            const origRead = _syncFile.read;
            _syncFile.read = async (handle) => {
                if (window.__offlineMode) throw new Error("Offline");
                const data = await origRead(handle);
                if (window.__triggerRace) {
                    console.log('RACE_TRIGGERED');
                    await new Promise(r => setTimeout(r, 1000));
                }
                return data;
            };

            const origWrite = _syncFile.write;
            _syncFile.write = async (handle, data) => {
                if (window.__offlineMode) throw new Error("Offline");
                return origWrite(handle, data);
            };
        }
    });
`;

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
            
            let onRace = null;
            page.on('console', msg => {
                if (msg.text() === 'RACE_TRIGGERED' && onRace) onRace();
                else console.log('PAGE:', msg.text());
            });
            page.on('pageerror', err => console.error('PAGE ERROR:', err));
            
            await page.evaluateOnNewDocument(mockSyncFileCode);
            await page.goto(url);
            await page.evaluate((id) => {
               localStorage.setItem('fieldnotes_device_id', id);
            }, deviceId);
            
            return { ctx, page, setOnRace: (cb) => { onRace = cb; } };
        }
        
        async function waitForText(page, text, timeout = 2000) {
            const start = Date.now();
            while(Date.now() - start < timeout) {
                const html = await page.evaluate(() => document.body.innerText);
                if (html.includes(text)) return true;
                await new Promise(r => setTimeout(r, 100));
            }
            throw new Error(`Timeout waiting for text: ${text}`);
        }
        
        async function clickSync(device) {
            await device.page.evaluate(() => document.querySelector('[data-action="sync-now"]').click());
            await new Promise(r => setTimeout(r, 500));
        }

        // 1. Basic sync & IDB handle persistence
        console.log("Running: 1. Basic sync & IDB Handle Persistence");
        fakeSyncFile = null;
        let d1 = await createDevice('A');
        
        await d1.page.evaluate(() => { FieldNotesData.create({ summary: "NOTE_A" }); });
        await d1.page.reload();
        
        // Connect
        await d1.page.evaluate(() => {
            window.confirm = () => true;
            document.querySelector('[data-action="sync-connect"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        
        let d2 = await createDevice('B');
        await d2.page.evaluate(() => {
            window.confirm = () => true;
            document.querySelector('[data-action="sync-connect"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        
        await waitForText(d2.page, "NOTE_A");
        console.log("PASS Basic sync");
        
        // IDB handle persistence test
        await d1.page.reload();
        await new Promise(r => setTimeout(r, 500));
        let rTxt = await d1.page.evaluate(() => document.body.innerText);
        if (!rTxt.includes("Sync file connected") && !rTxt.includes("Synced ")) throw new Error("Did not auto-reconnect via IDB");
        console.log("PASS IDB Handle Persistence");

        // 2. Bidirectional independent notes
        console.log("Running: 2. Bidirectional independent notes");
        await d2.page.evaluate(() => { FieldNotesData.create({ summary: "NOTE_B" }); });
        await clickSync(d2);
        
        await clickSync(d1);
        await waitForText(d1.page, "NOTE_B");
        console.log("PASS Bidirectional");

        // 3. Concurrent same-note conflict & 4,5,6 Keep resolutions
        console.log("Running: 3-6. Same-note conflict & Resolutions");
        
        async function runConflictTest(choice, expectedTexts) {
            let nId = await d1.page.evaluate(() => FieldNotesData.getAll().find(n => n.summary.includes("NOTE_A")).id);
            await d1.page.evaluate((id, ch) => FieldNotesData.update(id, { summary: "NOTE_A_LOCAL_" + ch }), nId, choice);
            await d2.page.evaluate((id, ch) => FieldNotesData.update(id, { summary: "NOTE_A_REMOTE_" + ch }), nId, choice);
            
            await clickSync(d2); // B writes
            await clickSync(d1); // A reads, conflicts
            
            let htmlNow = await d1.page.evaluate(() => document.body.innerText);
            
            await waitForText(d1.page, "Conflict Detected");
            
            await d1.page.evaluate((ch) => {
                window.prompt = () => ch;
                document.querySelector('[data-action="resolve-conflict"]').click();
            }, choice);
            await new Promise(r => setTimeout(r, 500));
            
            let html = await d1.page.evaluate(() => document.body.innerText);
            for (let t of expectedTexts) {
                if (!html.includes(t)) throw new Error(`Conflict resolution failed for choice ${choice}. Missing ${t}`);
            }
            // Resync both devices so the next test starts clean
            await clickSync(d2);
            await clickSync(d1);
        }
        
        await runConflictTest("1", ["NOTE_A_LOCAL_1"]);
        console.log("PASS Keep Local");
        await runConflictTest("2", ["NOTE_A_REMOTE_2"]);
        console.log("PASS Keep Remote");
        await runConflictTest("3", ["NOTE_A_LOCAL_3", "NOTE_A_REMOTE_3"]);
        console.log("PASS Keep Both");

        // 7. Modify-vs-delete conflict (local edit, remote delete)
        console.log("Running: 7. Modify-vs-delete (local edit, remote delete)");
        let noteBId = await d1.page.evaluate(() => FieldNotesData.getAll().find(n => n.summary === "NOTE_B").id);
        
        await d1.page.evaluate((id) => FieldNotesData.update(id, { summary: "NOTE_B_EDIT" }), noteBId);
        await d2.page.evaluate((id) => FieldNotesData.remove(id), noteBId);
        
        await clickSync(d2);
        await clickSync(d1); // conflict!
        await waitForText(d1.page, "Conflict Detected");
        
        await d1.page.evaluate(() => {
            window.prompt = () => "1"; // keep local (edited note)
            document.querySelector('[data-action="resolve-conflict"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        let html7 = await d1.page.evaluate(() => document.body.innerText);
        if (!html7.includes("NOTE_B_EDIT")) throw new Error("Failed modify-vs-delete local edit win");
        console.log("PASS Modify-vs-delete (local edit)");

        // 8. Modify-vs-delete conflict (local delete, remote edit)
        console.log("Running: 8. Modify-vs-delete (local delete, remote edit)");
        let noteCId = await d1.page.evaluate(() => {
            const n = FieldNotesData.create({ summary: "NOTE_C" });
            return n.id;
        });
        await clickSync(d1);
        await clickSync(d2); // both have C
        
        await d1.page.evaluate((id) => FieldNotesData.remove(id), noteCId);
        await d2.page.evaluate((id) => FieldNotesData.update(id, { summary: "NOTE_C_EDIT" }), noteCId);
        
        await clickSync(d2);
        await clickSync(d1); // conflict!
        await waitForText(d1.page, "Conflict Detected");
        
        await d1.page.evaluate(() => {
            window.prompt = () => "2"; // keep remote (edited note)
            document.querySelector('[data-action="resolve-conflict"]').click();
        });
        await new Promise(r => setTimeout(r, 1000)); // wait longer for syncNow to finish
        let html8 = await d1.page.evaluate(() => document.body.innerText);
        if (!html8.includes("NOTE_C_EDIT")) {
            console.log("HTML 8 WAS:", html8);
            let state = await d1.page.evaluate(() => localStorage.getItem("fieldnotes_sync_state_v1"));
            let tombs = await d1.page.evaluate(() => localStorage.getItem("fieldnotes_tombstones_v1"));
            let base = await d1.page.evaluate(() => localStorage.getItem("fieldnotes_sync_base_v1"));
            console.log("STATE:", state);
            console.log("TOMBS:", tombs);
            console.log("BASE:", base);
            throw new Error("Failed modify-vs-delete remote edit win");
        }
        console.log("PASS Modify-vs-delete (remote edit)");

        // 9. Tombstone resurrection prevention
        console.log("Running: 9. Tombstone resurrection prevention");
        // A creates D, syncs. B deletes D, syncs. A syncs. D is not resurrected.
        let noteDId = await d1.page.evaluate(() => FieldNotesData.create({ summary: "NOTE_D" }).id);
        await clickSync(d1);
        await clickSync(d2);
        await d2.page.evaluate((id) => FieldNotesData.remove(id), noteDId);
        await clickSync(d2);
        
        // A reconnects and syncs (A still has D locally, but sync should delete it)
        await clickSync(d1);
        await new Promise(r => setTimeout(r, 500));
        let html9 = await d1.page.evaluate(() => document.body.innerText);
        if (html9.includes("NOTE_D")) throw new Error("Tombstone resurrected a deleted note");
        console.log("PASS Tombstone resurrection");

        // 10. Offline workflow
        console.log("Running: 10. Offline workflow");
        await d1.page.evaluate(() => { window.__offlineMode = true; });
        await d1.page.evaluate(() => FieldNotesData.create({ summary: "OFFLINE_NOTE" }));
        await clickSync(d1);
        let html10 = await d1.page.evaluate(() => document.body.innerText);
        if (!html10.includes("Sync error")) throw new Error("Did not gracefully handle offline sync");
        await d1.page.evaluate(() => { window.__offlineMode = false; });
        await clickSync(d1);
        await clickSync(d2);
        await waitForText(d2.page, "OFFLINE_NOTE");
        console.log("PASS Offline workflow");

        // 11. Stale-revision race
        console.log("Running: 11. Stale-revision race");
        // A reads, pauses. B syncs new data. A finishes read and tries to write.
        d1.setOnRace(async () => {
             await d2.page.evaluate(() => FieldNotesData.create({ summary: "RACE_NOTE" }));
             await clickSync(d2);
        });
        await d1.page.evaluate(() => { window.__triggerRace = true; });
        await clickSync(d1); // This will trigger B in the middle
        await new Promise(r => setTimeout(r, 2500)); // Wait for A's two 1000ms delays to finish
        await d1.page.evaluate(() => { window.__triggerRace = false; });
        let html11 = await d1.page.evaluate(() => document.body.innerText);
        if (!html11.includes("local data safe") && !html11.includes("Sync error")) throw new Error("Race condition not caught");
        console.log("PASS Stale-revision race");

        // 12. Clock skew
        console.log("Running: 12. Clock skew");
        // A creates note with older timestamp, B has newer timestamp.
        let noteEId = await d1.page.evaluate(() => FieldNotesData.create({ summary: "NOTE_E" }).id);
        await clickSync(d1);
        await clickSync(d2);
        // B modifies, gets timestamp NOW
        await d2.page.evaluate((id) => FieldNotesData.update(id, { summary: "NOTE_E_B" }), noteEId);
        // A modifies, gets timestamp IN PAST (Clock skew!)
        await d1.page.evaluate((id) => {
             const notes = FieldNotesData.getAll();
             const idx = notes.findIndex(n => n.id === id);
             notes[idx].summary = "NOTE_E_A";
             notes[idx].updatedAt = new Date(Date.now() - 1000000).toISOString();
             FieldNotesData.overwriteAll(notes);
        }, noteEId);
        
        await clickSync(d2);
        await clickSync(d1);
        await waitForText(d1.page, "Conflict Detected"); // Should still conflict because hashes differ!
        await d1.page.evaluate(() => {
            window.prompt = () => "1"; // keep A
            document.querySelector('[data-action="resolve-conflict"]').click();
        });
        console.log("PASS Clock skew");

        // 13. Failed write
        console.log("Running: 13. Failed write");
        await d1.page.evaluate(() => { window.__fakeWriteFail = true; });
        await clickSync(d1);
        let html13 = await d1.page.evaluate(() => document.body.innerText);
        if (!html13.includes("local data safe")) throw new Error("Failed write not caught");
        await d1.page.evaluate(() => { window.__fakeWriteFail = false; });
        console.log("PASS Failed write");

        // 14. Corrupt envelope
        console.log("Running: 14. Corrupt envelope");
        const realFile = fakeSyncFile;
        fakeSyncFile = "{ invalid json ]";
        await clickSync(d1);
        let html14 = await d1.page.evaluate(() => document.body.innerText);
        if (!html14.includes("local data safe") && !html14.includes("Invalid sync file format") && !html14.includes("Failed to read") && !html14.includes("Sync error")) {
            throw new Error("Corrupt file handling failed");
        }
        fakeSyncFile = realFile; // reset for next test
        console.log("PASS Corrupt envelope");

        // 15. First-connect merge preview
        console.log("Running: 15. First-connect preview");
        // Reset d3
        let d3 = await createDevice('C');
        await d3.page.evaluate(() => FieldNotesData.create({ summary: "LOCAL_ONLY_NOTE" }));
        
        // Let's connect C to the existing file (has notes from A & B)
        let confirmMsg = "";
        await d3.page.evaluate(() => {
            window.confirm = (msg) => { window.__confirmMsg = msg; return true; };
            document.querySelector('[data-action="sync-connect"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        confirmMsg = await d3.page.evaluate(() => window.__confirmMsg);
        if (!confirmMsg.includes("Local: 1 notes") || !confirmMsg.includes("Sync file: ")) {
            throw new Error("First connection did not display correct merge preview. Got: " + confirmMsg);
        }
        console.log("PASS First-connect merge preview");
        
        // 16. Permission loss
        console.log("Running: 16. Permission loss");
        await d1.page.evaluate(() => { window.__fakePermission = false; });
        await clickSync(d1);
        let html16 = await d1.page.evaluate(() => document.body.innerText);
        if (!html16.includes("Permission required")) throw new Error("Did not report Permission required");
        console.log("PASS Permission loss");

        console.log("====== ALL SYNC TESTS PASSED ======");
        
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
});
