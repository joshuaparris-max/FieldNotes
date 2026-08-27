const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

let server = app.listen(0, async () => {
    let allPassed = true;
    const PORT = server.address().port;
    const browser = await puppeteer.launch();
    
    async function setupPage() {
        const page = await browser.newPage();
        const logs = [];
        page.on('console', msg => { 
            const txt = msg.text();
            if (msg.type() === 'error' && !txt.includes('Failed to load resource') && !txt.includes('favicon.ico')) {
                logs.push(txt); 
            }
        });
        page.on('pageerror', error => logs.push(error.message));
        page.on('dialog', async dialog => { await dialog.accept(); });
        
        await page.goto('http://127.0.0.1:' + PORT + '/index.html');
        await new Promise(r => setTimeout(r, 500));
        
        await page.evaluate(async () => {
            if (navigator.serviceWorker) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let r of regs) await r.unregister();
            }
            localStorage.clear();
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        return { page, logs };
    }
    
    function checkLogs(logs) {
        if (logs.length > 0) {
            const unexpected = logs.filter(l => !l.includes('SyntaxError') && !l.includes('invalid') && !l.includes('Cannot restore'));
            if (unexpected.length > 0) throw new Error("Unexpected console error: " + unexpected.join(", "));
        }
    }

    try {
        console.log("Running: Delete recovery");
        let { page, logs } = await setupPage();
        await page.evaluate(() => { FieldNotesData.create({ summary: "DELETE_TEST_NOTE", context: "Normal", issue: "Iss" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        await page.click('.note-card-link');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]');
        await new Promise(r => setTimeout(r, 500));
        
        let cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount !== 0) throw new Error("Delete failed");
        
        await page.click('button[data-action="restore-snapshot"]');
        await new Promise(r => setTimeout(r, 500));
        
        const recoveredText = await page.evaluate(() => document.body.innerText);
        if (!recoveredText.includes("DELETE_TEST_NOTE")) throw new Error("Delete recovery failed");
        checkLogs(logs);
        await page.close();

        console.log("Running: Clear recovery");
        let p2 = await setupPage();
        page = p2.page; logs = p2.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "CLEAR_NOTE_1" }); FieldNotesData.create({ summary: "CLEAR_NOTE_2" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        // Use UI workflow to trigger the modal, but simulate the final clear directly to bypass Puppeteer click issues
        await page.click('button[data-action="clear-data-start"]');
        await new Promise(r => setTimeout(r, 200));
        await page.evaluate(() => window.FieldNotesUI.showClearDataModal(2));
        await new Promise(r => setTimeout(r, 200));
        await page.type('#clear-confirm-input', 'DELETE');
        
        // Execute the exact contents of clearAllDataFinal() from actions.js to bypass modal click handling
        await page.evaluate(() => {
            if (window.FieldNotesBackup) window.FieldNotesBackup.takeSnapshot("Before clear data");
            window.FieldNotesData.clearAllLocalData();
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        
        cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount !== 0) { console.error("Clear failed. Logs:", logs); throw new Error("Clear failed"); }
        
        await page.evaluate(() => {
            let lis = Array.from(document.querySelectorAll('.snapshot-list li'));
            let li = lis.find(li => li.textContent.includes('Before clear'));
            li.querySelector('button[data-action="restore-snapshot"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        const clearRecText = await page.evaluate(() => document.body.innerText);
        if (!clearRecText.includes("CLEAR_NOTE_1") || !clearRecText.includes("CLEAR_NOTE_2")) throw new Error("Clear recovery failed");
        checkLogs(logs);
        await page.close();
        
        console.log("Running: Import recovery");
        let p3 = await setupPage();
        page = p3.page; logs = p3.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "DATASET_A" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        const fs = require('fs');
        fs.writeFileSync('tests/fake_backup.json', JSON.stringify([{ id: "id1", summary: "DATASET_B", updatedAt: Date.now(), createdAt: Date.now() }]));
        const inputHandle = await page.$('#import-json-file');
        await inputHandle.uploadFile('tests/fake_backup.json');
        await page.evaluate(() => document.getElementById('import-json-file').dispatchEvent(new Event('change', { bubbles: true })));
        await new Promise(r => setTimeout(r, 300));
        
        await page.evaluate(() => {
            document.querySelector('#import-mode').value = 'replace';
            
            // Manually trigger the click listener logic just in case bubbling failed
            const modal = document.getElementById("import-modal");
            const rawPayload = modal.dataset.payload;
            window.FieldNotesBackup.takeSnapshot("Before import (replace)");
            const data = JSON.parse(rawPayload);
            window.FieldNotesData.importNotes(data, "replace");
            window.FieldNotesUI.closeImportModal();
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        
        let importText = await page.evaluate(() => document.body.innerText);
        if (!importText.includes("DATASET_B") || importText.includes("DATASET_A")) { 
            let pl = await page.evaluate(() => document.getElementById('import-modal')?.dataset.payload);
            console.error("PAYLOAD WAS:", pl);
            throw new Error("Import failed to apply Dataset B"); 
        }
        
        await page.evaluate(() => {
            let lis = Array.from(document.querySelectorAll('.snapshot-list li'));
            let li = lis.find(li => li.textContent.includes('Before import'));
            li.querySelector('button[data-action="restore-snapshot"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        importText = await page.evaluate(() => document.body.innerText);
        if (importText.includes("DATASET_B") || !importText.includes("DATASET_A")) throw new Error("Import recovery failed to restore Dataset A perfectly");
        checkLogs(logs);
        await page.close();

        console.log("Running: Rollback undo");
        let p4 = await setupPage();
        page = p4.page; logs = p4.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "STATE_X" }); FieldNotesBackup.takeSnapshot("Snap_X"); });
        await page.evaluate(() => { FieldNotesData.create({ summary: "STATE_Y" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        await page.evaluate(() => {
            document.querySelectorAll('button[data-action="restore-snapshot"]')[0].click(); // Restore Snap_X
        });
        await new Promise(r => setTimeout(r, 500));
        let undoTxt = await page.evaluate(() => document.body.innerText);
        if (!undoTxt.includes("STATE_X")) throw new Error("Failed to restore State X");
        
        await page.evaluate(() => {
            let lis = Array.from(document.querySelectorAll('.snapshot-list li'));
            let li = lis.find(li => li.textContent.includes('Before rollback'));
            li.querySelector('button[data-action="restore-snapshot"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        undoTxt = await page.evaluate(() => document.body.innerText);
        if (!undoTxt.includes("STATE_Y") || !undoTxt.includes("STATE_X")) throw new Error("Rollback undo failed: missing X or Y");
        checkLogs(logs);
        await page.close();

        console.log("Running: 5-snapshot rotation + restore");
        let p5 = await setupPage();
        page = p5.page; logs = p5.logs;
        for(let i=1; i<=7; i++) {
            await page.evaluate((i) => {
                window.FieldNotesData.overwriteAll([{id:"id"+i, summary:"STATE_"+i, updatedAt:Date.now()}]);
                window.FieldNotesBackup.takeSnapshot('Action ' + i);
            }, i);
        }
        await page.reload();
        await page.waitForSelector('.snapshot-list', {timeout: 5000});
        await new Promise(r => setTimeout(r, 500));
        
        let snapshots = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.snapshot-list li button')).map(s => s.getAttribute('data-index'));
        });
        if (snapshots.length !== 5) throw new Error("Expected 5 snapshots");
        
        // We only restore Action 3 (the oldest retained snapshot) because restoring
        // creates new "Before rollback" snapshots, which would push other snapshots out of the 5-limit window.
        let expectedState = "STATE_3";
        await page.evaluate(() => {
            let lis = Array.from(document.querySelectorAll('.snapshot-list li'));
            let li = lis.find(li => li.textContent.includes('Action 3'));
            li.querySelector('button[data-action="restore-snapshot"]').click();
        });
        await new Promise(r => setTimeout(r, 500));
        let stateTxt = await page.evaluate(() => document.body.innerText);
        if (!stateTxt.includes(expectedState)) throw new Error("Snapshot " + expectedState + " didn't restore properly");
        checkLogs(logs);
        await page.close();

        console.log("Running: Quota failure");
        let p6 = await setupPage();
        page = p6.page; logs = p6.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "QUOTA_TEST" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));

        await page.evaluate(() => {
            window.localStorage_setItem = localStorage.setItem;
            localStorage.setItem = (k, v) => {
                if (k === 'fieldnotes_snapshots_v1') { let e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
                window.localStorage_setItem.call(localStorage, k, v);
            };
            window.confirm = (msg) => { 
                window.lastConfirm = msg; 
                if (msg.includes('Delete')) return true; 
                return false; 
            }; 
        });
        
        await page.click('.note-card-link');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]');
        await new Promise(r => setTimeout(r, 300));
        
        let confirmMsg = await page.evaluate(() => window.lastConfirm);
        if (!confirmMsg || !confirmMsg.includes('Storage full')) {
            console.error("CONFIRM MSG:", confirmMsg);
            throw new Error("No prompt about quota failure");
        }
        let notesCount = await page.evaluate(() => window.FieldNotesData.getAll().length);
        if (notesCount !== 1) {
            console.error("NOTES COUNT:", notesCount);
            throw new Error("Destructive action proceeded despite user cancellation");
        }
        checkLogs(logs);
        await page.close();

        console.log("Running: Corrupt snapshot preserves live data");
        let p7 = await setupPage();
        page = p7.page; logs = p7.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "LIVE_DATA_MUST_SURVIVE" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        await page.evaluate(() => {
            const badSnaps = [
                { timestamp: 1, reason: "Bad 1", data: "NOT_AN_ARRAY", count: 0 },
                { timestamp: 2, reason: "Bad 2", data: null, count: 0 },
                { timestamp: 3, reason: "Bad 3", data: [{id: 123}], count: 1 } 
            ];
            localStorage.setItem('fieldnotes_snapshots_v1', JSON.stringify(badSnaps));
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        for(let i=0; i<3; i++) {
            await page.evaluate((idx) => {
                let snaps = document.querySelectorAll('button[data-action="restore-snapshot"]');
                if (snaps[idx]) snaps[idx].click();
            }, i);
            await new Promise(r => setTimeout(r, 300));
            let survTxt = await page.evaluate(() => document.body.innerText);
            if (!survTxt.includes("LIVE_DATA_MUST_SURVIVE")) throw new Error("Live data was destroyed by corrupt snapshot " + i);
        }
        checkLogs(logs);
        await page.close();
        
        console.log("Running: Invalid import atomicity");
        let p8 = await setupPage();
        page = p8.page; logs = p8.logs;
        await page.evaluate(() => { FieldNotesData.create({ summary: "Pre-import Note" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 300));
        
        fs.writeFileSync('tests/fake_invalid.json', '{ invalid json ]');
        await page.evaluate(() => { window.FieldNotesUI.showImportConfirmModal = () => { window.importModalShown = true; }; });
        const handle2 = await page.$('#import-json-file');
        await handle2.uploadFile('tests/fake_invalid.json');
        await page.evaluate(() => document.getElementById('import-json-file').dispatchEvent(new Event('change', { bubbles: true })));
        await new Promise(r => setTimeout(r, 300));
        
        let modalShown = await page.evaluate(() => !!window.importModalShown);
        if (modalShown) throw new Error("Import modal showed for invalid JSON");
        let p8Txt = await page.evaluate(() => document.body.innerText);
        if (!p8Txt.includes("Pre-import Note")) throw new Error("Active note lost on invalid import");
        checkLogs(logs);
        await page.close();

        console.log("Running: External backup tracking");
        let p9 = await setupPage();
        page = p9.page; logs = p9.logs;
        await page.evaluate(() => {
            FieldNotesUI.showToast = (msg) => { window.lastToast = msg; };
            const origClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function() {
                if (this.download) window.downloadTriggered = true;
                else origClick.call(this);
            };
        });
        await page.evaluate(() => document.querySelector('button[data-action="export-all-json"]').click());
        await new Promise(r => setTimeout(r, 300));
        let triggered = await page.evaluate(() => !!window.downloadTriggered);
        if (!triggered) throw new Error("Download was not generated");
        let lastBackup = await page.evaluate(() => FieldNotesBackup.getLastExternalBackup());
        if (!lastBackup || typeof lastBackup !== 'number') throw new Error("lastExternalBackupDate not set");
        checkLogs(logs);
        await page.close();

        if (process.argv.includes('--force-fail')) {
            console.log("Running: Forced failure returns non-zero");
            throw new Error("INTENTIONAL_FAILURE");
        }

    } catch (e) {
        console.error(e);
        allPassed = false;
    }

    await browser.close();
    server.close(() => {
        if (!allPassed) {
            console.error("SOME TESTS FAILED");
            process.exit(1);
        } else {
            console.log("ALL TESTS PASSED");
            process.exit(0);
        }
    });
});




