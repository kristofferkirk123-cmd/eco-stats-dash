# Deployment Guide

This project includes a production server that serves the React frontend and provides SQLite storage for settings.

## Development

In development, run two terminals:

**Terminal 1 - Frontend dev server (Vite):**
```bash
npm run dev
```

**Terminal 2 - Settings API server:**
```bash
cd $(dirname $0)
npm install --prefix . express cors sql.js
node server.js
```

The Vite dev server proxies `/api` requests to the production server on port 5000.

## Production Deployment

### Build the frontend:
```bash
npm run build
```

### Install server dependencies:
```bash
npm install --prefix . express cors sql.js
```

### Start the production server:
```bash
node server.js
```

The server will:
- Serve the built React app from the `dist` folder
- Provide SQLite-backed API endpoints at `/api/settings/*`
- Store all settings in `settings.db` file
- Run on port 5000 (or PORT environment variable)

### Environment Variables

```bash
PORT=5000  # Server port (default: 5000)
```

## Architecture

```
┌─────────────────────────────────────┐
│   Frontend (React + Vite)           │
│   - Dashboard UI                    │
│   - Settings UI                     │
│   - Charts & Widgets                │
└──────────────┬──────────────────────┘
               │ HTTP API calls to /api/settings
               ▼
┌─────────────────────────────────────┐
│   Production Server (server.js)     │
│   - Serves static React build       │
│   - SQLite settings storage         │
│   - Express REST API                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   settings.db (SQLite)              │
│   - Server endpoints                │
│   - Alert thresholds                │
│   - Notification settings           │
└─────────────────────────────────────┘
```

## Database

Settings are stored in `settings.db`:
- **server_endpoints** - Configured monitoring server URLs
- **alert_thresholds** - CPU/RAM/GPU/Temp threshold values
- **notifications** - SMTP/Slack/Discord webhook URLs

The database is automatically created on first run and persists across restarts.

## Monitoring Servers

The backend monitoring servers (Raspberry Pi, etc.) run separately and expose metrics at their own endpoints. Configure these in the Settings page.
