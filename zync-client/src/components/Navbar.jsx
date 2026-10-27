import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout, isConnected } = useAuth(); // 1. Consume isConnected

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            Z
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">Zync</span>
          <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            Live Health
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`}
                title={isConnected ? "Real-time socket active" : "Socket offline"}
              />
              <span className="hidden md:inline">
                {isConnected ? "Real-time Connected" : "Connecting..."}
              </span>
            </div>

            <div className="text-sm font-medium text-gray-700 hidden sm:block">
              {user.name || user.email}
            </div>

            <button
              onClick={logout}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}