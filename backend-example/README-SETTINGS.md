# Settings Server Setup

This is a separate server that stores dashboard settings and server history in SQLite.

## Installation

```bash
cd backend-example
npm install
```

## Running the Settings Server

```bash
# Default port 3001
node settings-server.js

# Or specify custom port
SETTINGS_PORT=3001 node settings-server.js
```

## Frontend Configuration

Set the settings API URL in your frontend `.env` file:

```
VITE_SETTINGS_API_URL=http://localhost:3001
```

Or for production:

```
VITE_SETTINGS_API_URL=https://your-domain.com:3001
```

## API Endpoints

- `GET /api/settings/servers` - Get all server endpoints
- `POST /api/settings/servers` - Add server endpoint
- `DELETE /api/settings/servers/:id` - Remove server endpoint
- `GET /api/settings/alerts` - Get alert thresholds
- `POST /api/settings/alerts` - Save alert thresholds
- `GET /api/settings/notifications` - Get notification settings
- `POST /api/settings/notifications` - Save notification settings
- `POST /api/history/:serverId` - Store server history
- `GET /api/history/:serverId?hours=24` - Get server history

## Database

Settings are stored in `settings.db` SQLite database file. The database includes:

- `server_endpoints` - Configured server endpoints
- `alert_thresholds` - Alert threshold values
- `notifications` - Notification channel settings
- `server_history` - Historical metrics data (7 days retention)
