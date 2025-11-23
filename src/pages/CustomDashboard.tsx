import { useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CPUWidget } from "@/components/widgets/CPUWidget";
import { RAMWidget } from "@/components/widgets/RAMWidget";
import { GPUWidget } from "@/components/widgets/GPUWidget";
import { PowerWidget } from "@/components/widgets/PowerWidget";
import { ServerStatusWidget } from "@/components/widgets/ServerStatusWidget";
import { TemperatureWidget } from "@/components/widgets/TemperatureWidget";
import { NetworkWidget } from "@/components/widgets/NetworkWidget";
import { Plus, Layout as LayoutIcon, Zap, Cpu, Grid3x3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetConfig {
  i: string;
  type: string;
  title: string;
}

interface ServerEndpoint {
  id: string;
  name: string;
  url: string;
}

const availableWidgets = [
  { type: "cpu", title: "CPU Usage", icon: "📊" },
  { type: "ram", title: "RAM Usage", icon: "💾" },
  { type: "gpu", title: "GPU Usage", icon: "🎮" },
  { type: "power", title: "Power Consumption", icon: "⚡" },
  { type: "temperature", title: "Temperature", icon: "🌡️" },
  { type: "status", title: "Server Status", icon: "🖥️" },
  { type: "network", title: "Network Traffic", icon: "🌐" },
];

const dashboardPresets = {
  cpuFocused: {
    name: "CPU Focused",
    icon: Cpu,
    widgets: [
      { i: "cpu-preset", type: "cpu", title: "CPU Usage" },
      { i: "temperature-preset", type: "temperature", title: "Temperature" },
      { i: "ram-preset", type: "ram", title: "RAM Usage" },
    ],
    layout: {
      lg: [
        { i: "cpu-preset", x: 0, y: 0, w: 6, h: 4 },
        { i: "temperature-preset", x: 6, y: 0, w: 6, h: 4 },
        { i: "ram-preset", x: 0, y: 4, w: 12, h: 4 },
      ],
    },
  },
  powerMonitoring: {
    name: "Power Monitoring",
    icon: Zap,
    widgets: [
      { i: "power-preset", type: "power", title: "Power Consumption" },
      { i: "gpu-preset", type: "gpu", title: "GPU Usage" },
      { i: "temperature-preset-2", type: "temperature", title: "Temperature" },
    ],
    layout: {
      lg: [
        { i: "power-preset", x: 0, y: 0, w: 12, h: 4 },
        { i: "gpu-preset", x: 0, y: 4, w: 6, h: 4 },
        { i: "temperature-preset-2", x: 6, y: 4, w: 6, h: 4 },
      ],
    },
  },
  fullOverview: {
    name: "Full Overview",
    icon: Grid3x3,
    widgets: [
      { i: "status-preset", type: "status", title: "Server Status" },
      { i: "cpu-preset-2", type: "cpu", title: "CPU Usage" },
      { i: "ram-preset-2", type: "ram", title: "RAM Usage" },
      { i: "gpu-preset-2", type: "gpu", title: "GPU Usage" },
      { i: "power-preset-2", type: "power", title: "Power Consumption" },
      { i: "temperature-preset-3", type: "temperature", title: "Temperature" },
      { i: "network-preset", type: "network", title: "Network Traffic" },
    ],
    layout: {
      lg: [
        { i: "status-preset", x: 0, y: 0, w: 12, h: 3 },
        { i: "cpu-preset-2", x: 0, y: 3, w: 4, h: 4 },
        { i: "ram-preset-2", x: 4, y: 3, w: 4, h: 4 },
        { i: "gpu-preset-2", x: 8, y: 3, w: 4, h: 4 },
        { i: "power-preset-2", x: 0, y: 7, w: 6, h: 4 },
        { i: "temperature-preset-3", x: 6, y: 7, w: 3, h: 4 },
        { i: "network-preset", x: 9, y: 7, w: 3, h: 4 },
      ],
    },
  },
};

export default function CustomDashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [serverData, setServerData] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<ServerEndpoint[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  useEffect(() => {
    const savedWidgets = localStorage.getItem("dashboardWidgets");
    const savedLayouts = localStorage.getItem("dashboardLayouts");
    const savedEndpoints = localStorage.getItem("serverEndpoints");

    if (savedWidgets) setWidgets(JSON.parse(savedWidgets));
    if (savedLayouts) setLayouts(JSON.parse(savedLayouts));
    if (savedEndpoints) setEndpoints(JSON.parse(savedEndpoints));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (endpoints.length === 0) {
        setServerData([]);
        return;
      }

      const allData = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(`${endpoint.url}/metrics`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // Extract hostname from URL for DNS-based naming
            const url = new URL(endpoint.url);
            const serverName = url.hostname;
            
            return { 
              id: data.id || endpoint.id,
              name: serverName,
              hostname: serverName,
              status: data.status || "online",
              os: data.os || "Unknown",
              endpointId: endpoint.id,
              endpointName: endpoint.name,
              metrics: {
                cpu: data.cpu?.usage || 0,
                ram: data.memory?.used_percent || 0,
                gpu: data.gpu?.usage || 0,
                power: data.power?.total || 0,
                temperature: data.temperature?.cpu || 0,
                network: {
                  upload: data.network?.upload_speed || 0,
                  download: data.network?.download_speed || 0,
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
              status: "offline",
              os: "Unknown",
              endpointId: endpoint.id,
              endpointName: endpoint.name,
              metrics: {
                cpu: 0,
                ram: 0,
                gpu: 0,
                power: 0,
                temperature: 0,
                network: { upload: 0, download: 0 },
              },
            };
          }
        })
      );

      setServerData(allData);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [endpoints]);

  const addWidget = (type: string, title: string) => {
    const newWidget: WidgetConfig = {
      i: `${type}-${Date.now()}`,
      type,
      title,
    };
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    localStorage.setItem("dashboardWidgets", JSON.stringify(updatedWidgets));
  };

  const removeWidget = (id: string) => {
    const updatedWidgets = widgets.filter((w) => w.i !== id);
    setWidgets(updatedWidgets);
    localStorage.setItem("dashboardWidgets", JSON.stringify(updatedWidgets));
  };

  const applyPreset = (presetKey: string) => {
    const preset = dashboardPresets[presetKey as keyof typeof dashboardPresets];
    if (!preset) return;

    setWidgets(preset.widgets);
    setLayouts(preset.layout);
    setSelectedPreset(presetKey);
    localStorage.setItem("dashboardWidgets", JSON.stringify(preset.widgets));
    localStorage.setItem("dashboardLayouts", JSON.stringify(preset.layout));
  };

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    localStorage.setItem("dashboardLayouts", JSON.stringify(allLayouts));
  };

  const renderWidget = (widget: WidgetConfig) => {
    // Generate time-series data from server metrics
    const timeSeriesData = Array.from({ length: 20 }, (_, i) => {
      const baseTime = Date.now() - (19 - i) * 60000;
      
      // Aggregate metrics from all servers for time series
      const avgMetrics = serverData.reduce(
        (acc, server) => ({
          usage: acc.usage + (server.metrics?.cpu || 0) / serverData.length,
          watts: acc.watts + (server.metrics?.power || 0) / serverData.length,
          temp: acc.temp + (server.metrics?.temperature || 0) / serverData.length,
          ramUsage: acc.ramUsage + (server.metrics?.ram || 0) / serverData.length,
          gpuUsage: acc.gpuUsage + (server.metrics?.gpu || 0) / serverData.length,
          upload: acc.upload + (server.metrics?.network?.upload || 0) / serverData.length,
          download: acc.download + (server.metrics?.network?.download || 0) / serverData.length,
        }),
        { usage: 0, watts: 0, temp: 0, ramUsage: 0, gpuUsage: 0, upload: 0, download: 0 }
      );

      // Add some variation to simulate real-time changes
      return {
        time: baseTime,
        usage: Math.max(0, Math.min(100, avgMetrics.usage + (Math.random() - 0.5) * 10)),
        watts: Math.max(0, avgMetrics.watts + (Math.random() - 0.5) * 50),
        temp: Math.max(20, Math.min(100, avgMetrics.temp + (Math.random() - 0.5) * 5)),
        ramUsage: Math.max(0, Math.min(100, avgMetrics.ramUsage + (Math.random() - 0.5) * 10)),
        gpuUsage: Math.max(0, Math.min(100, avgMetrics.gpuUsage + (Math.random() - 0.5) * 10)),
        upload: Math.max(0, avgMetrics.upload + (Math.random() - 0.5) * 10),
        download: Math.max(0, avgMetrics.download + (Math.random() - 0.5) * 20),
      };
    });

    const servers = serverData.map(data => ({
      id: data.id || data.endpointId || "unknown",
      name: data.name || data.endpointName || "Unknown Server",
      hostname: data.hostname || "unknown",
      status: data.status || "offline",
      os: data.os || "Unknown",
    }));

    switch (widget.type) {
      case "cpu":
        return <CPUWidget data={timeSeriesData} />;
      case "ram":
        return <RAMWidget data={timeSeriesData.map(d => ({ ...d, usage: d.ramUsage }))} />;
      case "gpu":
        return <GPUWidget data={timeSeriesData.map(d => ({ ...d, usage: d.gpuUsage }))} />;
      case "power":
        return <PowerWidget data={timeSeriesData} />;
      case "temperature":
        return <TemperatureWidget data={timeSeriesData} />;
      case "status":
        return <ServerStatusWidget servers={servers} />;
      case "network":
        return <NetworkWidget data={timeSeriesData} />;
      default:
        return null;
    }
  };

  const defaultLayouts = {
    lg: widgets.map((widget, index) => ({
      i: widget.i,
      x: (index % 3) * 4,
      y: Math.floor(index / 3) * 4,
      w: 4,
      h: 4,
      minW: 2,
      minH: 3,
    })),
  };

  const currentLayouts = Object.keys(layouts).length > 0 ? layouts : defaultLayouts;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Custom Dashboard</h1>
            <p className="text-muted-foreground">Drag and drop widgets to customize your view</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dashboardPresets).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {preset.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Widget
                </Button>
              </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add Widget</SheetTitle>
                <SheetDescription>Choose a widget to add to your dashboard</SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 py-4">
                {availableWidgets.map((widget) => (
                  <Card
                    key={widget.type}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => addWidget(widget.type, widget.title)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-2xl">{widget.icon}</span>
                        {widget.title}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>

        {endpoints.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <LayoutIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Server Endpoints Configured</h3>
              <p className="text-muted-foreground mb-4">
                Configure server API endpoints in Settings to start monitoring your servers
              </p>
              <Button onClick={() => window.location.href = '/settings'}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        ) : widgets.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <LayoutIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Widgets Added</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding widgets to create your custom dashboard
              </p>
              <Sheet>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Widget
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Add Widget</SheetTitle>
                    <SheetDescription>Choose a widget to add to your dashboard</SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-3 py-4">
                    {availableWidgets.map((widget) => (
                      <Card
                        key={widget.type}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => addWidget(widget.type, widget.title)}
                      >
                        <CardHeader className="p-4">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-2xl">{widget.icon}</span>
                            {widget.title}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={currentLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
          >
            {widgets.map((widget) => (
              <div key={widget.i} className="relative">
                <div className="drag-handle absolute top-2 left-2 right-2 h-8 cursor-move z-10 bg-card/50 backdrop-blur-sm rounded-t-lg flex items-center justify-between px-3">
                  <span className="text-xs font-medium text-muted-foreground">Drag to move</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => removeWidget(widget.i)}
                  >
                    ×
                  </Button>
                </div>
                <div className="h-full pt-8">{renderWidget(widget)}</div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
