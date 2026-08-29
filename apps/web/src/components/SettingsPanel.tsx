import React, { useState, useEffect } from 'react';
import {
  Settings,
  Activity,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Map,
  Bell,
  ShieldCheck,
  Radio,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsPanelProps {
  lastSyncTime?: string;
  onRefreshData?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  lastSyncTime = 'Just now',
  onRefreshData,
}) => {
  // Operational state
  const [operationalMode, setOperationalMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [refreshing, setSubmittingRefresh] = useState<boolean>(false);

  // Local notification preferences state
  const [alertsCritical, setAlertsCritical] = useState<boolean>(true);
  const [alertsRoute, setAlertsRoute] = useState<boolean>(true);
  const [alertsDispatch, setAlertsDispatch] = useState<boolean>(true);
  const [alertsStock, setAlertsStock] = useState<boolean>(true);

  // Check live API health
  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted) setApiOnline(res.status === 'ok' || res.database?.connected);
      })
      .catch(() => {
        if (isMounted) setApiOnline(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = () => {
    setSubmittingRefresh(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => {
      setSubmittingRefresh(false);
    }, 800);
  };

  const handleClearCache = () => {
    localStorage.clear();
    alert('Local browser cache cleared successfully.');
  };

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Settings size={22} className="text-command-accent animate-pulse" />
          <div>
            <h1 className="text-sm font-extrabold text-command-text uppercase tracking-wider">
              SYSTEM SETTINGS
            </h1>
            <p className="text-[11px] text-command-muted">
              Command Center Operational Configuration
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-command-card text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-mono font-bold flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
          <span>OPERATIONAL MODE</span>
        </span>
      </div>

      {/* Main Form Content */}
      <div className="space-y-5 overflow-y-auto pr-1 text-xs min-h-0 flex-1">
        {/* 1. System Health Status Grid */}
        <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
          <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
            <Activity size={15} className="text-command-accent" />
            <span>SYSTEM HEALTH</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            {/* API Service */}
            <div className="bg-command-bg/80 p-3 rounded border border-command-border/50 flex flex-col justify-between">
              <span className="text-command-muted text-[10px] font-sans">API SERVICE</span>
              <span className={`font-extrabold text-xs mt-1 flex items-center space-x-1 ${apiOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                <CheckCircle2 size={12} />
                <span>{apiOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </span>
            </div>

            {/* Database */}
            <div className="bg-command-bg/80 p-3 rounded border border-command-border/50 flex flex-col justify-between">
              <span className="text-command-muted text-[10px] font-sans">DATABASE</span>
              <span className="font-extrabold text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 size={12} />
                <span>READY</span>
              </span>
            </div>

            {/* GIS Services */}
            <div className="bg-command-bg/80 p-3 rounded border border-command-border/50 flex flex-col justify-between">
              <span className="text-command-muted text-[10px] font-sans">GIS SERVICES</span>
              <span className="font-extrabold text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 size={12} />
                <span>READY</span>
              </span>
            </div>

            {/* AI Decision Engine */}
            <div className="bg-command-bg/80 p-3 rounded border border-command-border/50 flex flex-col justify-between">
              <span className="text-command-muted text-[10px] font-sans">AI DECISION ENGINE</span>
              <span className="font-extrabold text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 size={12} />
                <span>READY</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Operational Mode & Data Synchronization Split Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operational Mode */}
          <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-3">
            <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
              <Radio size={15} className="text-command-accent" />
              <span>OPERATIONAL MODE</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2.5 cursor-pointer bg-command-bg/60 p-2.5 rounded border border-command-border/60 hover:border-command-accent">
                <input
                  type="radio"
                  name="operationalMode"
                  checked={operationalMode === 'DEMO'}
                  onChange={() => setOperationalMode('DEMO')}
                  className="text-command-accent focus:ring-0 bg-slate-900 border-command-border"
                />
                <span className="font-bold text-command-text text-xs">● DEMO / SYNTHETIC DATA</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer bg-command-bg/60 p-2.5 rounded border border-command-border/60 hover:border-command-accent opacity-60">
                <input
                  type="radio"
                  name="operationalMode"
                  checked={operationalMode === 'LIVE'}
                  onChange={() => setOperationalMode('LIVE')}
                  className="text-command-accent focus:ring-0 bg-slate-900 border-command-border"
                  disabled
                />
                <span className="font-bold text-command-muted text-xs">○ LIVE OPERATIONAL DATA (Restricted)</span>
              </label>
            </div>

            <p className="text-[10px] text-command-muted leading-relaxed font-sans pt-1 border-t border-command-border/40">
              Demo mode uses controlled synthetic disaster, logistics, route and dispatch data for command-center operations and demonstrations.
            </p>
          </div>

          {/* Data Synchronization */}
          <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-3 flex flex-col justify-between">
            <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
              <RefreshCw size={15} className="text-command-accent" />
              <span>DATA SYNCHRONIZATION</span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between bg-command-bg/60 p-2 rounded border border-command-border/50">
                <span className="text-command-muted font-sans">Last Synchronization:</span>
                <span className="font-bold text-emerald-400">{lastSyncTime}</span>
              </div>
              <div className="flex justify-between bg-command-bg/60 p-2 rounded border border-command-border/50">
                <span className="text-command-muted font-sans">Refresh Interval:</span>
                <span className="font-bold text-command-text">5 Minutes</span>
              </div>
              <div className="flex justify-between bg-command-bg/60 p-2 rounded border border-command-border/50">
                <span className="text-command-muted font-sans">Connection Status:</span>
                <span className="font-bold text-emerald-400">ONLINE</span>
              </div>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full bg-command-accent/20 hover:bg-command-accent text-command-accent hover:text-slate-950 font-extrabold border border-command-accent/50 py-2 rounded transition-all flex items-center justify-center space-x-2 uppercase tracking-wider text-xs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing Telemetry...' : 'Refresh Data Now'}</span>
            </button>
          </div>
        </div>

        {/* 3. Safety & Approval Controls */}
        <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
          <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>SAFETY & APPROVAL CONTROLS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 font-semibold flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              <span>Human approval required for dispatch sign-off</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 font-semibold flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              <span>Human confirmation required for route blocking</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 font-semibold flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              <span>Human confirmation required for resource allocation</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 font-semibold flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              <span>Critical hazard alerts require commander acknowledgement</span>
            </div>
          </div>
        </div>

        {/* 4. Regional Operating Area & Map Preferences Split Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Regional Operating Area */}
          <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
            <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
              <MapPin size={15} className="text-command-accent" />
              <span>REGIONAL OPERATING AREA</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="text-command-text font-bold">Region: North Eastern Region (NER)</div>
              <div className="text-command-muted text-[10px] leading-relaxed font-sans">
                Primary States: Assam, Meghalaya, Sikkim, Nagaland, Mizoram, Tripura, Arunachal Pradesh, Manipur
              </div>
              <div className="text-command-accent font-bold text-[10px]">
                Coverage: Full Regional Vector & Satellite Topo Layer
              </div>
            </div>
          </div>

          {/* Map Preferences */}
          <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
            <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
              <Map size={15} className="text-command-accent" />
              <span>MAP PREFERENCES</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="text-command-muted">Default View: <strong className="text-command-text">North Eastern Region (NER)</strong></div>
              <div className="text-command-muted flex items-center space-x-2 pt-1 font-mono text-[10px]">
                <span className="text-emerald-400">☑ Hazards</span>
                <span className="text-emerald-400">☑ Roads</span>
                <span className="text-emerald-400">☑ Hubs</span>
                <span className="text-emerald-400">☑ Vehicles</span>
                <span className="text-emerald-400">☑ Zones</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Notification / Alert Preferences */}
        <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
          <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
            <Bell size={15} className="text-amber-400" />
            <span>ALERT PREFERENCES</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <label className="bg-command-bg/60 p-2 rounded border border-command-border flex items-center justify-between cursor-pointer">
              <span className="text-command-text">Critical Disaster</span>
              <input
                type="checkbox"
                checked={alertsCritical}
                onChange={(e) => setAlertsCritical(e.target.checked)}
                className="rounded bg-slate-900 border-command-border text-command-accent focus:ring-0"
              />
            </label>
            <label className="bg-command-bg/60 p-2 rounded border border-command-border flex items-center justify-between cursor-pointer">
              <span className="text-command-text">Route Blockage</span>
              <input
                type="checkbox"
                checked={alertsRoute}
                onChange={(e) => setAlertsRoute(e.target.checked)}
                className="rounded bg-slate-900 border-command-border text-command-accent focus:ring-0"
              />
            </label>
            <label className="bg-command-bg/60 p-2 rounded border border-command-border flex items-center justify-between cursor-pointer">
              <span className="text-command-text">Dispatch Exceptions</span>
              <input
                type="checkbox"
                checked={alertsDispatch}
                onChange={(e) => setAlertsDispatch(e.target.checked)}
                className="rounded bg-slate-900 border-command-border text-command-accent focus:ring-0"
              />
            </label>
            <label className="bg-command-bg/60 p-2 rounded border border-command-border flex items-center justify-between cursor-pointer">
              <span className="text-command-text">Low Stock Alerts</span>
              <input
                type="checkbox"
                checked={alertsStock}
                onChange={(e) => setAlertsStock(e.target.checked)}
                className="rounded bg-slate-900 border-command-border text-command-accent focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* 6. Command Center Actions */}
        <div className="p-4 bg-command-card/60 border border-command-border rounded-lg space-y-2.5">
          <div className="font-bold text-xs text-command-text uppercase tracking-wider flex items-center space-x-2">
            <RotateCcw size={15} className="text-command-accent" />
            <span>SYSTEM ACTIONS</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1.5 bg-command-card hover:bg-command-border text-command-text font-bold rounded border border-command-border flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw size={13} />
              <span>Refresh Telemetry Data</span>
            </button>

            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 bg-command-danger/20 hover:bg-command-danger text-command-danger hover:text-white font-bold rounded border border-command-danger/40 flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Clear Local Browser Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
