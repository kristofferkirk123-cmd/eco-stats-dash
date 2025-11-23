const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const DB_FILE = path.join(__dirname, 'metrics.db');
let db = null;
let dbInitialized = false;

const SERVER_ID_FILE = path.join(__dirname, '.server-id');
let cachedServerName = null;
let lastDnsUpdate = 0;
const DNS_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Alert configuration
const ALERT_THRESHOLDS = {
  cpu: parseInt(process.env.ALERT_CPU_THRESHOLD) || 90,
  ram: parseInt(process.env.ALERT_RAM_THRESHOLD) || 90,
  gpu: parseInt(process.env.ALERT_GPU_THRESHOLD) || 90,
  temp: parseInt(process.env.ALERT_TEMP_THRESHOLD) || 85,
};

const alertState = {}; // Track alert states to avoid spam

// Initialize database tables
async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_FILE)) {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
    
    // Create metrics table
    db.run(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        server_id TEXT NOT NULL,
        server_name TEXT NOT NULL,
        hostname TEXT,
        os TEXT,
        status TEXT,
        uptime INTEGER,
        last_seen TEXT,
        cpu_usage REAL,
        cpu_temp REAL,
        cpu_cores INTEGER,
        ram_used REAL,
        ram_total REAL,
        ram_temp REAL,
        gpu_usage REAL,
        gpu_temp REAL,
        gpu_memory REAL,
        power_total REAL,
        power_cpu REAL,
        power_gpu REAL,
        power_ram REAL,
        power_storage REAL,
        power_other REAL,
        network_in REAL,
        network_out REAL
      )
    `);
    
    // Create index for faster queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_server_timestamp ON metrics(server_id, timestamp DESC)`);
    
    // Create alerts table
    db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        server_id TEXT NOT NULL,
        server_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL
      )
    `);
    
    // Create index for alerts
    db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_server_timestamp ON alerts(server_id, timestamp DESC)`);
    
    // Clean up old data (keep only last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    db.run('DELETE FROM metrics WHERE timestamp < ?', [sevenDaysAgo]);
    db.run('DELETE FROM alerts WHERE timestamp < ?', [new Date(sevenDaysAgo).toISOString()]);
    
    dbInitialized = true;
    console.log('Database initialized successfully');
    saveDatabase(); // Save initial state
  } catch (error) {
    console.error('Failed to initialize database:', error);
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

// Save database periodically (every minute)
setInterval(() => {
  if (dbInitialized) {
    saveDatabase();
  }
}, 60000);

// Save on exit
process.on('exit', () => {
  saveDatabase();
});

process.on('SIGTERM', () => {
  saveDatabase();
  process.exit(0);
});

app.use(cors());
app.use(express.json());

// Generate or load persistent server ID
function getServerId() {
  try {
    if (fs.existsSync(SERVER_ID_FILE)) {
      return fs.readFileSync(SERVER_ID_FILE, 'utf8').trim();
    }
    
    // Generate new random ID
    const newId = `srv-${crypto.randomBytes(8).toString('hex')}`;
    fs.writeFileSync(SERVER_ID_FILE, newId, 'utf8');
    console.log(`Generated new server ID: ${newId}`);
    return newId;
  } catch (error) {
    console.error('Error managing server ID:', error);
    return `srv-${os.hostname()}`;
  }
}

// Get server name from reverse DNS lookup
async function getServerName() {
  const now = Date.now();
  
  // Use cached value if recent
  if (cachedServerName && (now - lastDnsUpdate) < DNS_UPDATE_INTERVAL) {
    return cachedServerName;
  }
  
  try {
    const networkInterfaces = os.networkInterfaces();
    
    // Find first public IPv4 address
    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          try {
            const hostnames = await dns.reverse(addr.address);
            if (hostnames && hostnames.length > 0) {
              cachedServerName = hostnames[0];
              lastDnsUpdate = now;
              console.log(`Updated server name from DNS: ${cachedServerName}`);
              return cachedServerName;
            }
          } catch (err) {
            // DNS lookup failed, continue to next address
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during DNS lookup:', error);
  }
  
  // Fallback to hostname
  cachedServerName = os.hostname();
  lastDnsUpdate = now;
  return cachedServerName;
}

// Send email alert
async function sendEmailAlert(subject, message) {
  if (!process.env.SMTP_HOST) return;
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL,
      subject: `[Server Alert] ${subject}`,
      text: message,
      html: `<pre>${message}</pre>`,
    });
    
    console.log(`Email alert sent: ${subject}`);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

// Send Slack alert
async function sendSlackAlert(message) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `🚨 *Server Alert*\n\`\`\`${message}\`\`\``,
    });
    console.log('Slack alert sent');
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

// Send Discord alert
async function sendDiscordAlert(message) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `🚨 **Server Alert**\n\`\`\`${message}\`\`\``,
    });
    console.log('Discord alert sent');
  } catch (error) {
    console.error('Failed to send Discord alert:', error);
  }
}

// Send alert through all configured channels
async function sendAlert(subject, message, serverId, serverName, alertType, severity = 'warning') {
  const fullMessage = `${subject}\n\n${message}\nTime: ${new Date().toISOString()}`;
  
  // Store alert in database
  if (dbInitialized) {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    try {
      db.run(`
        INSERT INTO alerts (id, timestamp, server_id, server_name, subject, message, alert_type, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [alertId, timestamp, serverId, serverName, subject, message, alertType, severity]);
      saveDatabase();
    } catch (error) {
      console.error('Failed to store alert in database:', error);
    }
  }
  
  await Promise.all([
    sendEmailAlert(subject, fullMessage),
    sendSlackAlert(fullMessage),
    sendDiscordAlert(fullMessage),
  ]);
}

// Check thresholds and send alerts
async function checkAlerts(metrics) {
  const serverId = metrics.id;
  const serverName = metrics.name;
  
  if (!alertState[serverId]) {
    alertState[serverId] = {};
  }
  
  // Check CPU threshold
  if (metrics.metrics.cpu.usage > ALERT_THRESHOLDS.cpu) {
    if (!alertState[serverId].cpu) {
      await sendAlert(
        `High CPU Usage on ${serverName}`,
        `Server: ${serverName} (${serverId})\nCPU Usage: ${metrics.metrics.cpu.usage}%\nThreshold: ${ALERT_THRESHOLDS.cpu}%`,
        serverId,
        serverName,
        'cpu',
        'error'
      );
      alertState[serverId].cpu = true;
    }
  } else {
    alertState[serverId].cpu = false;
  }
  
  // Check RAM threshold
  const ramUsagePercent = (metrics.metrics.ram.used / metrics.metrics.ram.total) * 100;
  if (ramUsagePercent > ALERT_THRESHOLDS.ram) {
    if (!alertState[serverId].ram) {
      await sendAlert(
        `High RAM Usage on ${serverName}`,
        `Server: ${serverName} (${serverId})\nRAM Usage: ${ramUsagePercent.toFixed(1)}%\nThreshold: ${ALERT_THRESHOLDS.ram}%`,
        serverId,
        serverName,
        'ram',
        'error'
      );
      alertState[serverId].ram = true;
    }
  } else {
    alertState[serverId].ram = false;
  }
  
  // Check GPU threshold (if available)
  if (metrics.metrics.gpu && metrics.metrics.gpu.usage > ALERT_THRESHOLDS.gpu) {
    if (!alertState[serverId].gpu) {
      await sendAlert(
        `High GPU Usage on ${serverName}`,
        `Server: ${serverName} (${serverId})\nGPU Usage: ${metrics.metrics.gpu.usage}%\nThreshold: ${ALERT_THRESHOLDS.gpu}%`,
        serverId,
        serverName,
        'gpu',
        'error'
      );
      alertState[serverId].gpu = true;
    }
  } else {
    alertState[serverId].gpu = false;
  }
  
  // Check temperature threshold
  if (metrics.metrics.cpu.temp > ALERT_THRESHOLDS.temp) {
    if (!alertState[serverId].temp) {
      await sendAlert(
        `High Temperature on ${serverName}`,
        `Server: ${serverName} (${serverId})\nCPU Temperature: ${metrics.metrics.cpu.temp}°C\nThreshold: ${ALERT_THRESHOLDS.temp}°C`,
        serverId,
        serverName,
        'temperature',
        'warning'
      );
      alertState[serverId].temp = true;
    }
  } else {
    alertState[serverId].temp = false;
  }
  
  // Check if server is throttled
  if (metrics.status === 'throttled') {
    if (!alertState[serverId].throttled) {
      await sendAlert(
        `Server Throttling Detected on ${serverName}`,
        `Server: ${serverName} (${serverId})\nStatus: ${metrics.status}\nCPU: ${metrics.metrics.cpu.usage}%\nTemp: ${metrics.metrics.cpu.temp}°C`,
        serverId,
        serverName,
        'throttled',
        'warning'
      );
      alertState[serverId].throttled = true;
    }
  } else {
    alertState[serverId].throttled = false;
  }
}

// Collect current metrics
async function collectMetrics() {
  try {
    const [cpu, mem, currentLoad, fsSize, networkStats, graphics, osInfo, time] = await Promise.all([
      si.cpuTemperature().catch(() => ({ main: null })),
      si.mem().catch(() => ({ active: 0, total: 1, temperature: null })),
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.fsSize().catch(() => []),
      si.networkStats().catch(() => []),
      si.graphics().catch(() => ({ controllers: [] })),
      si.osInfo().catch(() => ({ distro: 'Unknown', release: '' })),
      si.time().catch(() => ({}))
    ]);

    const cpuInfo = await si.cpu().catch(() => ({ cores: os.cpus().length }));
    const gpuInfo = graphics.controllers && graphics.controllers[0];
    
    // Get memory info with fallbacks
    const memActive = mem.active || 0;
    const memTotal = mem.total || (os.totalmem() || 1);
    const memUsedGB = Math.round(memActive / 1024 / 1024 / 1024);
    const memTotalGB = Math.round(memTotal / 1024 / 1024 / 1024);
    
    // Get CPU usage with fallback
    const cpuUsage = currentLoad && currentLoad.currentLoad ? Math.round(currentLoad.currentLoad) : 0;
    const cpuTemp = (cpu && cpu.main) || null;
    
    // Calculate power estimates (adjust these multipliers based on your hardware)
    const cpuPower = Math.round(cpuUsage * 1.5); // Rough estimate
    const gpuPower = gpuInfo && gpuInfo.memoryUsed && gpuInfo.memoryTotal 
      ? Math.round((gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 200) 
      : 0;
    const ramPower = Math.round((memActive / memTotal) * 50);
    const storagePower = 20; // Static estimate
    const otherPower = 15; // Static estimate

    const metrics = {
      id: getServerId(),
      name: await getServerName(),
      hostname: os.hostname(),
      os: `${osInfo.distro || 'Unknown'} ${osInfo.release || ''}`.trim(),
      status: 'online',
      uptime: os.uptime(),
      lastSeen: new Date().toISOString(),
      metrics: {
        cpu: {
          usage: cpuUsage,
          temp: cpuTemp,
          cores: cpuInfo.cores || os.cpus().length
        },
        ram: {
          used: memUsedGB,
          total: memTotalGB,
          temp: (mem && mem.temperature) || null
        },
        gpu: gpuInfo && gpuInfo.memoryTotal ? {
          usage: Math.round((gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 100) || 0,
          temp: gpuInfo.temperatureGpu || null,
          memory: Math.round(gpuInfo.memoryTotal / 1024) || 0
        } : undefined,
        power: {
          total: cpuPower + gpuPower + ramPower + storagePower + otherPower,
          cpu: cpuPower,
          gpu: gpuPower,
          ram: ramPower,
          storage: storagePower,
          other: otherPower
        },
        network: {
          in: Math.round((networkStats[0]?.rx_sec || 0) / 1024),
          out: Math.round((networkStats[0]?.tx_sec || 0) / 1024)
        }
      }
    };

    // Detect throttling
    if ((cpuTemp && cpuTemp > 85) || cpuUsage > 90) {
      metrics.status = 'throttled';
    }

    return metrics;
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return null;
  }
}

// Store metrics in SQLite database
function storeMetrics(metrics) {
  if (!dbInitialized) return;
  
  try {
    const timestamp = Date.now();
    const gpu = metrics.metrics.gpu;
    
    db.run(`
      INSERT INTO metrics (
        timestamp, server_id, server_name, hostname, os, status, uptime, last_seen,
        cpu_usage, cpu_temp, cpu_cores,
        ram_used, ram_total, ram_temp,
        gpu_usage, gpu_temp, gpu_memory,
        power_total, power_cpu, power_gpu, power_ram, power_storage, power_other,
        network_in, network_out
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      timestamp,
      metrics.id,
      metrics.name,
      metrics.hostname,
      metrics.os,
      metrics.status,
      metrics.uptime,
      metrics.lastSeen,
      metrics.metrics.cpu.usage,
      metrics.metrics.cpu.temp,
      metrics.metrics.cpu.cores,
      metrics.metrics.ram.used,
      metrics.metrics.ram.total,
      metrics.metrics.ram.temp,
      gpu ? gpu.usage : null,
      gpu ? gpu.temp : null,
      gpu ? gpu.memory : null,
      metrics.metrics.power.total,
      metrics.metrics.power.cpu,
      metrics.metrics.power.gpu,
      metrics.metrics.power.ram,
      metrics.metrics.power.storage,
      metrics.metrics.power.other,
      metrics.metrics.network.in,
      metrics.metrics.network.out
    ]);
  } catch (error) {
    console.error('Failed to store metrics in database:', error);
  }
}

// GET /metrics - Current metrics for all servers
app.get('/metrics', async (req, res) => {
  const metrics = await collectMetrics();
  if (metrics) {
    storeMetrics(metrics);
    res.json({ servers: [metrics] });
  } else {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// GET /history/:serverId - Historical data
app.get('/history/:serverId', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { serverId } = req.params;
  const { period = '24h' } = req.query;
  
  try {
    // Parse period (24h, 12h, 1h, etc.)
    const hours = parseInt(period) || 24;
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    const result = db.exec(`
      SELECT * FROM metrics 
      WHERE server_id = '${serverId}' AND timestamp > ${cutoffTime}
      ORDER BY timestamp ASC
    `);
    
    const rows = result[0] ? result[0].values : [];
    
    // Transform database rows back to original format
    const data = rows.map(row => ({
      timestamp: row[1],
      id: row[2],
      name: row[3],
      hostname: row[4],
      os: row[5],
      status: row[6],
      uptime: row[7],
      lastSeen: row[8],
      metrics: {
        cpu: {
          usage: row[9],
          temp: row[10],
          cores: row[11]
        },
        ram: {
          used: row[12],
          total: row[13],
          temp: row[14]
        },
        gpu: row[15] !== null ? {
          usage: row[15],
          temp: row[16],
          memory: row[17]
        } : undefined,
        power: {
          total: row[18],
          cpu: row[19],
          gpu: row[20],
          ram: row[21],
          storage: row[22],
          other: row[23]
        },
        network: {
          in: row[24],
          out: row[25]
        }
      }
    }));
    
    res.json({
      serverId,
      period,
      data
    });
  } catch (error) {
    console.error('Failed to retrieve history:', error);
    res.status(500).json({ error: 'Failed to retrieve historical data' });
  }
});

// GET /predictions/:serverId - Health predictions
app.get('/predictions/:serverId', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { serverId } = req.params;
  
  try {
    // Get last 100 data points for analysis
    const result = db.exec(`
      SELECT * FROM metrics 
      WHERE server_id = '${serverId}'
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    
    const rows = result[0] ? result[0].values : [];
    
    if (rows.length < 10) {
      return res.json({
        serverId,
        predictions: [],
        message: 'Insufficient data for predictions. Need at least 10 data points.'
      });
    }
    
    // Transform to original format for analysis
    const history = rows.reverse().map(row => ({
      timestamp: row[1],
      metrics: {
        cpu: { usage: row[9], temp: row[10] },
        ram: { used: row[12], total: row[13] }
      }
    }));
    
    const predictions = analyzeTrends(history, serverId);
    res.json({
      serverId,
      predictions,
      analyzedPoints: history.length
    });
  } catch (error) {
    console.error('Failed to generate predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Analyze trends and predict issues
function analyzeTrends(history, serverId) {
  const predictions = [];
  const recentData = history.slice(-100); // Last 100 data points
  
  // Analyze CPU trend
  const cpuTrend = calculateTrend(recentData.map(d => d.metrics.cpu.usage));
  if (cpuTrend.slope > 0.5 && cpuTrend.average > 70) {
    const hoursToThreshold = Math.round((ALERT_THRESHOLDS.cpu - cpuTrend.average) / cpuTrend.slope / 12);
    predictions.push({
      type: 'cpu',
      severity: 'warning',
      message: `CPU usage trending upward. May reach ${ALERT_THRESHOLDS.cpu}% in ~${hoursToThreshold} hours`,
      currentValue: Math.round(cpuTrend.average),
      trend: 'increasing',
      confidence: cpuTrend.confidence
    });
  }
  
  // Analyze RAM trend
  const ramTrend = calculateTrend(recentData.map(d => (d.metrics.ram.used / d.metrics.ram.total) * 100));
  if (ramTrend.slope > 0.3 && ramTrend.average > 70) {
    const hoursToThreshold = Math.round((ALERT_THRESHOLDS.ram - ramTrend.average) / ramTrend.slope / 12);
    predictions.push({
      type: 'ram',
      severity: 'warning',
      message: `RAM usage trending upward. May reach ${ALERT_THRESHOLDS.ram}% in ~${hoursToThreshold} hours`,
      currentValue: Math.round(ramTrend.average),
      trend: 'increasing',
      confidence: ramTrend.confidence
    });
  }
  
  // Analyze temperature trend
  const tempTrend = calculateTrend(recentData.map(d => d.metrics.cpu.temp));
  if (tempTrend.slope > 0.2 && tempTrend.average > 70) {
    const hoursToThreshold = Math.round((ALERT_THRESHOLDS.temp - tempTrend.average) / tempTrend.slope / 12);
    predictions.push({
      type: 'temperature',
      severity: tempTrend.average > 75 ? 'error' : 'warning',
      message: `Temperature trending upward. May reach ${ALERT_THRESHOLDS.temp}°C in ~${hoursToThreshold} hours`,
      currentValue: Math.round(tempTrend.average),
      trend: 'increasing',
      confidence: tempTrend.confidence
    });
  }
  
  // Check for memory leak patterns
  const ramValues = recentData.map(d => d.metrics.ram.used);
  if (isMemoryLeakPattern(ramValues)) {
    predictions.push({
      type: 'memory_leak',
      severity: 'error',
      message: 'Possible memory leak detected. RAM usage steadily increasing without plateau',
      currentValue: Math.round(ramValues[ramValues.length - 1]),
      trend: 'increasing',
      confidence: 'high'
    });
  }
  
  return predictions;
}

// Calculate linear trend
function calculateTrend(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, average: 0, confidence: 'low' };
  
  const xValues = values.map((_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const average = sumY / n;
  
  // Calculate R-squared for confidence
  const yMean = average;
  const yPredicted = xValues.map(x => (slope * x) + (yMean - slope * (n - 1) / 2));
  const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0);
  const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const rSquared = 1 - (ssRes / ssTot);
  
  const confidence = rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low';
  
  return { slope, average, confidence };
}

// Detect memory leak pattern
function isMemoryLeakPattern(values) {
  if (values.length < 20) return false;
  
  const trend = calculateTrend(values);
  
  // Memory leak indicators:
  // 1. Consistent upward trend (positive slope)
  // 2. High confidence (R-squared > 0.8)
  // 3. No significant drops (max drop < 10% of range)
  const maxDrop = Math.max(...values.slice(0, -1).map((v, i) => v - values[i + 1]));
  const range = Math.max(...values) - Math.min(...values);
  
  return trend.slope > 0.1 && 
         trend.confidence === 'high' && 
         maxDrop < range * 0.1;
}

// GET /alerts - Alert history
app.get('/alerts', (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
  const { serverId, limit = 100 } = req.query;
  
  try {
    let query = 'SELECT * FROM alerts';
    
    if (serverId) {
      query += ` WHERE server_id = '${serverId}'`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${parseInt(limit)}`;
    
    const result = db.exec(query);
    const rows = result[0] ? result[0].values : [];
    
    const alerts = rows.map(row => ({
      id: row[0],
      timestamp: row[1],
      server_id: row[2],
      server_name: row[3],
      subject: row[4],
      message: row[5],
      alert_type: row[6],
      severity: row[7]
    }));
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM alerts';
    if (serverId) {
      countQuery += ` WHERE server_id = '${serverId}'`;
    }
    
    const countResult = db.exec(countQuery);
    const total = countResult[0] ? countResult[0].values[0][0] : 0;
    
    res.json({ alerts, total });
  } catch (error) {
    console.error('Failed to retrieve alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start collecting metrics every 5 seconds
setInterval(async () => {
  const metrics = await collectMetrics();
  if (metrics) {
    storeMetrics(metrics);
    await checkAlerts(metrics);
  }
}, 5000);

// Periodically refresh DNS name
setInterval(async () => {
  await getServerName();
}, DNS_UPDATE_INTERVAL);

// Start server after database initialization
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server monitoring API running on port ${PORT}`);
    console.log(`Server ID: ${getServerId()}`);
    console.log(`Database: ${DB_FILE}`);
    getServerName().then(name => console.log(`Server Name: ${name}`));
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  saveDatabase();
  if (db) db.close();
  process.exit(0);
});
