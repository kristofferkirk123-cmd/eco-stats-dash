# Server Monitoring API - Setup Guide

This backend API collects system metrics from Windows and Ubuntu servers and provides them to your monitoring dashboard.

## Prerequisites

- Node.js 16+ installed on each server you want to monitor
- Network access between your servers and the dashboard
- Administrative/root privileges for accurate metrics collection

## Installation

### On Each Server You Want to Monitor:

1. **Copy the backend-example folder to your server:**
   ```bash
   scp -r backend-example/ user@your-server:/path/to/monitoring/
   ```

2. **Navigate to the folder:**
   ```bash
   cd /path/to/monitoring/backend-example
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   
   **Note:** The API now uses SQLite for persistent storage. All metrics and alerts are automatically saved to a `metrics.db` file in the backend-example directory. Historical data is retained for 7 days and old data is automatically cleaned up on startup.

4. **Configure alerts (optional):**
   Create a `.env` file:
   ```bash
   nano .env
   ```
   
   Add configuration for alerts:
   ```env
   PORT=3000
   
   # Alert Thresholds
   ALERT_CPU_THRESHOLD=90
   ALERT_RAM_THRESHOLD=90
   ALERT_GPU_THRESHOLD=90
   ALERT_TEMP_THRESHOLD=85
   
   # Email Alerts (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ALERT_EMAIL=admin@yourcompany.com
   
   # Slack Webhook (optional)
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   
   # Discord Webhook (optional)
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
   ```
   
   **Note:** Server ID is automatically generated and persisted. Server name is fetched from reverse DNS lookup and updates every 5 minutes.

5. **Start the API server:**
   
   For production:
   ```bash
   npm start
   ```
   
   For development (auto-restart):
   ```bash
   npm run dev
   ```

6. **Run as a system service (recommended for production):**

   **For Ubuntu (systemd):**
   
   Create service file:
   ```bash
   sudo nano /etc/systemd/system/server-monitor.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=Server Monitoring API
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/monitoring/backend-example
   ExecStart=/usr/bin/node server.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=SERVER_ID=srv-1
   Environment=SERVER_NAME=production-web

   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable and start:
   ```bash
   sudo systemctl enable server-monitor
   sudo systemctl start server-monitor
   sudo systemctl status server-monitor
   ```

   **For Windows (using PM2):**
   
   Install PM2 globally:
   ```powershell
   npm install -g pm2
   ```
   
   Start the service:
   ```powershell
   pm2 start server.js --name server-monitor
   pm2 startup
   pm2 save
   ```

## Configuration

### Dashboard Configuration

1. Open your monitoring dashboard
2. Go to Settings
3. Set the API Endpoint to one of:
   - Single server: `http://your-server-ip:3000/api`
   - Load balancer (multiple servers): `http://your-loadbalancer-ip/api`

### Multiple Servers Setup

For monitoring multiple servers, you have two options:

#### Option 1: API Gateway/Aggregator (Recommended)

Create an aggregator service that queries all server APIs:

```javascript
// aggregator.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const SERVERS = [
  'http://server1:3000',
  'http://server2:3000',
  'http://server3:3000'
];

app.get('/api/metrics', async (req, res) => {
  try {
    const responses = await Promise.all(
      SERVERS.map(url => axios.get(`${url}/metrics`).catch(e => null))
    );
    
    const allServers = responses
      .filter(r => r && r.data)
      .flatMap(r => r.data.servers);
    
    res.json({ servers: allServers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate metrics' });
  }
});

app.listen(4000, () => {
  console.log('Aggregator running on port 4000');
});
```

#### Option 2: Dashboard Polling

Modify the dashboard to poll multiple endpoints directly.

### Firewall Configuration

Make sure port 3000 (or your chosen port) is open:

**Ubuntu:**
```bash
sudo ufw allow 3000/tcp
```

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "Server Monitor API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## API Endpoints

- `GET /metrics` - Current metrics for the server
- `GET /history/:serverId?period=24h` - Historical data
- `GET /health` - Health check

## Metrics Collected

- **CPU**: Usage %, temperature, core count
- **RAM**: Used/total GB, temperature (if available)
- **GPU**: Usage %, temperature, memory (if available)
- **Power**: Estimated consumption by component (CPU, GPU, RAM, storage)
- **Network**: Incoming/outgoing KB/s
- **System**: Uptime, OS info, hostname
- **Server Identity**: Auto-generated persistent ID, DNS-resolved name

## Alert System

The API includes built-in alerting that monitors your servers and sends notifications when:

- CPU usage exceeds threshold (default: 90%)
- RAM usage exceeds threshold (default: 90%)
- GPU usage exceeds threshold (default: 90%)
- Temperature exceeds threshold (default: 85°C)
- Server enters throttled state

### Supported Alert Channels

**Email (SMTP)**
Configure any SMTP server (Gmail, SendGrid, etc.):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL=admin@yourcompany.com
```

For Gmail, you'll need an [App Password](https://support.google.com/accounts/answer/185833).

**Slack**
Create an [Incoming Webhook](https://api.slack.com/messaging/webhooks):
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Discord**
Create a webhook in your Discord channel settings:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

### Alert Configuration

Customize thresholds in your `.env` file:
```env
ALERT_CPU_THRESHOLD=85
ALERT_RAM_THRESHOLD=80
ALERT_GPU_THRESHOLD=90
ALERT_TEMP_THRESHOLD=80
```

Alerts are sent once when a threshold is crossed and won't spam until the metric returns to normal and crosses again.

## Troubleshooting

### Metrics showing 0 or unavailable:

**Linux:** Run with sudo for full sensor access:
```bash
sudo npm start
```

Or install required sensors:
```bash
sudo apt-get install lm-sensors
sudo sensors-detect
```

**Windows:** Run PowerShell/Command Prompt as Administrator

### Port already in use:

Change the port in `.env`:
```env
PORT=3001
```

### CORS errors:

The API allows all origins by default. To restrict:
```javascript
app.use(cors({
  origin: 'http://your-dashboard-domain.com'
}));
```

## Performance Notes

- Each server stores up to 24 hours of metrics in memory (~17,280 data points at 5-second intervals)
- For longer retention, consider using a database (PostgreSQL, InfluxDB, etc.)
- Memory usage: ~50-100MB per server instance
- CPU overhead: <1% on modern systems

## Security Recommendations

- Use HTTPS in production (add SSL/TLS certificates)
- Implement authentication (API keys, JWT)
- Run behind a reverse proxy (nginx, Apache)
- Restrict CORS to your dashboard domain
- Use environment variables for sensitive config
- Keep Node.js and dependencies updated

## Advanced: Database Integration

For production with multiple servers and long-term storage, integrate a time-series database:

```bash
npm install pg  # PostgreSQL
# or
npm install influx  # InfluxDB
```

Update `storeMetrics()` to write to your database instead of memory.
