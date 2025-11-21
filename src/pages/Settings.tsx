import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [apiEndpoint, setApiEndpoint] = useState(
    localStorage.getItem("apiEndpoint") || ""
  );
  const { toast } = useToast();

  const handleSave = () => {
    localStorage.setItem("apiEndpoint", apiEndpoint);
    toast({
      title: "Settings Saved",
      description: "Your API endpoint has been updated",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your monitoring dashboard
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                placeholder="http://localhost:3000/api"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The base URL of your metrics API server
              </p>
            </div>

            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </Card>

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
