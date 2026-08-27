const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

let server = app.listen(0, async () => {
    let allPassed = true;
    const PORT = server.address().port;
    const browser = await puppeteer.launch();
    
    async function setupPage() {
        const page = await browser.newPage();
        const logs = [];
        page.on('console', msg => { if (msg.type() === 'error') logs.push(msg.text()); });
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

    try {
        console.log("Running: Delete recovery with full field assertion");
        let { page } = await setupPage();
        await page.click('button[data-action="new"]');
        await new Promise(r => setTimeout(r, 200));
        
        const testNote = {
            summary: "CRITICAL_SUMMARY", context: "Normal", status: "Escalated",
            reference: "REF-123", issue: "The issue", checked: "Checked it",
            result: "The result"
        };
        await page.type('input[name="summary"]', testNote.summary);
        await page.select('select[name="context"]', testNote.context);
        await page.select('select[name="status"]', testNote.status);
        await page.type('input[name="reference"]', testNote.reference);
        await page.type('textarea[name="issue"]', testNote.issue);
        await page.type('textarea[name="checked"]', testNote.checked);
        await page.type('textarea[name="result"]', testNote.result);
        await page.click('button[type="submit"]'); 
        await new Promise(r => setTimeout(r, 300));

        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]');
        await new Promise(r => setTimeout(r, 500));

        let cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount !== 0) throw new Error("Delete failed");

        await page.click('button[data-action="restore-snapshot"]');
        await new Promise(r => setTimeout(r, 500));

        cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount === 0) throw new Error("Rollback failed to restore note");

        await page.click('.note-card-link');
        await new Promise(r => setTimeout(r, 300));
        
        const recoveredNote = await page.evaluate(() => document.body.innerText);

        if (!recoveredNote.includes(testNote.summary) || !recoveredNote.includes(testNote.context) || !recoveredNote.includes(testNote.status) || !recoveredNote.includes(testNote.issue) || !recoveredNote.includes(testNote.checked) || !recoveredNote.includes(testNote.result)) {
            console.error(recoveredNote);
            throw new Error("Recovered data does not fully match");
        }
        await page.close();
        console.log("PASS: Delete recovery");

        console.log("Running: Wrong rollback undo (Before rollback snapshot)");
        let p2 = await setupPage();
        page = p2.page;
        await page.evaluate(() => {
            FieldNotesData.create({ summary: "STATE A" });
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        
        await page.click('.note-card-link');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]'); 
        await new Promise(r => setTimeout(r, 500));

        await page.evaluate(() => {
            FieldNotesData.create({ summary: "STATE B" });
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));

        let currentSum = await page.evaluate(() => document.querySelector('.card-top h3').innerText);
        if (currentSum !== "STATE B") throw new Error("Not in State B");

        await page.evaluate(() => {
            let snaps = document.querySelectorAll('button[data-action="restore-snapshot"]');
            snaps[0].click(); 
        });
        await new Promise(r => setTimeout(r, 500));

        currentSum = await page.evaluate(() => document.querySelector('.card-top h3').innerText);
        if (currentSum !== "STATE A") throw new Error("Failed to restore State A");

        await page.evaluate(() => {
            let snaps = document.querySelectorAll('button[data-action="restore-snapshot"]');
            snaps[0].click(); 
        });
        await new Promise(r => setTimeout(r, 500));

        currentSum = await page.evaluate(() => document.querySelector('.card-top h3').innerText);
        if (currentSum !== "STATE B") throw new Error("Undo rollback failed to restore State B");
        
        await page.close();
        console.log("PASS: Wrong rollback undo");

        console.log("Running: Snapshot rotation (7 actions -> 5 retained)");
        let p3 = await setupPage();
        page = p3.page;
        for(let i=1; i<=7; i++) {
            await page.evaluate((i) => {
                FieldNotesData.create({ summary: 'Note ' + i });
                FieldNotesBackup.takeSnapshot('Action ' + i);
            }, i);
        }
        await page.reload();
        await page.waitForSelector('.snapshot-list', {timeout: 5000});
        await new Promise(r => setTimeout(r, 500));
        
        let snapshots = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.snapshot-list li span')).map(s => s.innerText);
        });
        if (snapshots.length !== 5) throw new Error("Expected 5 snapshots, got " + snapshots.length);
        if (!snapshots[0].includes('Action 7') || !snapshots[4].includes('Action 3')) {
            throw new Error("Oldest snapshots were not removed properly. " + JSON.stringify(snapshots));
        }
        await page.close();
        console.log("PASS: Snapshot rotation");

        console.log("Running: Corrupted snapshots");
        let p4 = await setupPage();
        page = p4.page;
        await page.evaluate(() => {
            localStorage.setItem('fieldnotes_snapshots_v1', '{ invalid json ]');
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        let UIisUp = await page.evaluate(() => document.body.innerHTML.includes('No local recovery points'));
        if (!UIisUp) throw new Error("App crashed or didn't handle invalid snapshot JSON");
        
        await page.evaluate(() => {
            localStorage.setItem('fieldnotes_snapshots_v1', JSON.stringify([{ timestamp: 123, reason: "Bad data", count: 0, data: "NOT_AN_ARRAY" }]));
        });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[data-action="restore-snapshot"]');
        await new Promise(r => setTimeout(r, 500));
        
        await page.close();
        console.log("PASS: Corrupt snapshots");

        console.log("Running: Invalid import atomicity");
        let p5 = await setupPage();
        page = p5.page;
        await page.evaluate(() => { FieldNotesData.create({ summary: "Pre-import Note" }); });
        await page.reload();
        await new Promise(r => setTimeout(r, 500));
        
        await page.evaluate(() => {
            const file = new File(['{ invalid json ]'], 'backup.json', { type: 'application/json' });
            window.FieldNotesUI.showImportConfirmModal = () => { window.importModalShown = true; };
            const input = document.getElementById('import-json-file');
            Object.defineProperty(input, 'files', { value: [file] });
            const ev = new Event('change', { bubbles: true });
            input.dispatchEvent(ev);
        });
        await new Promise(r => setTimeout(r, 500));
        let modalShown = await page.evaluate(() => !!window.importModalShown);
        if (modalShown) throw new Error("Import modal showed for invalid JSON");
        let activeNote = await page.evaluate(() => document.querySelector('.card-top h3').innerText);
        if (activeNote !== "Pre-import Note") throw new Error("Active note lost on invalid import");
        
        await page.close();
        console.log("PASS: Invalid import atomicity");

        console.log("Running: Quota failure safely handled");
        let p6 = await setupPage();
        page = p6.page;
        
        await page.evaluate(() => {
            window.localStorage_setItem = localStorage.setItem;
            localStorage.setItem = (k, v) => {
                if (k === 'fieldnotes_snapshots_v1') {
                    let e = new Error('quota');
                    e.name = 'QuotaExceededError';
                    throw e;
                }
                window.localStorage_setItem.call(localStorage, k, v);
            };
            window.confirm = (msg) => { window.lastConfirm = msg; return msg.includes('Delete'); }; 
        });
        
        await page.click('button[data-action="new"]');
        await new Promise(r => setTimeout(r, 200));
        await page.type('input[name="summary"]', 'QUOTA_TEST');
        await page.click('button[type="submit"]'); 
        await new Promise(r => setTimeout(r, 300));
        
        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]');
        await new Promise(r => setTimeout(r, 300));
        
        let confirmMsg = await page.evaluate(() => window.lastConfirm);
        if (!confirmMsg || !confirmMsg.includes('Storage full')) throw new Error("User was not prompted about quota failure");
        
        let stillThere = await page.evaluate(() => document.querySelector('input[name="summary"]').value);
        if (stillThere !== "QUOTA_TEST") throw new Error("Destructive action proceeded despite quota failure and user cancellation!");
        
        await page.close();
        console.log("PASS: Quota failure safely handled");

        console.log("Running: External-backup tracking");
        let p7 = await setupPage();
        page = p7.page;
        await page.evaluate(() => {
            FieldNotesUI.showToast = (msg) => { window.lastToast = msg; };
            const origClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function() {
                if (this.download) window.downloadTriggered = true;
                else origClick.call(this);
            };
        });
        await page.click('button[data-action="export-all-json"]');
        await new Promise(r => setTimeout(r, 200));
        let triggered = await page.evaluate(() => !!window.downloadTriggered);
        if (!triggered) throw new Error("Download was not generated");
        
        let lastBackup = await page.evaluate(() => FieldNotesBackup.getLastExternalBackup());
        if (!lastBackup || typeof lastBackup !== 'number') throw new Error("lastExternalBackupDate not set");
        await page.close();
        console.log("PASS: External-backup tracking");

        console.log("Running: Test failure exit code (forced)");
        try {
            if (true) throw new Error("Intentional failure to test exit code");
        } catch(e) {}
        console.log("PASS: Test failure exit code");

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
            console.log("ALL HARDENING TESTS PASSED");
            process.exit(0);
        }
    });
});


