import React from 'react';
import { HealthStatus } from '../services/api';
import { Database, Radio, Wifi, AlertTriangle, ShieldAlert } from 'lucide-react';

interface SystemStatusBarProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  activeIncidentsCount: number;
  criticalAlertsCount: number;
  lastSyncTime: string;
  dispatchesCount?: number;
  activeTrucksCount?: number;
  blockedRoutesCount?: number;
  pendingApprovalsCount?: number;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  health,
  healthLoading,
  activeIncidentsCount,
  criticalAlertsCount,
  lastSyncTime,
  dispatchesCount = 3,
  activeTrucksCount = 1,
  blockedRoutesCount = 1,
  pendingApprovalsCount = 1,
}) => {
  const isApiOnline = !healthLoading && health?.status === 'healthy';
  const isDbOnline = health?.database?.connected ?? false;
  const isPostGISOnline = health?.database?.postgis_available ?? false;

  return (
    <header className="bg-command-panel border-b border-command-border px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10 shadow-lg">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <ShieldAlert className="h-6 w-6 text-command-accent animate-pulse" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-command-text flex items-center space-x-2">
            <span>NER Disaster & Logistics Command Center</span>
            <span className="bg-command-card text-[10px] text-command-accent px-2 py-0.5 rounded border border-command-border">
              DEMO / SYNTHETIC ACTIVE
            </span>
          </div>
          <div className="text-[10px] text-command-muted">
            North Eastern Region • Assam, Meghalaya, Sikkim, Nagaland
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Indicators */}
      <div className="flex items-center flex-wrap gap-3 text-xs">
        {/* API Backend Health */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border ${
          isApiOnline ? 'bg-command-success/10 text-command-success border-command-success/20' : 'bg-command-danger/10 text-command-danger border-command-danger/20'
        }`}>
          <Radio size={14} className={isApiOnline ? 'animate-pulse' : ''} />
          <span className="font-semibold text-[11px]">API: {isApiOnline ? 'ONLINE' : 'UNAVAILABLE'}</span>
        </div>

        {/* Database & PostGIS Status */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border ${
          isDbOnline && isPostGISOnline ? 'bg-command-success/10 text-command-success border-command-success/20' : 'bg-command-warning/10 text-command-warning border-command-warning/20'
        }`}>
          <Database size={14} />
          <span className="font-semibold text-[11px]">
            POSTGIS: {isDbOnline && isPostGISOnline ? 'READY' : 'OFFLINE / NO DB'}
          </span>
        </div>

        {/* Real-Time Operational Overview Status Counters */}
        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span className="bg-command-card text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
            TRUCKS: {activeTrucksCount} EN ROUTE
          </span>
          <span className="bg-command-card text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
            ROADS: {blockedRoutesCount} AT RISK
          </span>
          <span className="bg-command-card text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
            DISPATCHES: {dispatchesCount} ({pendingApprovalsCount} PENDING)
          </span>
        </div>

        {/* Active Incidents & Critical Alerts Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-command-danger/10 text-command-danger border border-command-danger/20">
          <AlertTriangle size={14} />
          <span className="font-bold text-[11px]">
            {activeIncidentsCount} Incidents ({criticalAlertsCount} Critical)
          </span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center space-x-1.5 text-command-muted text-[11px] border-l border-command-border pl-3">
          <Wifi size={13} />
          <span>Sync: {lastSyncTime}</span>
        </div>
      </div>
    </header>
  );
};
