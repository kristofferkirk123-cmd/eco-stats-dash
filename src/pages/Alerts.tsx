import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bell, Filter, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  timestamp: string;
  serverId: string;
  serverName: string;
  subject: string;
  message: string;
  alertType: string;
  severity: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const apiEndpoint = localStorage.getItem("apiEndpoint") || "";

  useEffect(() => {
    if (!apiEndpoint) {
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/alerts?limit=500`);
        const data = await response.json();
        setAlerts(data.alerts || []);
        setFilteredAlerts(data.alerts || []);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [apiEndpoint]);

  useEffect(() => {
    let filtered = alerts;

    if (searchQuery) {
      filtered = filtered.filter(
        (alert) =>
          alert.serverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((alert) => alert.severity === severityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((alert) => alert.alertType === typeFilter);
    }

    setFilteredAlerts(filtered);
  }, [searchQuery, severityFilter, typeFilter, alerts]);

  const uniqueTypes = Array.from(new Set(alerts.map((a) => a.alertType)));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  if (!apiEndpoint) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold tracking-tight">Alert History</h1>
            <p className="text-muted-foreground mt-1">View and filter past server alerts</p>
          </div>
          <Card className="p-6">
            <p className="text-muted-foreground">
              Configure your API endpoint in settings to view alert history
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Alert History</h1>
            <p className="text-muted-foreground mt-1">
              {filteredAlerts.length} {filteredAlerts.length === 1 ? "alert" : "alerts"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="p-6">
            <p className="text-muted-foreground">Loading alerts...</p>
          </Card>
        ) : filteredAlerts.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
              <p className="text-muted-foreground">
                {alerts.length === 0
                  ? "No alerts have been triggered yet"
                  : "Try adjusting your filters"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        alert.severity === "error"
                          ? "bg-destructive/20"
                          : "bg-warning/20"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alert.severity === "error"
                            ? "text-destructive"
                            : "text-warning"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getSeverityColor(alert.severity)} className="uppercase">
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">{alert.alertType.replace("_", " ")}</Badge>
                        <span className="text-sm font-medium">{alert.serverName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-1">{alert.subject}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
