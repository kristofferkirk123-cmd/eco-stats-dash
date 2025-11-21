import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ServerMetrics } from "@/pages/Dashboard";
import { Activity, HardDrive, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServerCardProps {
  server: ServerMetrics;
  onClick: () => void;
  isSelected: boolean;
}

export function ServerCard({ server, onClick, isSelected }: ServerCardProps) {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-red-500",
    throttled: "bg-yellow-500",
  };

  return (
    <Card
      className={cn(
        "p-6 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
        isSelected && "border-primary shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{server.name}</h3>
            <p className="text-sm text-muted-foreground">{server.hostname}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", statusColors[server.status])} />
            <span className="text-xs capitalize">{server.status}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span>{server.os}</span>
          <span>•</span>
          <span>Uptime: {formatUptime(server.uptime)}</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-chart-1" />
                <span className="text-sm">CPU</span>
              </div>
              <span className="text-sm font-mono">{server.metrics.cpu.usage}%</span>
            </div>
            <Progress value={server.metrics.cpu.usage} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-chart-2" />
                <span className="text-sm">RAM</span>
              </div>
              <span className="text-sm font-mono">
                {server.metrics.ram.used}GB / {server.metrics.ram.total}GB
              </span>
            </div>
            <Progress
              value={(server.metrics.ram.used / server.metrics.ram.total) * 100}
              className="h-2"
            />
          </div>

          {server.metrics.gpu && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-chart-3" />
                  <span className="text-sm">GPU</span>
                </div>
                <span className="text-sm font-mono">{server.metrics.gpu.usage}%</span>
              </div>
              <Progress value={server.metrics.gpu.usage} className="h-2" />
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Power</span>
              </div>
              <span className="text-sm font-mono font-semibold">
                {server.metrics.power.total}W
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
