import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Flame,
  Route,
  Truck,
  Box,
  Bell,
  Bot,
  FileText,
  Settings as SettingsIcon,
  ShieldAlert,
  MapPin,
  Menu,
  X,
  RefreshCw,
  Send
} from 'lucide-react';
import {
  api,
  DisasterEvent,
  RoadSegment,
  LogisticsHub,
  DispatchOrder,
  AIAuditLog,
  HealthStatus
} from './services/api';
import { MapView } from './components/MapView';
import { SystemStatusBar } from './components/SystemStatusBar';
import { DisasterPanel } from './components/DisasterPanel';
import { RoutePanel } from './components/RoutePanel';
import { LogisticsPanel } from './components/LogisticsPanel';
import { ResourcePanel } from './components/ResourcePanel';
import { AlertsPanel } from './components/AlertsPanel';
import { AIOperationsPanel } from './components/AIOperationsPanel';
import { AuditLogPanel } from './components/AuditLogPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { DispatchOperationsView } from './components/DispatchOperationsView';
import { DispatchTelemetryPanel } from './components/DispatchTelemetryPanel';
import { DispatchDetailDrawer } from './components/DispatchDetailDrawer';

import { FieldReportsPanel } from './components/FieldReportsPanel';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'disasters', label: 'Disaster Intelligence', icon: Flame, badge: 'Live' },
  { id: 'routes', label: 'Route Intelligence', icon: Route },
  { id: 'logistics', label: 'Logistics Overview', icon: Truck },
  { id: 'dispatches', label: 'Dispatch Approvals', icon: Send, badge: 'HITL' },
  { id: 'field-reports', label: 'Field Reports (Sync)', icon: FileText, badge: 'Offline' },
  { id: 'resources', label: 'Resource Inventory', icon: Box },
  { id: 'alerts', label: 'Real-time Alerts', icon: Bell, badge: '4' },
  { id: 'ai-ops', label: 'AI Operations', icon: Bot },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
  { id: 'settings', label: 'System Settings', icon: SettingsIcon },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // State
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [roads, setRoads] = useState<RoadSegment[]>([]);
  const [affectedRoads, setAffectedRoads] = useState<RoadSegment[]>([]);
  const [hubs, setHubs] = useState<LogisticsHub[]>([]);
  const [dispatches, setDispatches] = useState<DispatchOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AIAuditLog[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected features
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterEvent | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
  const [selectedHub, setSelectedHub] = useState<LogisticsHub | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, disastersData, roadsData, affectedRoadsData, hubsData, dispatchesData, logsData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getDisasters().catch(() => []),
        api.getRoads().catch(() => []),
        api.getAffectedRoads().catch(() => []),
        api.getHubs().catch(() => []),
        api.getDispatches().catch(() => []),
        api.getAuditLogs().catch(() => []),
      ]);

      setHealth(healthData);
      setHealthLoading(false);
      setDisasters(disastersData);
      setRoads(roadsData);
      setAffectedRoads(affectedRoadsData);
      setHubs(hubsData);
      setDispatches(dispatchesData);
      setAuditLogs(logsData);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API backend');
    } finally {
      setLoading(false);
    }
  };

  // Poll backend data & driver telemetry every 15 seconds
  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-command-bg text-command-text">
      {/* System Status Bar */}
      <SystemStatusBar
        health={health}
        healthLoading={healthLoading}
        activeIncidentsCount={disasters.filter((d) => d.status === 'ACTIVE').length}
        criticalAlertsCount={disasters.filter((d) => d.severity === 'CRITICAL').length}
        lastSyncTime={lastSyncTime}
        dispatchesCount={dispatches.length}
        activeTrucksCount={dispatches.filter((dp) => String(dp.status) === 'EN_ROUTE' || dp.status === 'APPROVED' || dp.status === 'DISPATCHED').length || 1}
        blockedRoutesCount={roads.filter((r) => r.current_status === 'BLOCKED' || r.current_status === 'CAUTION' || r.current_status === 'IMPASSABLE').length}
        pendingApprovalsCount={dispatches.filter((dp) => dp.status === 'PROPOSED' || dp.status === 'PENDING_APPROVAL').length}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } transition-all duration-300 bg-command-panel border-r border-command-border flex flex-col z-20 shrink-0`}
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-command-border">
            {sidebarOpen ? (
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-command-accent animate-pulse" />
                <span className="font-bold text-xs tracking-wider uppercase text-command-text">
                  SLI Command
                </span>
              </div>
            ) : (
              <ShieldAlert className="h-5 w-5 text-command-accent mx-auto" />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded text-command-muted hover:text-command-text hover:bg-command-border transition-colors"
              aria-label="Toggle Sidebar"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          {/* Region Tag */}
          {sidebarOpen && (
            <div className="px-4 py-2 bg-command-card/50 border-b border-command-border/50 text-xs flex items-center text-command-muted">
              <MapPin size={12} className="mr-1.5 text-command-accent shrink-0" />
              <span className="truncate">North Eastern Region (NER)</span>
            </div>
          )}

          {/* Nav list */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-command-accent/20 text-command-accent border border-command-accent/30'
                      : 'text-command-muted hover:text-command-text hover:bg-command-card'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-command-accent' : 'text-command-muted'} />
                  {sidebarOpen && (
                    <span className="ml-3 flex-1 text-left truncate">{item.label}</span>
                  )}
                  {sidebarOpen && item.badge && (
                    <span className="ml-auto bg-command-danger/20 text-command-danger px-1.5 py-0.5 rounded text-[10px] font-bold border border-command-danger/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Refresh Action */}
          {sidebarOpen && (
            <div className="p-3 border-t border-command-border bg-command-card/30 flex items-center justify-between text-[11px] text-command-muted">
              <span>Sync Status</span>
              <button
                onClick={loadData}
                className="flex items-center space-x-1 text-command-accent hover:text-white"
                title="Refresh Data"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-hidden bg-command-bg flex flex-col">
          {activeTab === 'dashboard' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
              {/* Left Column: Disaster Intelligence Feed */}
              <div className="lg:col-span-3 h-full overflow-hidden">
                <DisasterPanel
                  disasters={disasters}
                  loading={loading}
                  error={error}
                  selectedDisasterId={selectedDisaster?.id}
                  onSelectDisaster={(d) => setSelectedDisaster(d)}
                />
              </div>

              {/* Center Column: Interactive GIS Map */}
              <div className="lg:col-span-6 h-full overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MapView
                    disasters={disasters}
                    roads={roads}
                    hubs={hubs}
                    dispatches={dispatches}
                    selectedDisasterId={selectedDisaster?.id}
                    onSelectDisaster={(d) => setSelectedDisaster(d)}
                    onSelectHub={(h) => setSelectedHub(h)}
                    onSelectRoad={(r) => setSelectedRoad(r)}
                    onSelectDispatch={(disp) => setSelectedDispatch(disp)}
                  />
                </div>
              </div>

              {/* Right Column: Route, Hubs & Live Dispatch Telemetry */}
              <div className="lg:col-span-3 h-full overflow-y-auto space-y-3 pr-1">
                <RoutePanel
                  roads={roads}
                  affectedRoads={affectedRoads}
                  loading={loading}
                  selectedRoad={selectedRoad}
                  onSelectRoad={(r) => setSelectedRoad(r)}
                />
                <LogisticsPanel
                  hubs={hubs}
                  loading={loading}
                  selectedHub={selectedHub}
                  onSelectHub={(h) => setSelectedHub(h)}
                />
                <DispatchTelemetryPanel
                  dispatches={dispatches}
                  hubs={hubs}
                  roads={roads}
                  loading={loading}
                  onSelectDispatch={(disp) => setSelectedDispatch(disp)}
                />
              </div>
            </div>
          )}

          {activeTab === 'disasters' && (
            <div className="flex-1 h-full overflow-hidden">
              <DisasterPanel
                disasters={disasters}
                loading={loading}
                error={error}
                selectedDisasterId={selectedDisaster?.id}
                onSelectDisaster={(d) => setSelectedDisaster(d)}
              />
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="flex-1 h-full overflow-hidden">
              <RoutePanel
                roads={roads}
                affectedRoads={affectedRoads}
                loading={loading}
                selectedRoad={selectedRoad}
                onSelectRoad={(r) => setSelectedRoad(r)}
                fullPageMode={true}
                disasters={disasters}
                hubs={hubs}
                dispatches={dispatches}
              />
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="flex-1 h-full overflow-hidden">
              <LogisticsPanel
                hubs={hubs}
                loading={loading}
                selectedHub={selectedHub}
                onSelectHub={(h) => setSelectedHub(h)}
                fullPageMode={true}
                dispatches={dispatches}
                roads={roads}
                disasters={disasters}
                onSelectDispatch={(disp) => setSelectedDispatch(disp)}
              />
            </div>
          )}

          {activeTab === 'dispatches' && (
            <div className="flex-1 h-full overflow-hidden">
              <DispatchOperationsView hubs={hubs} onDataRefresh={loadData} />
            </div>
          )}

          {activeTab === 'field-reports' && (
            <div className="flex-1 h-full overflow-hidden">
              <FieldReportsPanel />
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="flex-1 h-full overflow-hidden">
              <ResourcePanel hubs={hubs} loading={loading} />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="flex-1 h-full overflow-hidden">
              <AlertsPanel />
            </div>
          )}

          {activeTab === 'ai-ops' && (
            <div className="flex-1 h-full overflow-hidden">
              <AIOperationsPanel />
            </div>
          )}

          {activeTab === 'audit-logs' && (
            <div className="flex-1 h-full overflow-hidden">
              <AuditLogPanel logs={auditLogs} loading={loading} error={error} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 h-full overflow-hidden">
              <SettingsPanel
                lastSyncTime={lastSyncTime}
                onRefreshData={loadData}
              />
            </div>
          )}
        </main>
      </div>

      {/* Live Dispatch Detail Sliding Drawer */}
      <DispatchDetailDrawer
        dispatch={selectedDispatch}
        hubs={hubs}
        roads={roads}
        onClose={() => setSelectedDispatch(null)}
      />
    </div>
  );
};

export default App;
