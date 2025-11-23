import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [apiEndpoint, setApiEndpoint] = useState(
    localStorage.getItem("apiEndpoint") || ""
  );
  
  // Alert thresholds
  const [cpuThreshold, setCpuThreshold] = useState(
    localStorage.getItem("alertCpuThreshold") || "90"
  );
  const [ramThreshold, setRamThreshold] = useState(
    localStorage.getItem("alertRamThreshold") || "90"
  );
  const [gpuThreshold, setGpuThreshold] = useState(
    localStorage.getItem("alertGpuThreshold") || "90"
  );
  const [tempThreshold, setTempThreshold] = useState(
    localStorage.getItem("alertTempThreshold") || "85"
  );
  
  // Notification channels
  const [smtpHost, setSmtpHost] = useState(
    localStorage.getItem("smtpHost") || ""
  );
  const [smtpPort, setSmtpPort] = useState(
    localStorage.getItem("smtpPort") || "587"
  );
  const [smtpUser, setSmtpUser] = useState(
    localStorage.getItem("smtpUser") || ""
  );
  const [alertEmail, setAlertEmail] = useState(
    localStorage.getItem("alertEmail") || ""
  );
  const [slackWebhook, setSlackWebhook] = useState(
    localStorage.getItem("slackWebhook") || ""
  );
  const [discordWebhook, setDiscordWebhook] = useState(
    localStorage.getItem("discordWebhook") || ""
  );
  
  const { toast } = useToast();

  const handleSaveGeneral = () => {
    localStorage.setItem("apiEndpoint", apiEndpoint);
    toast({
      title: "Settings Saved",
      description: "Your API endpoint has been updated",
    });
  };
  
  const handleSaveAlerts = () => {
    localStorage.setItem("alertCpuThreshold", cpuThreshold);
    localStorage.setItem("alertRamThreshold", ramThreshold);
    localStorage.setItem("alertGpuThreshold", gpuThreshold);
    localStorage.setItem("alertTempThreshold", tempThreshold);
    toast({
      title: "Alert Thresholds Saved",
      description: "Update your backend server .env file with these values",
    });
  };
  
  const handleSaveNotifications = () => {
    localStorage.setItem("smtpHost", smtpHost);
    localStorage.setItem("smtpPort", smtpPort);
    localStorage.setItem("smtpUser", smtpUser);
    localStorage.setItem("alertEmail", alertEmail);
    localStorage.setItem("slackWebhook", slackWebhook);
    localStorage.setItem("discordWebhook", discordWebhook);
    toast({
      title: "Notification Settings Saved",
      description: "Update your backend server .env file with these credentials",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your monitoring dashboard and alert system
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="alerts">Alert Thresholds</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="api-endpoint">API Endpoint</Label>
                  <Input
                    id="api-endpoint"
                    placeholder="http://localhost:3000"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    The base URL of your metrics API server (without /api suffix)
                  </p>
                </div>

                <Button onClick={handleSaveGeneral}>Save General Settings</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Alert Thresholds</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure when alerts should be triggered. These values are stored locally for reference.
                    Update your backend server's .env file with these values for them to take effect.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpu-threshold">CPU Threshold (%)</Label>
                    <Input
                      id="cpu-threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={cpuThreshold}
                      onChange={(e) => setCpuThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when CPU usage exceeds this percentage
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ram-threshold">RAM Threshold (%)</Label>
                    <Input
                      id="ram-threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={ramThreshold}
                      onChange={(e) => setRamThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when RAM usage exceeds this percentage
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gpu-threshold">GPU Threshold (%)</Label>
                    <Input
                      id="gpu-threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={gpuThreshold}
                      onChange={(e) => setGpuThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when GPU usage exceeds this percentage
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp-threshold">Temperature Threshold (°C)</Label>
                    <Input
                      id="temp-threshold"
                      type="number"
                      min="0"
                      max="150"
                      value={tempThreshold}
                      onChange={(e) => setTempThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when temperature exceeds this value
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveAlerts}>Save Alert Thresholds</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure how you want to receive alerts. These credentials must be added to your backend server's .env file.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">Email (SMTP)</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp-host">SMTP Host</Label>
                        <Input
                          id="smtp-host"
                          placeholder="smtp.gmail.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp-port">SMTP Port</Label>
                        <Input
                          id="smtp-port"
                          type="number"
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">SMTP Username</Label>
                      <Input
                        id="smtp-user"
                        placeholder="your-email@gmail.com"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alert-email">Alert Email Address</Label>
                      <Input
                        id="alert-email"
                        placeholder="admin@yourcompany.com"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Where alerts will be sent
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">Slack</h4>
                  <div className="space-y-2">
                    <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in your Slack workspace settings
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">Discord</h4>
                  <div className="space-y-2">
                    <Label htmlFor="discord-webhook">Discord Webhook URL</Label>
                    <Input
                      id="discord-webhook"
                      placeholder="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
                      value={discordWebhook}
                      onChange={(e) => setDiscordWebhook(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in your Discord channel settings
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications}>Save Notification Settings</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-4">API Documentation</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Expected Response Format:</h4>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto">
{`{
  "servers": [
    {
      "id": "unique-id",
      "name": "server-name",
      "hostname": "hostname.local",
      "os": "Ubuntu 22.04",
      "status": "online" | "offline" | "throttled",
      "uptime": 2592000,
      "lastSeen": "2025-11-21T10:00:00Z",
      "metrics": {
        "cpu": {
          "usage": 45,
          "temp": 62,
          "cores": 16
        },
        "ram": {
          "used": 24,
          "total": 64,
          "temp": 48
        },
        "gpu": {
          "usage": 78,
          "temp": 74,
          "memory": 8
        },
        "power": {
          "total": 285,
          "cpu": 95,
          "gpu": 120,
          "ram": 35,
          "storage": 20,
          "other": 15
        },
        "network": {
          "in": 1024,
          "out": 2048
        }
      }
    }
  ]
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Required Endpoints:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>GET /metrics - Current metrics for all servers</li>
                <li>GET /history/:serverId?period=24h - Historical data</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
