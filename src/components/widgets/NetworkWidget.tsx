import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity } from "lucide-react";

interface NetworkWidgetProps {
  data: Array<{
    time: number;
    upload: number;
    download: number;
  }>;
}

export function NetworkWidget({ data }: NetworkWidgetProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Network Traffic
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => `${value} MB/s`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value: number) => [`${value.toFixed(2)} MB/s`]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="upload"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Upload"
            />
            <Line
              type="monotone"
              dataKey="download"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Download"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
