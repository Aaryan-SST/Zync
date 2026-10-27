import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function LatencyChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 w-full flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-xs text-gray-400">
        No ping data recorded yet
      </div>
    );
  }

  // pingHistory is stored with newest first or chronological.
  // We sort/order oldest to newest for left-to-right timeline display.
  const chartData = [...data]
    .slice(0, 50)
    .reverse()
    .filter((p) => p && p.responseTimeMs !== null && p.responseTimeMs !== undefined)
    .map((p) => {
      const date = p.timestamp ? new Date(p.timestamp) : new Date();
      return {
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        latency: p.responseTimeMs,
        statusCode: p.statusCode ?? "N/A",
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="h-20 w-full flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-xs text-gray-400">
        No latency measurements available
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 80, minHeight: 80 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg border border-gray-800">
                    <div className="font-semibold">{item.latency} ms</div>
                    <div className="text-gray-300 text-[10px]">
                      {item.time} | HTTP {item.statusCode}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
