import React, { useState } from 'react';
import { DispatchOrder, LogisticsHub, RoadSegment } from '../services/api';
import { Truck, ArrowRight, Navigation, ShieldCheck, Clock, Gauge, Package, Minus, Plus } from 'lucide-react';

interface DispatchTelemetryPanelProps {
  dispatches: DispatchOrder[];
  hubs: LogisticsHub[];
  roads: RoadSegment[];
  loading?: boolean;
  onSelectDispatch?: (dispatch: DispatchOrder) => void;
}

export const DispatchTelemetryPanel: React.FC<DispatchTelemetryPanelProps> = ({
  dispatches,
  hubs,
  roads,
  loading = false,
  onSelectDispatch,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-3 flex flex-col w-full shadow-2xl shrink-0 overflow-hidden">
      {/* Panel Header */}
      <div className={`flex items-center justify-between ${collapsed ? '' : 'pb-2 border-b border-command-border mb-2.5'}`}>
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
          <h3 className="text-xs font-bold text-command-text uppercase tracking-wider">
            Live Dispatch Telemetry ({dispatches.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {!collapsed && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold hidden sm:inline-flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span>
              <span>Active</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-command-muted hover:text-white bg-command-card/80 hover:bg-command-card border border-command-border rounded transition-colors"
            title={collapsed ? "Expand Panel" : "Collapse Panel"}
          >
            {collapsed ? <Plus size={13} /> : <Minus size={13} />}
          </button>
        </div>
      </div>

      {/* Telemetry Content Body */}
      {!collapsed && (
        <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-0.5">
          {loading && (
            <div className="p-4 text-center text-xs text-command-muted animate-pulse">
              Receiving active vehicle telemetry signals...
            </div>
          )}

          {!loading && dispatches.length === 0 && (
            <div className="p-4 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
              No active dispatches currently in transit.
            </div>
          )}

          {!loading &&
            dispatches.map((dispatch, index) => {
              const originHub = hubs.find((h) => h.id === dispatch.origin_hub_id);
              const destHub = hubs.find((h) => h.id === dispatch.destination_hub_id);
              const route = roads.find((r) => r.highway_code === dispatch.recommended_route_id) || roads[index % (roads.length || 1)];

              // Derive deterministic telemetry metrics from index/route
              const speedKmh = 42 + (index * 7) % 18;
              const etaMinutes = 45 + (index * 25) % 60;
              const distKm = 35 + (index * 42) % 90;
              const progressPercent = Math.min(85, 30 + (index * 25));

              const allocatedSummary = dispatch.allocated_items
                ? Object.entries(dispatch.allocated_items)
                    .map(([cat, qty]) => `${cat}: ${qty}`)
                    .join(' | ')
                : 'Emergency Rations & Supplies';

              return (
                <div
                  key={dispatch.id}
                  onClick={() => onSelectDispatch && onSelectDispatch(dispatch)}
                  className="bg-command-card/60 border border-command-border hover:border-amber-500/80 hover:bg-command-card cursor-pointer p-2.5 rounded-md transition-all flex flex-col justify-between space-y-2 relative overflow-hidden group shadow-md"
                >
                  {/* Header Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {dispatch.order_code}
                      </span>
                      <span className="text-[10px] text-command-muted font-mono flex items-center">
                        <Navigation size={10} className="mr-0.5 text-command-accent" />
                        {route?.highway_code || 'Corridor'}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        dispatch.status === 'APPROVED' || dispatch.status === 'DISPATCHED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : dispatch.status === 'PROPOSED'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}
                    >
                      {dispatch.status}
                    </span>
                  </div>

                  {/* Origin -> Destination Route */}
                  <div className="text-[10px] font-bold text-command-text flex items-center justify-between bg-command-bg/50 p-1.5 rounded border border-command-border/40">
                    <span className="truncate max-w-[45%]" title={originHub?.name || 'Origin'}>
                      {originHub?.name ? originHub.name.replace('Emergency', '').replace('Central', '').trim() : 'Guwahati'}
                    </span>
                    <ArrowRight size={12} className="text-amber-400 shrink-0 mx-1" />
                    <span className="truncate max-w-[45%] text-right" title={destHub?.name || 'Destination'}>
                      {destHub?.name ? destHub.name.replace('Relief', '').replace('Camp', '').trim() : 'Shillong'}
                    </span>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <div className="bg-command-panel/80 p-1 rounded border border-command-border/40 flex items-center space-x-1">
                      <Gauge size={10} className="text-amber-400 shrink-0" />
                      <div>
                        <div className="text-command-muted text-[8px]">SPD</div>
                        <div className="font-mono font-bold text-command-text">{speedKmh}k/h</div>
                      </div>
                    </div>
                    <div className="bg-command-panel/80 p-1 rounded border border-command-border/40 flex items-center space-x-1">
                      <Clock size={10} className="text-command-accent shrink-0" />
                      <div>
                        <div className="text-command-muted text-[8px]">ETA</div>
                        <div className="font-mono font-bold text-command-text">{etaMinutes}m</div>
                      </div>
                    </div>
                    <div className="bg-command-panel/80 p-1 rounded border border-command-border/40 flex items-center space-x-1">
                      <ShieldCheck size={10} className="text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-command-muted text-[8px]">GPS</div>
                        <div className="font-mono font-bold text-emerald-400">{distKm}km</div>
                      </div>
                    </div>
                  </div>

                  {/* Cargo Manifest */}
                  <div className="text-[9px] text-command-muted truncate flex items-center space-x-1 pt-1 border-t border-command-border/40">
                    <Package size={10} className="text-amber-400 shrink-0" />
                    <span className="truncate">{allocatedSummary}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-command-panel rounded-full h-1 overflow-hidden border border-command-border/50 mt-0.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
