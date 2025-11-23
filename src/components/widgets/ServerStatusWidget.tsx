import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServerCog } from "lucide-react";

interface Server {
  id: string;
  name: string;
  hostname: string;
  status: "online" | "offline" | "throttle";
  os: string;
}

interface ServerStatusWidgetProps {
  servers: Server[];
}

export function ServerStatusWidget({ servers }: ServerStatusWidgetProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-chart-2 text-chart-2";
      case "offline":
        return "bg-destructive text-destructive-foreground";
      case "throttle":
        return "bg-chart-4 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Server Status</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pb-2">
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <ServerCog className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{server.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{server.hostname}</p>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(server.status)}>
                {server.status}
              </Badge>
            </div>
          ))}
          {servers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No servers configured
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
