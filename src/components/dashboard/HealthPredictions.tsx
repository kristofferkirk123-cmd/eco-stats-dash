import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

interface Prediction {
  type: string;
  severity: "warning" | "error" | "info";
  message: string;
  currentValue: number;
  trend: string;
  confidence: string;
}

interface HealthPredictionsProps {
  serverId: string;
  apiEndpoint: string;
}

export function HealthPredictions({ serverId, apiEndpoint }: HealthPredictionsProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiEndpoint) return;

    const fetchPredictions = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/predictions/${serverId}`);
        const data = await response.json();
        setPredictions(data.predictions || []);
      } catch (error) {
        console.error("Failed to fetch predictions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [serverId, apiEndpoint]);

  if (!apiEndpoint) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-5 w-5" />
          <p>Configure API endpoint in settings to view health predictions</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading predictions...</p>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card className="p-6 border-success bg-success/5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-success">All Systems Normal</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No potential issues detected based on current trends
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Health Predictions</h3>
        </div>
        
        <div className="space-y-3">
          {predictions.map((prediction, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                prediction.severity === "error"
                  ? "bg-destructive/5 border-destructive"
                  : "bg-warning/5 border-warning"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={prediction.severity === "error" ? "destructive" : "default"}
                      className="uppercase text-xs"
                    >
                      {prediction.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {prediction.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{prediction.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {prediction.currentValue}
                    {prediction.type === "temperature" ? "°C" : "%"}
                  </p>
                </div>
                <TrendingUp
                  className={`h-5 w-5 flex-shrink-0 ${
                    prediction.severity === "error" ? "text-destructive" : "text-warning"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
