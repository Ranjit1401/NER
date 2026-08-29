import React, { useState, useMemo } from 'react';
import { RoadSegment, DisasterEvent, LogisticsHub, DispatchOrder } from '../services/api';
import {
  Route as RouteIcon,
  ShieldAlert,
  ArrowRightLeft,
  Minus,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  Navigation,
  Scale,
  Mountain,
  MapPin,
  FileText,
  Activity,
} from 'lucide-react';
import { MapView } from './MapView';

interface RoutePanelProps {
  roads: RoadSegment[];
  affectedRoads: RoadSegment[];
  loading: boolean;
  selectedRoad?: RoadSegment | null;
  onSelectRoad?: (road: RoadSegment) => void;
  // Full page view additional props
  fullPageMode?: boolean;
  disasters?: DisasterEvent[];
  hubs?: LogisticsHub[];
  dispatches?: DispatchOrder[];
}

export const RoutePanel: React.FC<RoutePanelProps> = ({
  roads,
  affectedRoads,
  loading,
  selectedRoad,
  onSelectRoad,
  fullPageMode = false,
  disasters = [],
  hubs = [],
  dispatches = [],
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeRouteDetail, setActiveRouteDetail] = useState<RoadSegment | null>(selectedRoad || null);

  // Uniqueness deduplication by stable database ID
  const uniqueRoads = useMemo(() => {
    const seen = new Set<string>();
    return roads.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [roads]);

  // Status metrics summary
  const summary = useMemo(() => {
    const total = uniqueRoads.length;
    const clearCount = uniqueRoads.filter((r) => r.current_status === 'CLEAR').length;
    const cautionCount = uniqueRoads.filter((r) => r.current_status === 'CAUTION').length;
    const blockedCount = uniqueRoads.filter(
      (r) => r.current_status === 'BLOCKED' || r.current_status === 'IMPASSABLE'
    ).length;
    const affectedCount = affectedRoads.length;

    return { total, clearCount, cautionCount, blockedCount, affectedCount };
  }, [uniqueRoads, affectedRoads]);

  // Filtered roads list
  const filteredRoads = useMemo(() => {
    if (statusFilter === 'ALL') return uniqueRoads;
    if (statusFilter === 'AFFECTED') return affectedRoads;
    return uniqueRoads.filter((r) => r.current_status === statusFilter);
  }, [uniqueRoads, affectedRoads, statusFilter]);

  const currentActiveRoute = activeRouteDetail || selectedRoad || uniqueRoads[0] || null;

  // Handle route selection
  const handleRouteClick = (road: RoadSegment) => {
    setActiveRouteDetail(road);
    if (onSelectRoad) onSelectRoad(road);
  };

  // If NOT fullPageMode, render the compact widget used in Dashboard Overview
  if (!fullPageMode) {
    return (
      <div className="bg-command-panel border border-command-border rounded-lg p-3 flex flex-col w-full shadow-xl overflow-hidden shrink-0">
        {/* Header */}
        <div className={`flex items-center justify-between ${collapsed ? '' : 'pb-2 border-b border-command-border mb-2'}`}>
          <div className="flex items-center space-x-2">
            <RouteIcon size={16} className="text-command-accent shrink-0" />
            <h2 className="text-xs font-bold text-command-text uppercase tracking-wider">
              Route Corridor ({uniqueRoads.length})
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
          <>
            {/* Corridor Risk Alert Notice */}
            {affectedRoads.length > 0 && (
              <div className="mb-2 p-2 bg-command-danger/10 border border-command-danger/30 rounded text-[11px] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1.5 text-command-danger font-semibold">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span className="truncate">{affectedRoads.length} Disaster-Affected Road Segments</span>
                </div>
              </div>
            )}

            {/* Primary Corridor List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {loading && (
                <div className="p-4 text-center text-xs text-command-muted animate-pulse">
                  Loading road corridor network status...
                </div>
              )}

              {!loading && uniqueRoads.length === 0 && (
                <div className="p-4 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
                  No road corridors registered.
                </div>
              )}

              {!loading &&
                uniqueRoads.map((road) => {
                  const isAffected = affectedRoads.some((ar) => ar.id === road.id);
                  const isSelected = selectedRoad?.id === road.id;

                  let rrsScore = '0.15 (LOW)';
                  let rrsColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                  if (road.current_status === 'BLOCKED' || road.current_status === 'IMPASSABLE' || isAffected) {
                    rrsScore = '0.95 (CRITICAL)';
                    rrsColor = 'text-red-400 bg-red-500/10 border-red-500/30';
                  } else if (road.current_status === 'CAUTION') {
                    rrsScore = '0.55 (MEDIUM)';
                    rrsColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  }

                  return (
                    <div
                      key={road.id}
                      onClick={() => handleRouteClick(road)}
                      className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-command-accent/15 border-command-accent shadow-md'
                          : isAffected
                          ? 'bg-command-danger/10 border-command-danger/40 hover:bg-command-danger/20'
                          : 'bg-command-card/50 border-command-border hover:bg-command-card'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-command-text truncate pr-1">
                          {road.highway_code}: {road.segment_name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                            road.current_status === 'CLEAR'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : road.current_status === 'CAUTION'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                          }`}
                        >
                          {road.current_status}
                        </span>
                      </div>

                      <div className="text-[10px] text-command-muted flex items-center justify-between mt-1">
                        <span className="truncate">Districts: {road.start_district} ➔ {road.end_district}</span>
                      </div>

                      <div className="text-[10px] flex items-center justify-between mt-1.5 pt-1.5 border-t border-command-border/40">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${rrsColor}`}>
                          RRS: {rrsScore}
                        </span>
                        <div className="flex items-center space-x-2 text-command-muted">
                          {road.weight_limit_tons && <span>{road.weight_limit_tons}T Limit</span>}
                          {road.elevation_m && <span>{road.elevation_m}m Alt</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Route Agent Rerouting Card */}
            <div className="mt-2 p-2 bg-command-card/40 border border-dashed border-command-border rounded text-[10px] text-command-muted shrink-0">
              <div className="font-bold text-command-accent mb-0.5 flex items-center space-x-1">
                <ArrowRightLeft size={12} />
                <span>Deterministic Safety Routing Active</span>
              </div>
              <div className="line-clamp-2">
                Alternative corridors auto-validated against PostGIS hazard buffer intersections.
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- DEDICATED FULL-PAGE ROUTE INTELLIGENCE VIEW ---
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-command-bg space-y-3">
      {/* 1. Header Bar with Metrics Summary */}
      <div className="bg-command-panel border border-command-border rounded-lg p-3 shadow-xl shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <RouteIcon className="h-5 w-5 text-command-accent animate-pulse" />
            <h1 className="text-sm font-extrabold text-command-text uppercase tracking-wider">
              Route Intelligence & Corridor Accessibility Analysis
            </h1>
            <span className="bg-command-accent/20 text-command-accent border border-command-accent/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              PostGIS Network Topology
            </span>
          </div>
          <p className="text-[11px] text-command-muted mt-0.5">
            North Eastern Region (NER) Multi-State Highway Corridor Risk Assessment & Deterministic Safety Routing
          </p>
        </div>

        {/* Live Summary Metrics Bar */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="bg-command-card/80 border border-command-border px-2.5 py-1 rounded flex items-center space-x-1.5">
            <Activity size={13} className="text-command-accent" />
            <span className="text-command-muted text-[10px]">TOTAL:</span>
            <strong className="text-command-text font-extrabold">{summary.total}</strong>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 size={13} />
            <span className="text-[10px]">CLEAR:</span>
            <strong className="font-extrabold">{summary.clearCount}</strong>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-amber-400">
            <AlertTriangle size={13} />
            <span className="text-[10px]">CAUTION:</span>
            <strong className="font-extrabold">{summary.cautionCount}</strong>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded flex items-center space-x-1.5 text-red-400">
            <XCircle size={13} />
            <span className="text-[10px]">BLOCKED:</span>
            <strong className="font-extrabold">{summary.blockedCount}</strong>
          </div>
          <div className="bg-command-danger/20 border border-command-danger/40 px-2.5 py-1 rounded flex items-center space-x-1.5 text-red-300 font-bold">
            <ShieldAlert size={13} className="animate-pulse" />
            <span className="text-[10px]">AFFECTED:</span>
            <strong>{summary.affectedCount}</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split View (Left Column List + Center Detail + Right Map) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Sub-Column: Filterable Highway Corridors List */}
        <div className="lg:col-span-4 bg-command-panel border border-command-border rounded-lg p-3 flex flex-col h-full overflow-hidden shadow-xl">
          {/* List Filter Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-command-border mb-2.5 shrink-0 text-xs">
            <div className="flex items-center space-x-1.5 text-command-muted font-bold uppercase tracking-wider text-[11px]">
              <Filter size={13} className="text-command-accent" />
              <span>Corridor Filter</span>
            </div>
            <div className="flex items-center space-x-1">
              {['ALL', 'CLEAR', 'CAUTION', 'BLOCKED', 'AFFECTED'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setStatusFilter(filterKey)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    statusFilter === filterKey
                      ? 'bg-command-accent text-slate-950 font-black'
                      : 'bg-command-card text-command-muted hover:text-white border border-command-border'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Corridor Cards */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {loading && (
              <div className="p-6 text-center text-xs text-command-muted animate-pulse">
                Fetching regional highway network telemetry...
              </div>
            )}

            {!loading && filteredRoads.length === 0 && (
              <div className="p-6 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
                No highway corridors match the selected filter.
              </div>
            )}

            {!loading &&
              filteredRoads.map((road) => {
                const isAffected = affectedRoads.some((ar) => ar.id === road.id);
                const isSelected = currentActiveRoute?.id === road.id;

                let rrsScore = '0.15 LOW';
                let rrsBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                if (road.current_status === 'BLOCKED' || road.current_status === 'IMPASSABLE' || isAffected) {
                  rrsScore = '0.95 CRITICAL';
                  rrsBadge = 'bg-red-500/20 text-red-400 border-red-500/40';
                } else if (road.current_status === 'CAUTION') {
                  rrsScore = '0.55 CAUTION';
                  rrsBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                }

                return (
                  <div
                    key={road.id}
                    onClick={() => handleRouteClick(road)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-command-accent/20 border-command-accent shadow-xl ring-1 ring-command-accent/50'
                        : isAffected
                        ? 'bg-command-danger/10 border-command-danger/40 hover:bg-command-danger/20'
                        : 'bg-command-card/50 border-command-border hover:bg-command-card hover:border-command-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-amber-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/40">
                          {road.highway_code}
                        </span>
                        <span className="text-xs font-bold text-command-text truncate max-w-[180px]">
                          {road.segment_name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                          road.current_status === 'CLEAR'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : road.current_status === 'CAUTION'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {road.current_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-command-muted flex items-center space-x-1.5 mb-2">
                      <MapPin size={11} className="text-command-accent shrink-0" />
                      <span className="truncate">{road.start_district} ➔ {road.end_district}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-command-border/40 font-mono">
                      <span className={`px-1.5 py-0.5 rounded border font-extrabold ${rrsBadge}`}>
                        RRS: {rrsScore}
                      </span>
                      <div className="flex items-center space-x-2 text-command-muted">
                        <span className="flex items-center space-x-1">
                          <Scale size={10} className="text-amber-400" />
                          <span>{road.weight_limit_tons ? `${road.weight_limit_tons}T` : 'N/A'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Mountain size={10} className="text-command-accent" />
                          <span>{road.elevation_m ? `${road.elevation_m}m` : 'N/A'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Center Sub-Column: Selected Route Deep Inspection Card */}
        <div className="lg:col-span-4 bg-command-panel border border-command-border rounded-lg p-3 flex flex-col h-full overflow-y-auto shadow-xl space-y-3">
          <div className="pb-2 border-b border-command-border flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-command-accent" />
              <h2 className="text-xs font-bold text-command-text uppercase tracking-wider">
                Corridor Technical Manifest
              </h2>
            </div>
            <span className="text-[10px] font-mono text-amber-300 bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded">
              {currentActiveRoute?.highway_code || 'NH Corridor'}
            </span>
          </div>

          {currentActiveRoute ? (
            <div className="space-y-3 text-xs flex-1">
              {/* Highway Title & Status Header */}
              <div className="bg-command-card/70 border border-command-border p-3 rounded-lg space-y-1">
                <div className="text-[10px] text-command-muted uppercase font-bold tracking-wider">
                  Corridor Name
                </div>
                <div className="text-sm font-extrabold text-command-text">
                  {currentActiveRoute.highway_code}: {currentActiveRoute.segment_name}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-command-border/40">
                  <span className="text-command-muted font-mono">Status:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border text-[10px] ${
                      currentActiveRoute.current_status === 'CLEAR'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : currentActiveRoute.current_status === 'CAUTION'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}
                  >
                    ● {currentActiveRoute.current_status}
                  </span>
                </div>
              </div>

              {/* District Origin & Destination */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-command-card/50 p-2.5 rounded-lg border border-command-border">
                  <div className="text-[9px] text-command-muted uppercase font-bold mb-1">
                    Start District
                  </div>
                  <div className="font-bold text-command-text text-[11px]">
                    {currentActiveRoute.start_district}
                  </div>
                </div>
                <div className="bg-command-card/50 p-2.5 rounded-lg border border-command-border">
                  <div className="text-[9px] text-command-muted uppercase font-bold mb-1">
                    End District
                  </div>
                  <div className="font-bold text-command-text text-[11px]">
                    {currentActiveRoute.end_district}
                  </div>
                </div>
              </div>

              {/* Technical Physical Metrics */}
              <div className="bg-command-card/50 p-3 rounded-lg border border-command-border space-y-2">
                <div className="text-[10px] text-command-muted uppercase font-bold tracking-wider">
                  Physical Restrictions
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="bg-command-panel p-2 rounded border border-command-border/50">
                    <div className="text-command-muted text-[9px] font-sans">MAX WEIGHT LIMIT</div>
                    <div className="text-amber-300 font-extrabold text-xs">
                      {currentActiveRoute.weight_limit_tons ? `${currentActiveRoute.weight_limit_tons} Metric Tons` : 'Unrestricted'}
                    </div>
                  </div>
                  <div className="bg-command-panel p-2 rounded border border-command-border/50">
                    <div className="text-command-muted text-[9px] font-sans">ELEVATION PROFILE</div>
                    <div className="text-command-accent font-extrabold text-xs">
                      {currentActiveRoute.elevation_m ? `${currentActiveRoute.elevation_m} Meters ALT` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Disaster Intersection Analysis */}
              <div className="bg-command-card/50 p-3 rounded-lg border border-command-border space-y-1.5">
                <div className="text-[10px] text-command-muted uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>Hazard Buffer Intersections</span>
                  <ShieldAlert size={12} className="text-amber-400" />
                </div>
                {affectedRoads.some((ar) => ar.id === currentActiveRoute.id) ? (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded text-[11px] font-medium">
                    ⚠️ Critical hazard overlap detected along this highway segment. Heavy vehicle dispatches require rerouting via alternate corridors.
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded text-[11px] font-medium flex items-center space-x-1.5">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>No active disaster buffer intersections detected. Corridor safe for convoy movement.</span>
                  </div>
                )}
              </div>

              {/* Agent Routing Recommendation */}
              <div className="p-3 bg-slate-900 border border-command-border rounded-lg space-y-1">
                <div className="text-[10px] text-command-accent font-bold uppercase tracking-wider flex items-center space-x-1">
                  <FileText size={12} />
                  <span>Route Intelligence Agent Assessment</span>
                </div>
                <p className="text-[11px] text-command-muted leading-relaxed font-sans">
                  {currentActiveRoute.current_status === 'CLEAR'
                    ? 'Recommended primary corridor for relief cargo dispatch. Full axle capacity authorized.'
                    : currentActiveRoute.current_status === 'CAUTION'
                    ? 'Caution advised. Speed limited to 40 km/h due to monsoonal water accumulation.'
                    : 'Highway blocked. Agent rerouting engine engaged; redirecting dispatches via bypass network.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
              Select a corridor from the left list to inspect technical details.
            </div>
          )}
        </div>

        {/* Right Sub-Column: Interactive GIS Map Split View */}
        <div className="lg:col-span-4 bg-command-panel border border-command-border rounded-lg p-1.5 flex flex-col h-full overflow-hidden shadow-xl">
          <MapView
            disasters={disasters}
            roads={roads}
            hubs={hubs}
            dispatches={dispatches}
            selectedRoad={currentActiveRoute}
            onSelectRoad={(r) => handleRouteClick(r)}
          />
        </div>
      </div>
    </div>
  );
};