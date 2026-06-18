import React, { useState, useEffect } from 'react';
import { ShieldAlert, Database, RefreshCw, Key, UserCheck, CalendarDays, Sliders } from 'lucide-react';
import { UserInfo, Booking, ApiResponse } from '../types.js';

interface DevDashboardProps {
  currentUser: UserInfo;
  activeView: 'dev' | 'host' | 'booker';
  setActiveView: (view: 'dev' | 'host' | 'booker') => void;
  onRefreshData?: () => void;
}

export default function DevDashboard({ currentUser, activeView, setActiveView, onRefreshData }: DevDashboardProps) {
  const [dbState, setDbState] = useState<{
    users: Array<UserInfo & { password?: string }>;
    bookings: Booking[];
    availability: any;
    hangouts: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDevData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch full backup from raw dev endpoint using backdoor credentials
      const response = await fetch(`/api/dev/users?devKey=asher29001`);
      const res = await response.json();
      if (res.success) {
        setDbState(res.data);
      } else {
        setError(res.error || 'Failed to extract database state.');
      }
    } catch (err) {
      setError('Failed to reach developer route.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevData();
  }, []);

  return (
    <div id="dev-backdoor-panel" className="bg-amber-50 border-b border-amber-200 py-3.5 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-1 px-2.5 bg-amber-600 text-white rounded-lg flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5 animate-bounce" /> Root Backdoor Access
          </div>
          <span className="text-sm text-amber-900 font-sans font-medium">
            Welcome, Developer. You have instant system override privileges.
          </span>
        </div>

        {/* Override View Controllers */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="font-mono font-bold text-amber-800">Switch View:</span>
          
          <button
            onClick={() => setActiveView('dev')}
            className={`px-3 py-1.5 font-medium rounded-lg border transition-all cursor-pointer ${
              activeView === 'dev'
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 inline mr-1" /> Dev Console
          </button>

          <button
            onClick={() => setActiveView('host')}
            className={`px-3 py-1.5 font-medium rounded-lg border transition-all cursor-pointer ${
              activeView === 'host'
                ? 'bg-amber-900 text-white border-amber-950 shadow-sm animate-pulse'
                : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 inline mr-1" /> Inspect Host UI
          </button>

          <button
            onClick={() => setActiveView('booker')}
            className={`px-3 py-1.5 font-medium rounded-lg border transition-all cursor-pointer ${
              activeView === 'booker'
                ? 'bg-amber-900 text-white border-amber-950 shadow-sm'
                : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Inspect Booker UI
          </button>

          <button
            onClick={() => {
              fetchDevData();
              if (onRefreshData) onRefreshData();
            }}
            disabled={isLoading}
            className="p-1.5 bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 rounded-lg transition-all"
            title="Reload database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dev Console View Details Panel */}
      {activeView === 'dev' && (
        <div className="max-w-7xl mx-auto mt-4 bg-gray-900 text-gray-100 rounded-xl p-6 border border-gray-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-850 pb-3">
            <h3 className="font-mono text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Key className="w-4 h-4" /> Internal Database State (Encrypted Credentials Bypass)
            </h3>
            <span className="text-[10px] font-mono text-gray-500">SECRET COMPLIANCE VERIFICATION PROBE V1.0</span>
          </div>

          {error && (
            <div className="p-3 text-sm bg-red-900/40 text-red-300 border border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User credentials panel (Plain passwords) */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                <span>●</span> Registered Profiles & Credentials
              </h4>
              <div className="bg-gray-950 rounded-lg border border-gray-805 overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 border-b border-gray-805">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Plain Password</th>
                      <th className="py-2.5 px-3">Sys Role</th>
                      <th className="py-2.5 px-3">Database ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbState?.users && dbState.users.length > 0 ? (
                      dbState.users.map((u) => (
                        <tr key={u.id} className="border-b border-gray-850 hover:bg-gray-900/50">
                          <td className="py-2.5 px-3 font-semibold text-emerald-400">{u.username}</td>
                          <td className="py-2.5 px-3 text-yellow-400 font-bold tracking-wider select-all">{u.password || '(no-pwd)'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              u.role === 'host' ? 'bg-amber-950/50 text-amber-300 border border-amber-900/40' : 'bg-blue-950/50 text-blue-300 border border-blue-900/40'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 select-all">{u.id}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Core Database Metrics */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                <span>●</span> System Infrastructure Statistics
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-805">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Booker Records count</div>
                  <div className="text-2xl font-mono font-bold text-blue-400 mt-1">
                    {dbState?.users.filter(u => u.role === 'booker').length || 0}
                  </div>
                </div>

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-805">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Host Records Count</div>
                  <div className="text-2xl font-mono font-bold text-amber-500 mt-1">
                    {dbState?.users.filter(u => u.role === 'host').length || 0}
                  </div>
                </div>

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-805">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Active Hangouts</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    {dbState?.bookings.length || 0}
                  </div>
                </div>

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-805">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Blocked Spans</div>
                  <div className="text-2xl font-mono font-bold text-red-400 mt-1">
                    {dbState?.availability.blockedSlots.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wide text-gray-400">
              ● Active DB Diagnostics JSON
            </h4>
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-805 max-h-56 overflow-y-auto">
              <pre className="text-[11px] font-mono text-gray-400 leading-relaxed select-all">
                {dbState ? JSON.stringify(dbState, null, 2) : 'Loading DB State...'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
