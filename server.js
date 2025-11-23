/**
 * Production Server
 * Serves the built React app and provides SQLite storage for settings
 * Run with: node server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'settings.db');

let db = null;
let dbInitialized = false;

// Initialize SQLite database
async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(DB_FILE)) {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('✓ Loaded existing settings database');
    } else {
      db = new SQL.Database();
      console.log('✓ Created new settings database');
    }
    
    // Server endpoints table
    db.run(`
      CREATE TABLE IF NOT EXISTS server_endpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
    // Alert thresholds table
    db.run(`
      CREATE TABLE IF NOT EXISTS alert_thresholds (
        id INTEGER PRIMARY KEY,
        cpu INTEGER NOT NULL,
        ram INTEGER NOT NULL,
        gpu INTEGER NOT NULL,
        temperature INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY,
        smtp_host TEXT,
        smtp_port TEXT,
        smtp_user TEXT,
        smtp_pass TEXT,
        smtp_from TEXT,
        alert_email TEXT,
        slack_webhook TEXT,
        discord_webhook TEXT,
        updated_at TEXT NOT NULL
      )
    `);
    
    dbInitialized = true;
    console.log('✓ Database initialized');
    saveDatabase();
  } catch (error) {
    console.error('✗ Failed to initialize database:', error);
    throw error;
  }
}

// Save database to disk
function saveDatabase() {
  if (db && dbInitialized) {
    try {
      const data = db.export();
      fs.writeFileSync(DB_FILE, data);
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }
}

// Save periodically
setInterval(() => {
  if (dbInitialized) saveDatabase();
}, 60000);

process.on('exit', () => saveDatabase());
process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });
process.on('SIGINT', () => { saveDatabase(); process.exit(0); });

app.use(cors());
app.use(express.json());

// API Routes for settings
app.get('/api/settings/servers', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  try {
    const result = db.exec('SELECT * FROM server_endpoints ORDER BY created_at ASC');
    const rows = result[0] ? result[0].values : [];
    const servers = rows.map(row => ({
      id: row[0],
      name: row[1],
      url: row[2],
      created_at: row[3]
    }));
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
});

app.post('/api/settings/servers', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  const { id, name, url } = req.body;
  if (!id || !name || !url) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    const created_at = new Date().toISOString();
    db.run('INSERT INTO server_endpoints (id, name, url, created_at) VALUES (?, ?, ?, ?)', 
      [id, name, url, created_at]);
    saveDatabase();
    res.json({ id, name, url, created_at });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add server' });
  }
});

app.delete('/api/settings/servers/:id', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  try {
    db.run('DELETE FROM server_endpoints WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

app.get('/api/settings/alerts', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  try {
    const result = db.exec('SELECT * FROM alert_thresholds ORDER BY id DESC LIMIT 1');
    const rows = result[0] ? result[0].values : [];
    
    if (rows.length === 0) {
      return res.json({ cpu: 80, ram: 80, gpu: 80, temperature: 80 });
    }
    
    const row = rows[0];
    res.json({
      cpu: row[1],
      ram: row[2],
      gpu: row[3],
      temperature: row[4],
      updated_at: row[5]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve alert thresholds' });
  }
});

app.post('/api/settings/alerts', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  const { cpu, ram, gpu, temperature } = req.body;
  if (cpu === undefined || ram === undefined || gpu === undefined || temperature === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const updated_at = new Date().toISOString();
    db.run('INSERT INTO alert_thresholds (cpu, ram, gpu, temperature, updated_at) VALUES (?, ?, ?, ?, ?)',
      [cpu, ram, gpu, temperature, updated_at]);
    saveDatabase();
    res.json({ cpu, ram, gpu, temperature, updated_at });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save alert thresholds' });
  }
});

app.get('/api/settings/notifications', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  try {
    const result = db.exec('SELECT * FROM notifications ORDER BY id DESC LIMIT 1');
    const rows = result[0] ? result[0].values : [];
    
    if (rows.length === 0) return res.json({});
    
    const row = rows[0];
    res.json({
      smtp_host: row[1],
      smtp_port: row[2],
      smtp_user: row[3],
      smtp_pass: row[4],
      smtp_from: row[5],
      alert_email: row[6],
      slack_webhook: row[7],
      discord_webhook: row[8],
      updated_at: row[9]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve notification settings' });
  }
});

app.post('/api/settings/notifications', (req, res) => {
  if (!dbInitialized) return res.status(503).json({ error: 'Database not ready' });
  
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, alert_email, slack_webhook, discord_webhook } = req.body;
  
  try {
    const updated_at = new Date().toISOString();
    db.run(`INSERT INTO notifications 
      (smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, alert_email, slack_webhook, discord_webhook, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, alert_email, slack_webhook, discord_webhook, updated_at]);
    saveDatabase();
    res.json({ success: true, updated_at });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

// Serve static files from dist folder in production
app.use(express.static(path.join(__dirname, 'dist')));

// All other routes serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Server Monitor Dashboard             ║
╚════════════════════════════════════════╝

✓ Server running on port ${PORT}
✓ Frontend: http://localhost:${PORT}
✓ Settings API: http://localhost:${PORT}/api/settings
✓ Database: ${DB_FILE}

Ready to accept connections!
    `);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
