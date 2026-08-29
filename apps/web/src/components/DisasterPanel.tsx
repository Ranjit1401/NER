import React, { useState, useMemo } from 'react';
import { DisasterEvent } from '../services/api';
import { Flame, Filter, ChevronRight, AlertCircle, Radio, MapPin, Minus, Plus } from 'lucide-react';

interface DisasterPanelProps {
  disasters: DisasterEvent[];
  loading: boolean;
  error: string | null;
  selectedDisasterId?: string | null;
  onSelectDisaster: (disaster: DisasterEvent) => void;
}

export const DisasterPanel: React.FC<DisasterPanelProps> = ({
  disasters,
  loading,
  error,
  selectedDisasterId,
  onSelectDisaster,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Deduplicate disaster events safely based on title or coordinates/id
  const uniqueDisasters = useMemo(() => {
    const seen = new Set<string>();
    const result: DisasterEvent[] = [];

    for (const d of disasters) {
      // Key based on title and affected state
      const key = `${d.title.trim().toLowerCase()}-${d.affected_state.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(d);
      }
    }
    return result;
  }, [disasters]);

  const filteredDisasters = useMemo(() => {
    return uniqueDisasters.filter((d) => {
      if (severityFilter !== 'ALL' && d.severity !== severityFilter) return false;
      if (typeFilter !== 'ALL' && d.disaster_type !== typeFilter) return false;
      return true;
    });
  }, [uniqueDisasters, severityFilter, typeFilter]);

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-3 flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className={`pb-2.5 border-b border-command-border mb-2.5 shrink-0 ${collapsed ? 'border-b-0 mb-0 pb-0' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame size={18} className="text-command-danger animate-pulse shrink-0" />
            <h2 className="text-xs font-bold text-command-text uppercase tracking-wider">
              Active Disaster Feed ({filteredDisasters.length})
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {!collapsed && (
              <span className="flex items-center space-x-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold hidden sm:flex">
                <Radio size={10} className="animate-ping" />
                <span>Live</span>
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
        {!collapsed && (
          <div className="text-[10px] text-command-muted mt-1 flex justify-between items-center">
            <span>Showing {filteredDisasters.length} of {uniqueDisasters.length} unique incidents</span>
            {disasters.length > uniqueDisasters.length && (
              <span className="text-amber-400 font-semibold text-[9px]">Deduplicated ({disasters.length - uniqueDisasters.length} skipped)</span>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Filters */}
          <div className="flex items-center space-x-2 mb-2.5 text-xs shrink-0">
        <Filter size={13} className="text-command-muted shrink-0" />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-command-card border border-command-border text-command-text rounded px-2 py-1 focus:ring-0 text-[11px] w-full"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-command-card border border-command-border text-command-text rounded px-2 py-1 focus:ring-0 text-[11px] w-full"
        >
          <option value="ALL">All Types</option>
          <option value="FLOOD">FLOOD</option>
          <option value="LANDSLIDE">LANDSLIDE</option>
          <option value="GLOF">GLOF</option>
          <option value="EARTHQUAKE">EARTHQUAKE</option>
        </select>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {loading && (
          <div className="p-6 text-center text-xs text-command-muted animate-pulse">
            Loading active disaster feeds...
          </div>
        )}

        {error && (
          <div className="p-3 bg-command-danger/10 border border-command-danger/30 text-command-danger rounded text-xs flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filteredDisasters.length === 0 && (
          <div className="p-6 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
            No disaster events match the selected criteria.
          </div>
        )}

        {!loading &&
          !error &&
          filteredDisasters.map((disaster) => {
            const isSelected = disaster.id === selectedDisasterId;
            const note = disaster.metadata?.note as string | undefined;

            return (
              <div
                key={disaster.id}
                onClick={() => onSelectDisaster(disaster)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-command-accent/15 border-command-accent shadow-lg ring-1 ring-command-accent/50'
                    : 'bg-command-card/50 border-command-border hover:bg-command-card hover:border-command-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider ${
                        disaster.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                          : disaster.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}
                    >
                      {disaster.severity}
                    </span>
                    <span className="text-[10px] bg-command-card text-command-text px-1.5 py-0.5 rounded border border-command-border font-mono font-bold">
                      {disaster.disaster_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-command-muted font-mono flex items-center">
                    <MapPin size={10} className="mr-1 text-command-accent" />
                    {disaster.affected_state}
                  </span>
                </div>

                <div className="text-xs font-bold text-command-text mb-1 leading-snug">
                  {disaster.title}
                </div>

                {note && (
                  <div className="text-[10px] text-command-muted line-clamp-2 mb-2 bg-command-bg/40 p-1.5 rounded border border-command-border/40 font-sans">
                    {note}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-command-muted pt-1 border-t border-command-border/40">
                  <span className="font-mono text-emerald-400">STATUS: {disaster.status}</span>
                  <div className="flex items-center text-command-accent font-semibold">
                    <span>View Map Hazard</span>
                    <ChevronRight size={13} className={isSelected ? 'text-command-accent' : ''} />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
        </>
      )}
    </div>
  );
};
