import { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import LatencyChart from "./LatencyChart.jsx";
import IncidentList from "./IncidentList.jsx";

export default function MonitorCard({ monitor, onEdit, onDelete, onToggle }) {
  const [showIncidents, setShowIncidents] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(monitor._id);
    } finally {
      setIsToggling(false);
    }
  };

  const lastChecked = monitor.lastCheckedAt
    ? new Date(monitor.lastCheckedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Never";

  const latestPing = monitor.pingHistory?.[0];

  return (
    <div
      className={`bg-white rounded-xl border transition-shadow duration-200 shadow-xs hover:shadow-md ${
        monitor.isActive ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50/50"
      }`}
    >
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold text-gray-900 truncate" title={monitor.name}>
              {monitor.name}
            </h4>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate block"
              title={monitor.url}
            >
              {monitor.url}
            </a>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={monitor.status} />
            {!monitor.isActive && (
              <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                Paused
              </span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 my-3 text-center">
          <div>
            <div className="text-[11px] text-gray-500">Interval</div>
            <div className="text-xs font-semibold text-gray-800">{monitor.intervalSeconds}s</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Latency</div>
            <div className="text-xs font-semibold text-gray-800">
              {latestPing?.responseTimeMs !== undefined && latestPing?.responseTimeMs !== null
                ? `${latestPing.responseTimeMs}ms`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Last Checked</div>
            <div className="text-xs font-semibold text-gray-800">{lastChecked}</div>
          </div>
        </div>

        {/* Latency History Chart */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>Response Time History</span>
            {monitor.consecutiveFailures > 0 && (
              <span className="text-rose-600 font-medium">
                Failures: {monitor.consecutiveFailures}
              </span>
            )}
          </div>
          <LatencyChart data={monitor.pingHistory} />
        </div>

        {/* Active Incident Warning if any */}
        {monitor.activeIncidentId && (
          <div className="mb-3 p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              Active Incident Open
            </span>
            <button
              onClick={() => setShowIncidents(true)}
              className="underline text-[11px] font-medium"
            >
              View Details
            </button>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                monitor.isActive
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {monitor.isActive ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 font-medium"
            >
              {showIncidents ? "Hide Incidents" : "Incidents"}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(monitor)}
              className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded hover:bg-indigo-50 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(monitor._id)}
              className="text-rose-600 hover:text-rose-900 px-2 py-1 rounded hover:bg-rose-50 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Incident History */}
      {showIncidents && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/70 rounded-b-xl">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-700">Incident History</h5>
            <button
              onClick={() => setShowIncidents(false)}
              className="text-[10px] text-gray-500 hover:text-gray-700 underline"
            >
              Close
            </button>
          </div>
          <IncidentList monitorId={monitor._id} />
        </div>
      )}
    </div>
  );
}
