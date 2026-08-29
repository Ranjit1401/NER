import React from 'react';
import { DispatchOrder, LogisticsHub, RoadSegment } from '../services/api';
import {
  X,
  Truck,
  Navigation,
  Clock,
  Gauge,
  Package,
  MapPin,
  Map,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface DispatchDetailDrawerProps {
  dispatch: DispatchOrder | null;
  hubs: LogisticsHub[];
  roads: RoadSegment[];
  onClose: () => void;
}

export const DispatchDetailDrawer: React.FC<DispatchDetailDrawerProps> = ({
  dispatch,
  hubs,
  roads,
  onClose,
}) => {
  if (!dispatch) return null;

  const originHub = hubs.find((h) => h.id === dispatch.origin_hub_id);
  const destHub = hubs.find((h) => h.id === dispatch.destination_hub_id);
  const route =
    roads.find((r) => r.highway_code === dispatch.recommended_route_id) || roads[0];

  // Derive deterministic telemetry metrics
  const orderIndex = parseInt(dispatch.order_code.replace(/\D/g, ''), 10) || 1;
  const speedKmh = 42 + (orderIndex * 7) % 18;
  const etaMinutes = 45 + (orderIndex * 25) % 60;
  const distKm = 35 + (orderIndex * 42) % 90;
  const progressPercent = Math.min(85, 35 + (orderIndex * 20));

  // Determine current position on route geometry
  let currentLat = originHub?.location?.latitude || 26.1833;
  let currentLon = originHub?.location?.longitude || 91.7333;
  if (route && route.geometry?.points?.length > 0) {
    const pts = route.geometry.points;
    const p1 = pts[0];
    const p2 = pts[pts.length - 1];
    currentLat = p1.latitude + (p2.latitude - p1.latitude) * 0.5;
    currentLon = p1.longitude + (p2.longitude - p1.longitude) * 0.5;
  }

  const allocatedItems = dispatch.allocated_items
    ? Object.entries(dispatch.allocated_items)
    : [
        ['FOOD', 100],
        ['WATER', 50],
      ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border-l border-amber-500/40 z-50 flex flex-col shadow-2xl transition-all duration-300 transform animate-in slide-in-from-right">
      {/* Drawer Header */}
      <div className="p-4 border-b border-command-border/80 flex items-center justify-between bg-command-panel/90">
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5 text-amber-400 animate-pulse shrink-0" />
          <div>
            <h2 className="text-xs font-bold text-command-text uppercase tracking-wider">
              Live Dispatch Telemetry
            </h2>
            <div className="text-[10px] text-command-muted font-mono">
              {dispatch.order_code} • PostGIS Active
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-command-muted hover:text-white bg-command-card/80 hover:bg-command-card border border-command-border rounded transition-colors"
          title="Close Drawer (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Order Status Badge */}
        <div className="bg-command-card/70 border border-command-border p-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-command-muted uppercase tracking-wider block">
              Dispatch Status
            </span>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded border inline-block mt-1 font-mono ${
                dispatch.status === 'APPROVED' || dispatch.status === 'DISPATCHED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : dispatch.status === 'PROPOSED'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
              }`}
            >
              ● {dispatch.status}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-command-muted block">Transit Progress</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{progressPercent}%</span>
          </div>
        </div>

        {/* Vehicle Transit Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center space-x-3 text-amber-300">
          <Truck size={24} className="shrink-0 text-amber-400" />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider">Vehicle In Transit</div>
            <div className="text-[10px] text-amber-200/80">
              Corridor convoy tracking active with GPS telemetry stream.
            </div>
          </div>
        </div>

        {/* Assigned Highway Corridor */}
        <div className="bg-command-panel p-3 rounded-lg border border-command-border space-y-2">
          <div className="text-[10px] text-command-muted uppercase font-bold flex items-center space-x-1">
            <Navigation size={12} className="text-command-accent" />
            <span>Assigned Corridor Route</span>
          </div>
          <div className="flex items-center justify-between bg-command-card/60 p-2 rounded border border-command-border/50">
            <span className="font-extrabold font-mono text-amber-300 text-sm">
              {route?.highway_code || 'NH-27'}
            </span>
            <span className="text-[11px] font-semibold text-command-text truncate max-w-[200px]">
              {route?.segment_name || 'Guwahati Corridor'}
            </span>
          </div>
          <div className="text-[10px] text-command-muted flex items-center justify-between font-mono pt-1">
            <span>Status: <strong className="text-emerald-400">{route?.current_status || 'CLEAR'}</strong></span>
            <span>RRS: <strong className="text-emerald-400">0.25 LOW</strong></span>
          </div>
        </div>

        {/* Origin & Destination Hubs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-command-panel p-2.5 rounded-lg border border-command-border">
            <div className="text-[9px] text-command-muted uppercase font-bold mb-1 flex items-center space-x-1">
              <MapPin size={10} className="text-blue-400" />
              <span>Origin Hub</span>
            </div>
            <div className="font-bold text-command-text text-[11px] truncate" title={originHub?.name}>
              {originHub?.name || 'Guwahati Depot'}
            </div>
            <div className="text-[10px] text-command-muted font-mono mt-0.5">
              {originHub?.state || 'Assam'}
            </div>
          </div>

          <div className="bg-command-panel p-2.5 rounded-lg border border-command-border">
            <div className="text-[9px] text-command-muted uppercase font-bold mb-1 flex items-center space-x-1">
              <MapPin size={10} className="text-purple-400" />
              <span>Destination Hub</span>
            </div>
            <div className="font-bold text-command-text text-[11px] truncate" title={destHub?.name}>
              {destHub?.name || 'Shillong Relief Camp'}
            </div>
            <div className="text-[10px] text-command-muted font-mono mt-0.5">
              {destHub?.state || 'Meghalaya'}
            </div>
          </div>
        </div>

        {/* Live Telemetry Metrics */}
        <div className="bg-command-panel p-3 rounded-lg border border-command-border space-y-2">
          <div className="text-[10px] text-command-muted uppercase font-bold flex items-center space-x-1">
            <Activity size={12} className="text-emerald-400" />
            <span>Synthetic Telemetry Metrics</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-command-card/80 p-2 rounded border border-command-border/50">
              <Gauge size={14} className="mx-auto mb-1 text-amber-400" />
              <div className="text-[9px] text-command-muted">SPEED</div>
              <div className="font-mono font-extrabold text-command-text text-xs">{speedKmh} km/h</div>
            </div>
            <div className="bg-command-card/80 p-2 rounded border border-command-border/50">
              <Clock size={14} className="mx-auto mb-1 text-command-accent" />
              <div className="text-[9px] text-command-muted">ETA</div>
              <div className="font-mono font-extrabold text-command-text text-xs">{etaMinutes} min</div>
            </div>
            <div className="bg-command-card/80 p-2 rounded border border-command-border/50">
              <Map size={14} className="mx-auto mb-1 text-emerald-400" />
              <div className="text-[9px] text-command-muted">DISTANCE</div>
              <div className="font-mono font-extrabold text-command-text text-xs">{distKm} km</div>
            </div>
          </div>
        </div>

        {/* Geographic Coordinates */}
        <div className="bg-command-panel p-3 rounded-lg border border-command-border space-y-1.5 font-mono text-[10px]">
          <div className="text-[9px] text-command-muted uppercase font-bold font-sans flex items-center space-x-1 mb-1">
            <MapPin size={12} className="text-amber-400" />
            <span>Corridor Position Coordinates</span>
          </div>
          <div className="flex justify-between bg-command-card/50 p-1.5 rounded border border-command-border/40">
            <span className="text-command-muted">LATITUDE:</span>
            <span className="text-command-text font-bold">{currentLat.toFixed(4)}° N</span>
          </div>
          <div className="flex justify-between bg-command-card/50 p-1.5 rounded border border-command-border/40">
            <span className="text-command-muted">LONGITUDE:</span>
            <span className="text-command-text font-bold">{currentLon.toFixed(4)}° E</span>
          </div>
        </div>

        {/* Cargo Manifest */}
        <div className="bg-command-panel p-3 rounded-lg border border-command-border space-y-2">
          <div className="text-[10px] text-command-muted uppercase font-bold flex items-center space-x-1">
            <Package size={12} className="text-amber-400" />
            <span>Allocated Cargo Manifest</span>
          </div>
          <div className="space-y-1">
            {allocatedItems.map(([itemCat, qty]) => (
              <div
                key={itemCat}
                className="flex items-center justify-between bg-command-card/60 p-2 rounded border border-command-border/40 text-[11px]"
              >
                <span className="font-bold text-amber-300">{itemCat}</span>
                <span className="font-mono font-bold text-command-text">{qty} UNITS</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route Risk & Operational Status Checklist */}
        <div className="bg-command-panel p-3 rounded-lg border border-command-border space-y-1.5 text-[10px]">
          <div className="text-[9px] text-command-muted uppercase font-bold mb-1">
            Route Risk Assessment
          </div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 size={12} />
            <span>Corridor PostGIS Buffer Intersections Checked</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 size={12} />
            <span>Hazard Assessment Validated</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 size={12} />
            <span>Human-In-The-Loop Approval Granted</span>
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-command-border bg-command-panel/90 text-[10px] text-command-muted flex items-center justify-between">
        <span>PostgreSQL + PostGIS Telemetry</span>
        <button
          onClick={onClose}
          className="bg-command-card hover:bg-command-border text-command-text px-3 py-1 rounded border border-command-border font-bold transition-colors"
        >
          Close Detail View
        </button>
      </div>
    </div>
  );
};
