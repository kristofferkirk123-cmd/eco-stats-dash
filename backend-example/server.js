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

const app = express();
const PORT = process.env.PORT || 3000;

// Store historical metrics (in production, use a database)
const metricsHistory = {};
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
async function sendAlert(subject, message) {
  const fullMessage = `${subject}\n\n${message}\nTime: ${new Date().toISOString()}`;
  
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
        `Server: ${serverName} (${serverId})\nCPU Usage: ${metrics.metrics.cpu.usage}%\nThreshold: ${ALERT_THRESHOLDS.cpu}%`
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
        `Server: ${serverName} (${serverId})\nRAM Usage: ${ramUsagePercent.toFixed(1)}%\nThreshold: ${ALERT_THRESHOLDS.ram}%`
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
        `Server: ${serverName} (${serverId})\nGPU Usage: ${metrics.metrics.gpu.usage}%\nThreshold: ${ALERT_THRESHOLDS.gpu}%`
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
        `Server: ${serverName} (${serverId})\nCPU Temperature: ${metrics.metrics.cpu.temp}°C\nThreshold: ${ALERT_THRESHOLDS.temp}°C`
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
        `Server: ${serverName} (${serverId})\nStatus: ${metrics.status}\nCPU: ${metrics.metrics.cpu.usage}%\nTemp: ${metrics.metrics.cpu.temp}°C`
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
      si.cpuTemperature(),
      si.mem(),
      si.currentLoad(),
      si.fsSize(),
      si.networkStats(),
      si.graphics(),
      si.osInfo(),
      si.time()
    ]);

    const cpuInfo = await si.cpu();
    const gpuInfo = graphics.controllers[0];
    
    // Calculate power estimates (adjust these multipliers based on your hardware)
    const cpuPower = Math.round(currentLoad.currentLoad * 1.5); // Rough estimate
    const gpuPower = gpuInfo ? Math.round((gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 200) : 0;
    const ramPower = Math.round((mem.active / mem.total) * 50);
    const storagePower = 20; // Static estimate
    const otherPower = 15; // Static estimate

    const metrics = {
      id: getServerId(),
      name: await getServerName(),
      hostname: os.hostname(),
      os: `${osInfo.distro} ${osInfo.release}`,
      status: 'online',
      uptime: os.uptime(),
      lastSeen: new Date().toISOString(),
      metrics: {
        cpu: {
          usage: Math.round(currentLoad.currentLoad),
          temp: cpu.main || 0,
          cores: cpuInfo.cores
        },
        ram: {
          used: Math.round(mem.active / 1024 / 1024 / 1024),
          total: Math.round(mem.total / 1024 / 1024 / 1024),
          temp: mem.temperature || 0
        },
        gpu: gpuInfo ? {
          usage: Math.round((gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 100),
          temp: gpuInfo.temperatureGpu || 0,
          memory: Math.round(gpuInfo.memoryTotal / 1024)
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
    if (cpu.main > 85 || currentLoad.currentLoad > 90) {
      metrics.status = 'throttled';
    }

    return metrics;
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return null;
  }
}

// Store metrics in history
function storeMetrics(metrics) {
  const serverId = metrics.id;
  if (!metricsHistory[serverId]) {
    metricsHistory[serverId] = [];
  }
  
  metricsHistory[serverId].push({
    timestamp: Date.now(),
    ...metrics
  });

  // Keep only last 24 hours of data (at 5-second intervals = ~17,280 points)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  metricsHistory[serverId] = metricsHistory[serverId].filter(
    m => m.timestamp > oneDayAgo
  );
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
  const { serverId } = req.params;
  const { period = '24h' } = req.query;
  
  const history = metricsHistory[serverId] || [];
  
  // Parse period (24h, 12h, 1h, etc.)
  const hours = parseInt(period) || 24;
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  
  const filteredHistory = history.filter(m => m.timestamp > cutoffTime);
  
  res.json({
    serverId,
    period,
    data: filteredHistory
  });
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

app.listen(PORT, () => {
  console.log(`Server monitoring API running on port ${PORT}`);
  console.log(`Server ID: ${getServerId()}`);
  console.log(`Server Name: ${getServerName()}`);
});
