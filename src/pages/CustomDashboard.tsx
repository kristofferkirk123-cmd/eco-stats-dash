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
import { Plus, Layout as LayoutIcon } from "lucide-react";
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
];

export default function CustomDashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [serverData, setServerData] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<ServerEndpoint[]>([]);

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
      if (endpoints.length === 0) return;

      const allData = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(`${endpoint.url}/metrics`);
            const data = await response.json();
            return { ...data, endpointId: endpoint.id, endpointName: endpoint.name };
          } catch (error) {
            console.error(`Failed to fetch from ${endpoint.name}:`, error);
            return null;
          }
        })
      );

      setServerData(allData.filter(Boolean));
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

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    localStorage.setItem("dashboardLayouts", JSON.stringify(allLayouts));
  };

  const renderWidget = (widget: WidgetConfig) => {
    const mockData = Array.from({ length: 20 }, (_, i) => ({
      time: Date.now() - (19 - i) * 60000,
      usage: Math.random() * 100,
      watts: Math.random() * 500,
      temp: Math.random() * 80 + 20,
    }));

    const servers = serverData.map(data => ({
      id: data.id || "unknown",
      name: data.name || "Unknown Server",
      hostname: data.hostname || "unknown",
      status: data.status || "offline",
      os: data.os || "Unknown",
    }));

    switch (widget.type) {
      case "cpu":
        return <CPUWidget data={mockData} />;
      case "ram":
        return <RAMWidget data={mockData} />;
      case "gpu":
        return <GPUWidget data={mockData} />;
      case "power":
        return <PowerWidget data={mockData} />;
      case "temperature":
        return <TemperatureWidget data={mockData} />;
      case "status":
        return <ServerStatusWidget servers={servers} />;
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

        {widgets.length === 0 ? (
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
