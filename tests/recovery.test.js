const puppeteer = require('C:/temp/e2e/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Basic static server for testing
const PORT = 8766;
const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '..', req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
    }
    const ext = path.extname(filePath);
    const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
});

server.listen(PORT, async () => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    let logs = [];
    page.on('console', msg => { if (msg.type() === 'error') logs.push('[error] ' + msg.text()); });
    page.on('pageerror', error => logs.push('[error] ' + error.message));

    try {
        await page.goto('http://127.0.0.1:' + PORT + '/index.html');
        await new Promise(r => setTimeout(r, 1000));
        
        // 1. Create data
        await page.click('button[data-action="new"]');
        await new Promise(r => setTimeout(r, 200));
        await page.type('input[name="summary"]', 'CRITICAL_DATA');
        await page.click('button[type="submit"]'); 
        await new Promise(r => setTimeout(r, 200));
        
        // Go to list
        await page.evaluate(() => { FieldNotesUI.renderList(FieldNotesData.getAll(), "", FieldNotesPrefs.load()); });
        await new Promise(r => setTimeout(r, 200));

        // 2. Simulate neglected backup (Warning should appear)
        let warningHTML = await page.evaluate(() => {
            const el = document.querySelector('.privacy-banner');
            return el ? el.innerHTML : null;
        });
        if (!warningHTML || !warningHTML.includes('No external JSON backup found')) {
            throw new Error('Warning banner did not appear for neglected backup.');
        }

        // 3. Trigger external backup
        await page.click('button[data-action="export-all-json"]');
        await new Promise(r => setTimeout(r, 200));
        
        // 4. Reload and assert warning clears
        await page.evaluate(() => { FieldNotesUI.renderList(FieldNotesData.getAll(), "", FieldNotesPrefs.load()); });
        await new Promise(r => setTimeout(r, 200));
        warningHTML = await page.evaluate(() => {
            const el = document.querySelector('.privacy-banner');
            return el ? el.innerHTML : null;
        });
        // The privacy banner for data warning should be gone
        if (warningHTML && warningHTML.includes('Data Risk')) {
            throw new Error('Warning banner did not clear after export.');
        }

        // 5. Delete a note to trigger automatic snapshot
        page.on('dialog', async dialog => { await dialog.accept(); });
        await page.click('.note-card-link');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="edit"]');
        await new Promise(r => setTimeout(r, 200));
        await page.click('button[data-action="delete"]');
        await new Promise(r => setTimeout(r, 500));

        // Note should be gone
        let cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount !== 0) throw new Error('Note was not deleted.');

        // 6. Roll back via UI
        await page.evaluate(() => { FieldNotesUI.renderList(FieldNotesData.getAll(), "", FieldNotesPrefs.load()); });
        await new Promise(r => setTimeout(r, 200));
        
        let snapshots = await page.evaluate(() => document.querySelectorAll('.snapshot-list li').length);
        if (snapshots === 0) throw new Error('No snapshots found in UI.');

        await page.click('button[data-action="restore-snapshot"]');
        await new Promise(r => setTimeout(r, 500));

        // Note should be recovered
        cardCount = await page.evaluate(() => document.querySelectorAll('.note-card').length);
        if (cardCount === 0) throw new Error('Note was not recovered from snapshot.');
        
        const summary = await page.evaluate(() => document.querySelector('.card-top h3').innerText);
        if (summary !== 'CRITICAL_DATA') throw new Error('Recovered note data is corrupted.');

        console.log('--- ALL RECOVERY TESTS PASSED ---');
    } catch(e) {
        console.error('--- RECOVERY TEST FAILED ---', e);
    } finally {
        await browser.close();
        server.close();
    }
});


