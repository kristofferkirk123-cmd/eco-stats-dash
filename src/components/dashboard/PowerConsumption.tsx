import { Card } from "@/components/ui/card";
import { ServerMetrics } from "@/pages/Dashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Zap } from "lucide-react";

interface PowerConsumptionProps {
  server: ServerMetrics;
}

export function PowerConsumption({ server }: PowerConsumptionProps) {
  const powerData = [
    { component: "CPU", watts: server.metrics.power.cpu, color: "hsl(var(--chart-1))" },
    { component: "RAM", watts: server.metrics.power.ram, color: "hsl(var(--chart-2))" },
    { component: "Storage", watts: server.metrics.power.storage, color: "hsl(var(--chart-3))" },
    { component: "Other", watts: server.metrics.power.other, color: "hsl(var(--chart-4))" },
  ];

  if (server.metrics.power.gpu) {
    powerData.splice(1, 0, {
      component: "GPU",
      watts: server.metrics.power.gpu,
      color: "hsl(var(--chart-5))",
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Power by Component</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={powerData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="component"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Watts", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: any) => [`${value}W`, "Power"]}
            />
            <Bar dataKey="watts" radius={[8, 8, 0, 0]}>
              {powerData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Power Statistics</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total Power Draw</span>
            <span className="text-2xl font-bold text-yellow-500">{server.metrics.power.total}W</span>
          </div>

          <div className="space-y-2">
            {powerData.map((item) => (
              <div key={item.component} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.component}</span>
                </div>
                <span className="text-sm font-mono font-semibold">{item.watts}W</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Avg. Hourly Consumption</span>
              <span className="font-mono">{(server.metrics.power.total / 1000).toFixed(2)} kWh</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>Avg. Daily Consumption</span>
              <span className="font-mono">{((server.metrics.power.total * 24) / 1000).toFixed(2)} kWh</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
