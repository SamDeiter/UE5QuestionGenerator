const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const ROOT_DIR = path.resolve(__dirname, '..');
const TASK_FILE = path.join(ROOT_DIR, 'CURRENT_TASKS.md');
const ASSETS_DIR = path.join(ROOT_DIR, 'public', 'agent_assets');

// Ensure assets dir exists
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Serve the UI
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'dashboard.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading dashboard UI');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    // API: Get Tasks
    if (req.url === '/api/tasks' && req.method === 'GET') {
        fs.readFile(TASK_FILE, 'utf8', (err, data) => {
            if (err) data = "# New Queue";
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(data);
        });
        return;
    }

    // API: Update Tasks
    if (req.url === '/api/tasks' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            fs.writeFile(TASK_FILE, body, (err) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error saving');
                } else {
                    res.writeHead(200);
                    res.end('Saved');
                }
            });
        });
        return;
    }

    // API: Upload Image
    if (req.url === '/api/upload' && req.method === 'POST') {
        const boundary = req.headers['content-type'].split('boundary=')[1];
        let body = [];
        req.on('data', (chunk) => body.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(body);
            // Very basic multipart parser for single file
            const stringData = buffer.toString('latin1');
            const fileNameMatch = stringData.match(/filename="(.+?)"/);
            if (!fileNameMatch) {
                res.writeHead(400); 
                res.end('No filename found'); 
                return;
            }
            
            const fileName = `ref_${Date.now()}_${fileNameMatch[1]}`;
            // Locate start of file data (approximate for simple node server)
            const dataStart = stringData.indexOf('\r\n\r\n') + 4;
            const dataEnd = stringData.lastIndexOf(`\r\n--${boundary}`);
            
            const fileData = buffer.slice(dataStart, dataEnd);
            
            fs.writeFile(path.join(ASSETS_DIR, fileName), fileData, (err) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error saving file');
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    // Return the markdown reference
                    const mdRef = `![Reference Image](/agent_assets/${fileName})`;
                    res.end(JSON.stringify({ markdown: mdRef }));
                }
            });
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

console.log(`🚀 Mission Control running at http://localhost:${PORT}`);
server.listen(PORT);