const SETTINGS_API_URL = import.meta.env.VITE_SETTINGS_API_URL || 'http://localhost:3001';

export interface ServerEndpoint {
  id: string;
  name: string;
  url: string;
  created_at?: string;
}

export interface AlertThresholds {
  cpu: number;
  ram: number;
  gpu: number;
  temperature: number;
}

export interface NotificationSettings {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  alert_email?: string;
  slack_webhook?: string;
  discord_webhook?: string;
}

// Server Endpoints
export async function getServerEndpoints(): Promise<ServerEndpoint[]> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/servers`);
  if (!response.ok) throw new Error('Failed to fetch server endpoints');
  return response.json();
}

export async function addServerEndpoint(endpoint: ServerEndpoint): Promise<ServerEndpoint> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint),
  });
  if (!response.ok) throw new Error('Failed to add server endpoint');
  return response.json();
}

export async function deleteServerEndpoint(id: string): Promise<void> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/servers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete server endpoint');
}

// Alert Thresholds
export async function getAlertThresholds(): Promise<AlertThresholds> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/alerts`);
  if (!response.ok) throw new Error('Failed to fetch alert thresholds');
  return response.json();
}

export async function saveAlertThresholds(thresholds: AlertThresholds): Promise<void> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds),
  });
  if (!response.ok) throw new Error('Failed to save alert thresholds');
}

// Notification Settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/notifications`);
  if (!response.ok) throw new Error('Failed to fetch notification settings');
  return response.json();
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const response = await fetch(`${SETTINGS_API_URL}/api/settings/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to save notification settings');
}

// Server History
export async function storeServerHistory(serverId: string, data: any): Promise<void> {
  const response = await fetch(`${SETTINGS_API_URL}/api/history/${serverId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to store server history');
}

export async function getServerHistory(serverId: string, hours: number = 24): Promise<any[]> {
  const response = await fetch(`${SETTINGS_API_URL}/api/history/${serverId}?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to fetch server history');
  return response.json();
}
