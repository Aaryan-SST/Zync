import { useState, useEffect } from "react";

export default function MonitorForm({ initialData = null, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    intervalSeconds: 60,
    expectedStatusCode: 200,
    maxLatencyMs: 2000,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        url: initialData.url || "",
        intervalSeconds: initialData.intervalSeconds || 60,
        expectedStatusCode: initialData.expectedStatusCode || 200,
        maxLatencyMs: initialData.maxLatencyMs || 2000,
      });
    } else {
      setFormData({
        name: "",
        url: "",
        intervalSeconds: 60,
        expectedStatusCode: 200,
        maxLatencyMs: 2000,
      });
    }
    setErrors({});
    setServerError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.url.trim()) {
      errs.url = "URL is required";
    } else {
      try {
        const parsed = new URL(formData.url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          errs.url = "URL must start with http:// or https://";
        }
      } catch {
        errs.url = "Enter a valid URL";
      }
    }

    const interval = Number(formData.intervalSeconds);
    if (!interval || interval < 10 || interval > 86400) {
      errs.intervalSeconds = "Interval must be between 10 and 86400 seconds";
    }

    const status = Number(formData.expectedStatusCode);
    if (!status || status < 100 || status > 599) {
      errs.expectedStatusCode = "Status code must be between 100 and 599";
    }

    const latency = Number(formData.maxLatencyMs);
    if (!latency || latency < 1 || latency > 60000) {
      errs.maxLatencyMs = "Max latency must be between 1 and 60000 ms";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError("");

    try {
      await onSave({
        ...formData,
        intervalSeconds: Number(formData.intervalSeconds),
        expectedStatusCode: Number(formData.expectedStatusCode),
        maxLatencyMs: Number(formData.maxLatencyMs),
      });
      onClose();
    } catch (err) {
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach((e) => {
          if (e.field) fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      }
      setServerError(err.response?.data?.message || "Failed to save monitor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <h3 className="text-lg font-semibold text-gray-900">
            {initialData ? "Edit Monitor" : "Create New Monitor"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Monitor Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Production API Health"
              className="w-full px-3 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Target URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.example.com/health"
              className="w-full px-3 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.url && <p className="text-xs text-rose-600 mt-1">{errors.url}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Interval (sec)
              </label>
              <input
                type="number"
                value={formData.intervalSeconds}
                onChange={(e) => setFormData({ ...formData, intervalSeconds: e.target.value })}
                min="10"
                max="86400"
                className="w-full px-3 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.intervalSeconds && (
                <p className="text-xs text-rose-600 mt-1">{errors.intervalSeconds}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expected Status
              </label>
              <input
                type="number"
                value={formData.expectedStatusCode}
                onChange={(e) => setFormData({ ...formData, expectedStatusCode: e.target.value })}
                min="100"
                max="599"
                className="w-full px-3 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.expectedStatusCode && (
                <p className="text-xs text-rose-600 mt-1">{errors.expectedStatusCode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Latency (ms)
              </label>
              <input
                type="number"
                value={formData.maxLatencyMs}
                onChange={(e) => setFormData({ ...formData, maxLatencyMs: e.target.value })}
                min="1"
                max="60000"
                className="w-full px-3 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.maxLatencyMs && (
                <p className="text-xs text-rose-600 mt-1">{errors.maxLatencyMs}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : initialData ? "Update Monitor" : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
