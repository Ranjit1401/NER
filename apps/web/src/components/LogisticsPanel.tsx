import React, { useState, useMemo } from 'react';
import { LogisticsHub, DispatchOrder, RoadSegment, DisasterEvent } from '../services/api';
import {
  Warehouse,
  MapPin,
  Minus,
  Plus,
  Box,
  Building2,
  Phone,
} from 'lucide-react';
import { MapView } from './MapView';

interface LogisticsPanelProps {
  hubs: LogisticsHub[];
  loading: boolean;
  selectedHub?: LogisticsHub | null;
  onSelectHub?: (hub: LogisticsHub) => void;
  // Full page view additional props
  fullPageMode?: boolean;
  dispatches?: DispatchOrder[];
  roads?: RoadSegment[];
  disasters?: DisasterEvent[];
  onSelectDispatch?: (dispatch: DispatchOrder) => void;
}

export const LogisticsPanel: React.FC<LogisticsPanelProps> = ({
  hubs,
  loading,
  selectedHub,
  onSelectHub,
  fullPageMode = false,
  dispatches = [],
  roads = [],
  disasters = [],
  onSelectDispatch,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeHubDetail, setActiveHubDetail] = useState<LogisticsHub | null>(selectedHub || null);

  // Uniqueness deduplication based on stable database ID
  const uniqueHubs = useMemo(() => {
    const seen = new Set<string>();
    return hubs.filter((hub) => {
      if (seen.has(hub.id)) return false;
      seen.add(hub.id);
      return true;
    });
  }, [hubs]);

  // Derived metrics for summary bar
  const summary = useMemo(() => {
    const totalHubs = uniqueHubs.length;
    const operationalCount = uniqueHubs.filter((h) => h.status === 'OPERATIONAL').length;
    const depotCount = uniqueHubs.filter((h) => h.hub_type === 'DEPOT').length;
    const helipadCount = uniqueHubs.filter((h) => h.hub_type === 'HELIPAD').length;

    return { totalHubs, operationalCount, depotCount, helipadCount };
  }, [uniqueHubs]);

  const currentActiveHub = activeHubDetail || selectedHub || uniqueHubs[0] || null;

  const handleHubClick = (hub: LogisticsHub) => {
    setActiveHubDetail(hub);
    if (onSelectHub) onSelectHub(hub);
  };

  // If NOT fullPageMode, render the compact widget used in Dashboard Overview
  if (!fullPageMode) {
    return (
      <div className="bg-command-panel border border-command-border rounded-lg p-3 flex flex-col w-full shadow-xl overflow-hidden shrink-0">
        {/* Header */}
        <div className={`flex items-center justify-between ${collapsed ? '' : 'pb-2 border-b border-command-border mb-2'}`}>
          <div className="flex items-center space-x-2">
            <Warehouse size={16} className="text-command-accent shrink-0" />
            <h2 className="text-xs font-bold text-command-text uppercase tracking-wider">
              Logistics Depots & Hubs ({uniqueHubs.length})
            </h2>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-command-muted hover:text-white bg-command-card/80 hover:bg-command-card border border-command-border rounded transition-colors"
            title={collapsed ? "Expand Panel" : "Collapse Panel"}
          >
            {collapsed ? <Plus size={13} /> : <Minus size={13} />}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-2 overflow-y-auto max-h-[280px] pr-0.5">
            {loading && (
              <div className="p-4 text-center text-xs text-command-muted animate-pulse">
                Loading logistics depots status...
              </div>
            )}

            {!loading && uniqueHubs.length === 0 && (
              <div className="p-4 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
                No logistics hubs recorded.
              </div>
            )}

            {!loading &&
              uniqueHubs.map((hub) => {
                const isSelected = selectedHub?.id === hub.id;
                const itemCount = hub.inventory_items ? hub.inventory_items.length : 0;

                return (
                  <div
                    key={hub.id}
                    onClick={() => handleHubClick(hub)}
                    className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-command-accent/15 border-command-accent shadow-md'
                        : 'bg-command-card/50 border-command-border hover:bg-command-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-command-text flex items-center space-x-1.5 truncate pr-1">
                        <Warehouse size={13} className="text-command-accent shrink-0" />
                        <span className="truncate">{hub.name}</span>
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                          hub.status === 'OPERATIONAL'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {hub.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-command-muted flex items-center justify-between mt-1">
                      <span className="flex items-center space-x-1 truncate">
                        <MapPin size={10} className="text-command-accent shrink-0" />
                        <span className="truncate">{hub.state} ({hub.district})</span>
                      </span>
                      <span className="text-command-accent font-semibold px-1 py-0.2 rounded bg-command-card text-[9px] border border-command-border">
                        {hub.hub_type}
                      </span>
                    </div>

                    <div className="text-[9px] text-command-muted mt-1.5 pt-1.5 border-t border-command-border/40 flex items-center justify-between">
                      {hub.contact_person && (
                        <span className="flex items-center space-x-1 truncate">
                          <Phone size={9} className="text-command-muted shrink-0" />
                          <span className="truncate">{hub.contact_person}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1 font-mono text-command-text ml-auto shrink-0">
                        <Box size={9} className="text-amber-400" />
                        <span>{itemCount} Categories Stocked</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  // --- DEDICATED SIMPLE & CLEAN FULL-PAGE LOGISTICS OVERVIEW VIEW ---
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-command-bg space-y-3 min-h-0">
      {/* 1. Simple Compact Header Bar */}
      <div className="bg-command-panel border border-command-border rounded-lg px-4 py-2.5 shadow-xl shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xs font-extrabold text-command-text uppercase tracking-wider flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-command-accent shrink-0" />
            <span>LOGISTICS OVERVIEW</span>
          </h1>
          <p className="text-[10px] text-command-muted mt-0.5">
            Regional Emergency Supply & Hub Operations
          </p>
        </div>

        {/* 4 Small Clean Summary Metrics */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="bg-command-card/80 border border-command-border px-2.5 py-1 rounded flex items-center space-x-1.5">
            <span className="text-command-muted text-[10px]">HUBS:</span>
            <strong className="text-command-text font-extrabold text-xs">{summary.totalHubs}</strong>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-emerald-400">
            <span className="text-[10px]">OPERATIONAL:</span>
            <strong className="font-extrabold text-xs">{summary.operationalCount}</strong>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-blue-400">
            <span className="text-[10px]">DEPOTS:</span>
            <strong className="font-extrabold text-xs">{summary.depotCount}</strong>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-purple-400">
            <span className="text-[10px]">HELIPADS:</span>
            <strong className="font-extrabold text-xs">{summary.helipadCount}</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Content Simple 2-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: LOGISTICS HUBS (35% = 4/12 cols) */}
        <div className="lg:col-span-4 bg-command-panel border border-command-border rounded-lg p-3 flex flex-col h-full overflow-hidden shadow-xl min-h-0">
          <div className="pb-2 border-b border-command-border mb-2.5 shrink-0 flex items-center justify-between">
            <h2 className="text-xs font-bold text-command-text uppercase tracking-wider flex items-center space-x-1.5">
              <Warehouse size={15} className="text-command-accent shrink-0" />
              <span>LOGISTICS HUBS ({uniqueHubs.length})</span>
            </h2>
            <span className="text-[10px] text-command-muted font-mono">
              Click to Focus
            </span>
          </div>

          {/* Clean Scrollable Hub Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {loading && (
              <div className="p-6 text-center text-xs text-command-muted animate-pulse">
                Loading logistics hubs...
              </div>
            )}

            {!loading && uniqueHubs.length === 0 && (
              <div className="p-6 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
                No logistics hubs recorded.
              </div>
            )}

            {!loading &&
              uniqueHubs.map((hub) => {
                const isSelected = currentActiveHub?.id === hub.id;

                return (
                  <div
                    key={hub.id}
                    onClick={() => handleHubClick(hub)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-command-accent/20 border-command-accent shadow-xl ring-1 ring-command-accent/50'
                        : 'bg-command-card/50 border-command-border hover:bg-command-card hover:border-command-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2 truncate pr-1">
                        <Building2 size={15} className={isSelected ? 'text-command-accent' : 'text-command-muted'} />
                        <span className="text-xs font-extrabold text-command-text truncate">
                          {hub.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                          hub.status === 'OPERATIONAL'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {hub.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-command-muted">
                      <span className="flex items-center space-x-1 truncate">
                        <MapPin size={11} className="text-command-accent shrink-0" />
                        <span className="truncate">{hub.state} • {hub.district}</span>
                      </span>
                      <span className="text-command-accent font-bold px-1.5 py-0.5 rounded bg-slate-900 text-[9px] border border-command-border">
                        {hub.hub_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-command-border/40 font-mono text-command-muted">
                      <span>3 Categories Stocked</span>
                      {hub.capacity_sqm && <span className="text-command-text">{hub.capacity_sqm} m²</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN: LARGE REGIONAL LOGISTICS MAP (65% = 8/12 cols) */}
        <div className="lg:col-span-8 bg-command-panel border border-command-border rounded-lg p-1.5 flex flex-col h-full overflow-hidden shadow-xl min-h-0 relative">
          <MapView
            disasters={disasters}
            roads={roads}
            hubs={hubs}
            dispatches={dispatches}
            selectedHub={currentActiveHub}
            onSelectHub={(h) => handleHubClick(h)}
            onSelectDispatch={onSelectDispatch}
          />

          {/* Compact Selected Hub Overlay Card at Bottom-Left of Map */}
          {currentActiveHub && (
            <div className="absolute bottom-4 right-4 z-20 bg-slate-950/90 backdrop-blur-md border border-command-accent/60 p-3 rounded-lg shadow-2xl max-w-sm text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-command-border/60 pb-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-command-text text-xs">
                  <Building2 size={14} className="text-command-accent shrink-0" />
                  <span className="truncate">{currentActiveHub.name}</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {currentActiveHub.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-command-muted font-mono pt-0.5">
                <div>State/Dist: <strong className="text-command-text">{currentActiveHub.state} ({currentActiveHub.district})</strong></div>
                <div>Type: <strong className="text-command-accent">{currentActiveHub.hub_type}</strong></div>
                <div>Capacity: <strong className="text-amber-300">{currentActiveHub.capacity_sqm ? `${currentActiveHub.capacity_sqm} m²` : 'N/A'}</strong></div>
                <div>Manager: <strong className="text-command-text">{currentActiveHub.contact_person || 'N/A'}</strong></div>
              </div>

              <div className="pt-1.5 border-t border-command-border/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-amber-300 font-bold">Stock Categories: 3</span>
                <span className="text-command-muted">Click map trucks for dispatch details</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
