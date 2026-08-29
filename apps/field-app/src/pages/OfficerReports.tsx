import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { fieldReportStore, FieldReportItem } from '../services/fieldReportStore';
import { fieldReportSync } from '../services/fieldReportSync';

export const OfficerReports: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FieldReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Monitor network status and trigger auto-sync when online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      autoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch reports from IndexedDB
  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fieldReportStore.getAllReports();
      setReports(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const autoSync = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await fieldReportSync.syncPendingReports();
      setSyncMessage(res.message);
      await loadReports();
    } catch {
      // Fallback
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadReports().then(() => {
      if (navigator.onLine) {
        autoSync();
      }
    });
  }, []);

  // Summary counts
  const pendingCount = reports.filter((r) => r.syncStatus === 'PENDING').length;
  const syncedCount = reports.filter((r) => r.syncStatus === 'SYNCED').length;
  const failedCount = reports.filter((r) => r.syncStatus === 'FAILED').length;

  // Handle Manual SYNC NOW
  const handleSync = async () => {
    setSyncMessage(null);

    if (!isOnline) {
      setSyncMessage("You're offline. Reports remain safely stored on this device.");
      return;
    }

    setSyncing(true);
    try {
      const res = await fieldReportSync.syncPendingReports();
      setSyncMessage(res.message);
      await loadReports();
    } catch {
      setSyncMessage('Failed to complete synchronization.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-command-bg flex flex-col max-w-md mx-auto relative pb-20">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/officer-dashboard')}
            className="p-2 bg-command-card rounded-xl border border-command-border text-white hover:text-command-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">
              FIELD REPORTS
            </h1>
            <p className="text-[10px] text-command-muted font-mono">
              FastAPI Sync Engine
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/officer/report-incident')}
          className="bg-command-accent text-white p-2 rounded-xl border border-blue-400/50 shadow flex items-center space-x-1 text-xs font-bold"
        >
          <Plus size={16} />
          <span>NEW</span>
        </button>
      </div>

      {/* Network Status & Summary Metrics */}
      <div className="p-4 space-y-3 shrink-0">
        {/* Connection Banner */}
        <div className="flex items-center justify-between bg-command-panel border border-command-border p-3 rounded-xl text-xs font-mono">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Wifi size={14} className="animate-pulse" />
                <span>✓ ONLINE</span>
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center space-x-1">
                <WifiOff size={14} className="animate-pulse" />
                <span>⚠ OFFLINE</span>
              </span>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-command-card hover:bg-command-border border border-command-border text-command-accent px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-[0.98]"
          >
            {syncing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>{syncing ? 'SYNCING...' : 'SYNC NOW'}</span>
          </button>
        </div>

        {syncMessage && (
          <div className="p-2.5 bg-command-card border border-command-border text-amber-300 rounded-xl text-[11px] font-mono flex items-center space-x-2">
            {syncMessage.includes('synchronized') ? (
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
            )}
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="bg-command-panel p-2 rounded-xl border border-command-border">
            <span className="text-[9px] text-command-muted block">PENDING</span>
            <strong className="text-amber-400 font-black text-sm">{pendingCount}</strong>
          </div>
          <div className="bg-command-panel p-2 rounded-xl border border-command-border">
            <span className="text-[9px] text-command-muted block">SYNCED</span>
            <strong className="text-emerald-400 font-black text-sm">{syncedCount}</strong>
          </div>
          <div className="bg-command-panel p-2 rounded-xl border border-command-border">
            <span className="text-[9px] text-command-muted block">FAILED</span>
            <strong className="text-red-400 font-black text-sm">{failedCount}</strong>
          </div>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="px-4 space-y-2.5 flex-1 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center text-xs text-command-muted animate-pulse">
            Reading local offline reports...
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="p-8 text-center text-xs text-command-muted border border-dashed border-command-border rounded-2xl space-y-2">
            <p>No local field reports recorded yet.</p>
            <button
              onClick={() => navigate('/officer/report-incident')}
              className="px-3 py-1.5 bg-command-accent text-white rounded-xl text-xs font-bold"
            >
              Create First Report
            </button>
          </div>
        )}

        {!loading &&
          reports.map((report) => (
            <div
              key={report.clientGeneratedId}
              className="bg-command-panel border border-command-border p-3.5 rounded-2xl shadow-lg space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white text-xs truncate max-w-[60%]">
                  {report.reportType}
                </span>
                <span
                  className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                    report.severity === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                      : report.severity === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  }`}
                >
                  {report.severity}
                </span>
              </div>

              {/* Location Coordinates */}
              {report.latitude && report.longitude ? (
                <div className="flex items-center text-[10px] text-command-accent font-mono">
                  <MapPin size={11} className="mr-1 shrink-0" />
                  <span>
                    {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-command-muted font-mono italic">
                  GPS coordinates not attached
                </div>
              )}

              {/* Description */}
              <p className="text-[11px] text-command-text bg-command-bg/60 p-2 rounded-lg border border-command-border/40 leading-snug">
                {report.description}
              </p>

              {/* Footer Sync Badge */}
              <div className="flex items-center justify-between pt-1.5 border-t border-command-border/40 text-[10px] font-mono">
                <span className="text-command-muted flex items-center">
                  <Clock size={10} className="mr-1" />
                  {new Date(report.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                <span
                  className={`px-2 py-0.5 rounded border font-bold ${
                    report.syncStatus === 'SYNCED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : report.syncStatus === 'FAILED'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {report.syncStatus === 'SYNCED'
                    ? '✓ SYNCED'
                    : report.syncStatus === 'FAILED'
                    ? '✖ FAILED'
                    : '⚠ PENDING'}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
