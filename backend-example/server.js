const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Store historical metrics (in production, use a database)
const metricsHistory = {};

app.use(cors());
app.use(express.json());

// Helper to get server identifier
function getServerId() {
  return process.env.SERVER_ID || os.hostname();
}

// Helper to get server name
function getServerName() {
  return process.env.SERVER_NAME || os.hostname();
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
      name: getServerName(),
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
  }
}, 5000);

app.listen(PORT, () => {
  console.log(`Server monitoring API running on port ${PORT}`);
  console.log(`Server ID: ${getServerId()}`);
  console.log(`Server Name: ${getServerName()}`);
});
