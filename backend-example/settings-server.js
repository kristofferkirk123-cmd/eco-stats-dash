const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.SETTINGS_PORT || 3001;

// Initialize SQLite database for settings
const DB_FILE = path.join(__dirname, 'settings.db');
let db = null;
let dbInitialized = false;

// Initialize database tables
async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_FILE)) {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('Loaded existing settings database');
    } else {
      db = new SQL.Database();
      console.log('Created new settings database');
    }
    
    // Create settings tables
    db.run(`
      CREATE TABLE IF NOT EXISTS server_endpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
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
    
    // Create server history table
    db.run(`
      CREATE TABLE IF NOT EXISTS server_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        cpu_usage REAL,
        ram_usage REAL,
        gpu_usage REAL,
        temperature REAL,
        power REAL,
        network_in REAL,
        network_out REAL
      )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_history_server_time ON server_history(server_id, timestamp DESC)`);
    
    dbInitialized = true;
    console.log('Settings database initialized successfully');
    saveDatabase();
  } catch (error) {
    console.error('Failed to initialize settings database:', error);
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
      console.error('Failed to save settings database:', error);
    }
  }
}

// Save database periodically
setInterval(() => {
  if (dbInitialized) {
    saveDatabase();
  }
}, 60000);

process.on('exit', () => saveDatabase());
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit(0);
});
process.on('SIGINT', () => {
  saveDatabase();
  process.exit(0);
});

app.use(cors());
app.use(express.json());

// GET /api/settings/servers - Get all server endpoints
app.get('/api/settings/servers', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
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
    console.error('Failed to get servers:', error);
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
});

// POST /api/settings/servers - Add server endpoint
app.post('/api/settings/servers', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { id, name, url } = req.body;
  
  if (!id || !name || !url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const created_at = new Date().toISOString();
    db.run('INSERT INTO server_endpoints (id, name, url, created_at) VALUES (?, ?, ?, ?)', 
      [id, name, url, created_at]);
    saveDatabase();
    
    res.json({ id, name, url, created_at });
  } catch (error) {
    console.error('Failed to add server:', error);
    res.status(500).json({ error: 'Failed to add server' });
  }
});

// DELETE /api/settings/servers/:id - Remove server endpoint
app.delete('/api/settings/servers/:id', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { id } = req.params;
  
  try {
    db.run('DELETE FROM server_endpoints WHERE id = ?', [id]);
    saveDatabase();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// GET /api/settings/alerts - Get alert thresholds
app.get('/api/settings/alerts', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
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
    console.error('Failed to get alert thresholds:', error);
    res.status(500).json({ error: 'Failed to retrieve alert thresholds' });
  }
});

// POST /api/settings/alerts - Save alert thresholds
app.post('/api/settings/alerts', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
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
    console.error('Failed to save alert thresholds:', error);
    res.status(500).json({ error: 'Failed to save alert thresholds' });
  }
});

// GET /api/settings/notifications - Get notification settings
app.get('/api/settings/notifications', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  try {
    const result = db.exec('SELECT * FROM notifications ORDER BY id DESC LIMIT 1');
    const rows = result[0] ? result[0].values : [];
    
    if (rows.length === 0) {
      return res.json({});
    }
    
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
    console.error('Failed to get notification settings:', error);
    res.status(500).json({ error: 'Failed to retrieve notification settings' });
  }
});

// POST /api/settings/notifications - Save notification settings
app.post('/api/settings/notifications', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
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
    console.error('Failed to save notification settings:', error);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

// POST /api/history/:serverId - Store server history
app.post('/api/history/:serverId', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { serverId } = req.params;
  const { timestamp, cpu_usage, ram_usage, gpu_usage, temperature, power, network_in, network_out } = req.body;
  
  try {
    db.run(`INSERT INTO server_history 
      (server_id, timestamp, cpu_usage, ram_usage, gpu_usage, temperature, power, network_in, network_out)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [serverId, timestamp || Date.now(), cpu_usage, ram_usage, gpu_usage, temperature, power, network_in, network_out]);
    
    // Clean up old data (keep only last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    db.run('DELETE FROM server_history WHERE timestamp < ?', [sevenDaysAgo]);
    
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to store server history:', error);
    res.status(500).json({ error: 'Failed to store server history' });
  }
});

// GET /api/history/:serverId - Get server history
app.get('/api/history/:serverId', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { serverId } = req.params;
  const { hours = 24 } = req.query;
  
  try {
    const cutoffTime = Date.now() - (parseInt(hours) * 60 * 60 * 1000);
    const result = db.exec(`
      SELECT * FROM server_history 
      WHERE server_id = '${serverId}' AND timestamp > ${cutoffTime}
      ORDER BY timestamp ASC
    `);
    
    const rows = result[0] ? result[0].values : [];
    const history = rows.map(row => ({
      timestamp: row[2],
      cpu_usage: row[3],
      ram_usage: row[4],
      gpu_usage: row[5],
      temperature: row[6],
      power: row[7],
      network_in: row[8],
      network_out: row[9]
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Failed to retrieve server history:', error);
    res.status(500).json({ error: 'Failed to retrieve server history' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server after database initialization
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Settings API running on port ${PORT}`);
    console.log(`Database: ${DB_FILE}`);
  });
}).catch(error => {
  console.error('Failed to start settings server:', error);
  process.exit(1);
});
