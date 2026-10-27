// zync-client/src/components/IncidentList.jsx

import { useState, useEffect } from "react";
import { getIncidents } from "../services/api.js";

export default function IncidentList({ monitorId }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getIncidents({ monitorId, limit: 10 })
      .then((res) => {
        if (isMounted) {
          setIncidents(res.data?.incidents || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load incidents");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [monitorId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-gray-500 animate-pulse">
        Loading incident history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-center text-xs text-rose-600 bg-rose-50 rounded">
        {error}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-gray-500 bg-gray-50 rounded border border-gray-100">
        No incidents recorded for this monitor.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-left text-xs text-gray-600 min-w-[320px]">
        <thead className="text-[10px] font-semibold uppercase bg-gray-50 text-gray-400 border-b border-gray-200 tracking-wider">
          <tr>
            <th className="py-1.5 px-2">Status</th>
            <th className="py-1.5 px-2">Title</th>
            <th className="py-1.5 px-2">Started</th>
            <th className="py-1.5 px-2">Resolved</th>
            <th className="py-1.5 px-2 text-right">Downtime</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {incidents.map((incident) => {
            const isOpen = incident.status === "OPEN";

            const formatDate = (dateStr) => {
              if (!dateStr) return null;
              return new Date(dateStr).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
            };

            const started = formatDate(incident.startedAt) || "—";
            const resolved = formatDate(incident.resolvedAt) || "Ongoing";
            const downtime =
              incident.downtimeSeconds !== null && incident.downtimeSeconds !== undefined
                ? `${incident.downtimeSeconds}s`
                : "Active";

            return (
              <tr key={incident._id} className="hover:bg-gray-50/50">
                <td className="py-2 px-2 whitespace-nowrap font-medium">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isOpen
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {incident.status}
                  </span>
                </td>
                <td
                  className="py-2 px-2 text-gray-900 font-medium max-w-[100px] truncate"
                  title={incident.title}
                >
                  {incident.title}
                </td>
                <td className="py-2 px-2 text-gray-500 whitespace-nowrap text-[11px]">
                  {started}
                </td>
                <td className="py-2 px-2 text-gray-500 whitespace-nowrap text-[11px]">
                  {resolved}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-700 whitespace-nowrap text-[11px]">
                  {downtime}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}