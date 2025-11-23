import { useEffect, useState } from "react";
import { ServerCard } from "@/components/dashboard/ServerCard";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { PowerConsumption } from "@/components/dashboard/PowerConsumption";
import { HealthPredictions } from "@/components/dashboard/HealthPredictions";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export interface ServerMetrics {
  id: string;
  name: string;
  hostname: string;
  os: string;
  status: "online" | "offline" | "throttled";
  uptime: number;
  lastSeen: Date;
  metrics: {
    cpu: { usage: number; temp: number; cores: number };
    ram: { used: number; total: number; temp?: number };
    gpu?: { usage: number; temp: number; memory: number };
    power: {
      total: number;
      cpu: number;
      gpu?: number;
      ram: number;
      storage: number;
      other: number;
    };
    network: { in: number; out: number };
  };
}

interface ServerEndpoint {
  id: string;
  name: string;
  url: string;
}

// Mock data for demonstration
const mockServers: ServerMetrics[] = [
  {
    id: "srv-1",
    name: "production-web",
    hostname: "prod-web-01.local",
    os: "Ubuntu 22.04",
    status: "online",
    uptime: 2592000,
    lastSeen: new Date(),
    metrics: {
      cpu: { usage: 45, temp: 62, cores: 16 },
      ram: { used: 24, total: 64, temp: 48 },
      gpu: { usage: 78, temp: 74, memory: 8 },
      power: { total: 285, cpu: 95, gpu: 120, ram: 35, storage: 20, other: 15 },
      network: { in: 1024, out: 2048 },
    },
  },
  {
    id: "srv-2",
    name: "database-primary",
    hostname: "db-primary.local",
    os: "Ubuntu 20.04",
    status: "online",
    uptime: 5184000,
    lastSeen: new Date(),
    metrics: {
      cpu: { usage: 62, temp: 68, cores: 32 },
      ram: { used: 118, total: 128 },
      power: { total: 195, cpu: 125, ram: 45, storage: 15, other: 10 },
      network: { in: 4096, out: 1024 },
    },
  },
  {
    id: "srv-3",
    name: "ml-training",
    hostname: "ml-gpu-01.local",
    os: "Windows Server 2022",
    status: "throttled",
    uptime: 864000,
    lastSeen: new Date(),
    metrics: {
      cpu: { usage: 88, temp: 82, cores: 24 },
      ram: { used: 230, total: 256 },
      gpu: { usage: 98, temp: 86, memory: 24 },
      power: { total: 425, cpu: 145, gpu: 220, ram: 40, storage: 10, other: 10 },
      network: { in: 512, out: 256 },
    },
  },
];

export default function Dashboard() {
  const [servers, setServers] = useState<ServerMetrics[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<ServerEndpoint[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedEndpoints = localStorage.getItem("serverEndpoints");
    if (savedEndpoints) {
      setEndpoints(JSON.parse(savedEndpoints));
    }
  }, []);

  useEffect(() => {
    if (endpoints.length === 0) {
      toast({
        title: "Using Mock Data",
        description: "Configure server endpoints in Settings to connect to real servers",
        variant: "default",
      });
      setServers(mockServers);
      return;
    }

    const fetchMetrics = async () => {
      const allData = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            // Remove trailing slash from URL to prevent double slashes
            const baseUrl = endpoint.url.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/metrics`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // Extract hostname from URL for DNS-based naming
            const url = new URL(endpoint.url);
            const serverName = url.hostname;
            
            // Transform data to match ServerMetrics interface
            return {
              id: data.id || endpoint.id,
              name: serverName,
              hostname: serverName,
              os: data.os || "Unknown",
              status: (data.status || "online") as "online" | "offline" | "throttled",
              uptime: data.uptime || 0,
              lastSeen: new Date(data.lastSeen || Date.now()),
              metrics: {
                cpu: {
                  usage: data.cpu?.usage || 0,
                  temp: data.temperature?.cpu || data.cpu?.temp || 0,
                  cores: data.cpu?.cores || 0,
                },
                ram: {
                  used: data.memory?.used || data.ram?.used || 0,
                  total: data.memory?.total || data.ram?.total || 0,
                  temp: data.temperature?.ram || data.ram?.temp,
                },
                gpu: data.gpu ? {
                  usage: data.gpu.usage || 0,
                  temp: data.temperature?.gpu || data.gpu.temp || 0,
                  memory: data.gpu.memory || 0,
                } : undefined,
                power: {
                  total: data.power?.total || 0,
                  cpu: data.power?.cpu || 0,
                  gpu: data.power?.gpu,
                  ram: data.power?.ram || 0,
                  storage: data.power?.storage || 0,
                  other: data.power?.other || 0,
                },
                network: {
                  in: data.network?.download_speed || data.network?.in || 0,
                  out: data.network?.upload_speed || data.network?.out || 0,
                },
              },
            };
          } catch (error) {
            console.error(`Failed to fetch from ${endpoint.name}:`, error);
            // Return offline server entry
            const url = new URL(endpoint.url);
            return {
              id: endpoint.id,
              name: url.hostname,
              hostname: url.hostname,
              os: "Unknown",
              status: "offline" as const,
              uptime: 0,
              lastSeen: new Date(),
              metrics: {
                cpu: { usage: 0, temp: 0, cores: 0 },
                ram: { used: 0, total: 0 },
                power: { total: 0, cpu: 0, ram: 0, storage: 0, other: 0 },
                network: { in: 0, out: 0 },
              },
            };
          }
        })
      );

      setServers(allData);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [endpoints, toast]);

  const server = selectedServer ? servers.find((s) => s.id === selectedServer) : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Server Monitor</h1>
            <p className="text-muted-foreground mt-1">
              Real-time performance and eco statistics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {servers.filter((s) => s.status === "online").length}/{servers.length} Online
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onClick={() => setSelectedServer(server.id)}
              isSelected={selectedServer === server.id}
            />
          ))}
        </div>

        {server && (
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="power">Power</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MetricsChart
                  title="CPU Usage"
                  data={[{ time: Date.now(), value: server.metrics.cpu.usage }]}
                  dataKey="value"
                  color="hsl(var(--chart-1))"
                  unit="%"
                  max={100}
                />
                <MetricsChart
                  title="RAM Usage"
                  data={[{ time: Date.now(), value: (server.metrics.ram.used / server.metrics.ram.total) * 100 }]}
                  dataKey="value"
                  color="hsl(var(--chart-2))"
                  unit="%"
                  max={100}
                />
                {server.metrics.gpu && (
                  <MetricsChart
                    title="GPU Usage"
                    data={[{ time: Date.now(), value: server.metrics.gpu.usage }]}
                    dataKey="value"
                    color="hsl(var(--chart-3))"
                    unit="%"
                    max={100}
                  />
                )}
                <MetricsChart
                  title="Temperature"
                  data={[
                    { name: "CPU", value: server.metrics.cpu.temp },
                    { name: "RAM", value: server.metrics.ram.temp || 0 },
                    { name: "GPU", value: server.metrics.gpu?.temp || 0 },
                  ]}
                  dataKey="value"
                  color="hsl(var(--chart-4))"
                  unit="°C"
                  max={100}
                />
              </div>
            </TabsContent>

            <TabsContent value="predictions">
              <HealthPredictions serverId={server.id} apiEndpoint={endpoints.find(e => e.id === server.id)?.url || ""} />
            </TabsContent>

            <TabsContent value="power">
              <PowerConsumption server={server} />
            </TabsContent>

            <TabsContent value="history">
              <Card className="p-6">
                <p className="text-muted-foreground">
                  Historical data will be fetched from your API endpoint
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
