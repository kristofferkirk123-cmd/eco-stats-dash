// Settings API - talks to the frontend server's SQLite database
const API_BASE = '/api/settings';

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

export async function getServerEndpoints(): Promise<ServerEndpoint[]> {
  const response = await fetch(`${API_BASE}/servers`);
  if (!response.ok) throw new Error('Failed to fetch server endpoints');
  return response.json();
}

export async function addServerEndpoint(endpoint: ServerEndpoint): Promise<ServerEndpoint> {
  const response = await fetch(`${API_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint),
  });
  if (!response.ok) throw new Error('Failed to add server endpoint');
  return response.json();
}

export async function deleteServerEndpoint(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete server endpoint');
}

export async function getAlertThresholds(): Promise<AlertThresholds> {
  const response = await fetch(`${API_BASE}/alerts`);
  if (!response.ok) throw new Error('Failed to fetch alert thresholds');
  return response.json();
}

export async function saveAlertThresholds(thresholds: AlertThresholds): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds),
  });
  if (!response.ok) throw new Error('Failed to save alert thresholds');
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch(`${API_BASE}/notifications`);
  if (!response.ok) throw new Error('Failed to fetch notification settings');
  return response.json();
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to save notification settings');
}
