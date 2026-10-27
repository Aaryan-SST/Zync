import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
} from "../services/api.js";
import MonitorCard from "../components/MonitorCard.jsx";
import MonitorForm from "../components/MonitorForm.jsx";

export default function DashboardPage() {
  const { socket } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);

  // Fetch monitors (supports silent background refetching)
  const loadMonitors = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await getMonitors();
      setMonitors(res.data?.monitors || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load monitors");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors(true);
  }, []);

  // Real-time socket event handling
  useEffect(() => {
    if (!socket) return;

    function handlePingUpdate(payload) {
      console.log("[socket] PING_UPDATE received for monitor:", payload.monitorId, payload.status);

      setMonitors((prevMonitors) => {
        let shouldRefetchIncidents = false;

        const updatedMonitors = prevMonitors.map((m) => {
          if (m._id !== payload.monitorId) return m;

          // Detect if incident state changed (incident opened or resolved)
          if (m.activeIncidentId !== payload.activeIncidentId) {
            shouldRefetchIncidents = true;
          }

          const newPingEntry = {
            timestamp: payload.timestamp,
            responseTimeMs: payload.responseTimeMs,
            statusCode: payload.statusCode,
            isSuccess: payload.isSuccess,
            errorMessage: payload.errorMessage,
          };

          const updatedHistory = [newPingEntry, ...(m.pingHistory || [])].slice(0, 50);

          return {
            ...m,
            status: payload.status,
            lastCheckedAt: payload.timestamp,
            consecutiveFailures: payload.consecutiveFailures,
            activeIncidentId: payload.activeIncidentId,
            pingHistory: updatedHistory,
            // Update active/incident data if directly provided in payload
            ...(payload.incidents && { incidents: payload.incidents }),
            ...(payload.activeIncident !== undefined && { activeIncident: payload.activeIncident }),
          };
        });

        // Trigger silent background refetch to pull new Incident document from MongoDB
        if (shouldRefetchIncidents) {
          loadMonitors(false);
        }

        return updatedMonitors;
      });
    }

    function handleIncidentEvent() {
      // Silently sync monitors when incident socket events are emitted
      loadMonitors(false);
    }

    socket.on("PING_UPDATE", handlePingUpdate);
    socket.on("INCIDENT_CREATED", handleIncidentEvent);
    socket.on("INCIDENT_RESOLVED", handleIncidentEvent);
    socket.on("INCIDENT_UPDATED", handleIncidentEvent);

    return () => {
      socket.off("PING_UPDATE", handlePingUpdate);
      socket.off("INCIDENT_CREATED", handleIncidentEvent);
      socket.off("INCIDENT_RESOLVED", handleIncidentEvent);
      socket.off("INCIDENT_UPDATED", handleIncidentEvent);
    };
  }, [socket]);

  // Actions
  const handleOpenCreate = () => {
    setEditingMonitor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (monitor) => {
    setEditingMonitor(monitor);
    setIsModalOpen(true);
  };

  const handleSaveMonitor = async (formData) => {
    if (editingMonitor) {
      const res = await updateMonitor(editingMonitor._id, formData);
      const updated = res.data?.monitor;
      setMonitors((prev) =>
        prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
      );
    } else {
      const res = await createMonitor(formData);
      const created = res.data?.monitor;
      setMonitors((prev) => [created, ...prev]);
    }
  };

  const handleDeleteMonitor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this monitor?")) return;
    try {
      await deleteMonitor(id);
      setMonitors((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete monitor");
    }
  };

  const handleToggleMonitor = async (id) => {
    try {
      const res = await toggleMonitor(id);
      const updated = res.data?.monitor;
      setMonitors((prev) =>
        prev.map((m) => (m._id === id ? { ...m, isActive: updated.isActive, status: updated.status } : m))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle monitor state");
    }
  };

  // Aggregated Stats
  const total = monitors.length;
  const operational = monitors.filter((m) => m.status === "OPERATIONAL").length;
  const degraded = monitors.filter((m) => m.status === "DEGRADED").length;
  const down = monitors.filter((m) => m.status === "DOWN").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Monitors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time ping updates and automated incident tracking
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Add Monitor
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Monitors</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
          <div className="text-xs font-medium text-emerald-600 uppercase">Operational</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{operational}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
          <div className="text-xs font-medium text-amber-600 uppercase">Degraded</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{degraded}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs">
          <div className="text-xs font-medium text-rose-600 uppercase">Down</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{down}</div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-500">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <div>Loading your monitors...</div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
          <button
            onClick={() => loadMonitors(true)}
            className="ml-3 font-semibold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl mb-4">
            📡
          </div>
          <h3 className="text-base font-semibold text-gray-900">No monitors configured</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Get started by adding your first HTTP/HTTPS target to start monitoring health and response latency.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Create Your First Monitor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor._id}
              monitor={monitor}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteMonitor}
              onToggle={handleToggleMonitor}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Monitor Modal */}
      <MonitorForm
        isOpen={isModalOpen}
        initialData={editingMonitor}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMonitor}
      />
    </div>
  );
}