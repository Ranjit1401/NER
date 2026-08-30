import React, { useState } from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import { DriverEmergencyItem, FieldReportItem, DisasterEvent, RoadSegment, DispatchOrder, SystemAlertItem } from '../services/api';

interface AlertsPanelProps {
  systemAlerts?: SystemAlertItem[];
  emergencies?: DriverEmergencyItem[];
  fieldReports?: FieldReportItem[];
  disasters?: DisasterEvent[];
  roads?: RoadSegment[];
  dispatches?: DispatchOrder[];
  onAcknowledgeEmergency?: (clientGeneratedId: string) => void;
  onDismissAlert?: (id: string) => void;
  onViewOnMap?: () => void;
}

interface AlertItem {
  id: string;
  category: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  timestamp: string;
  source: string;
  clientGeneratedId?: string;
  status?: string;
  isSos?: boolean;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  systemAlerts = [],
  emergencies = [],
  fieldReports = [],
  disasters = [],
  roads = [],
  onAcknowledgeEmergency,
  onDismissAlert,
  onViewOnMap,
}) => {
  const [localDismissedIds, setLocalDismissedIds] = useState<Set<string>>(new Set());

  // Collect all dismissed IDs from systemAlerts prop
  const dismissedSet = new Set<string>(localDismissedIds);
  systemAlerts.filter((sa) => sa.status === 'DISMISSED').forEach((sa) => {
    dismissedSet.add(sa.id);
    if (sa.client_generated_id) dismissedSet.add(sa.client_generated_id);
    if (sa.related_entity_id) dismissedSet.add(sa.related_entity_id);
  });

  // Construct real unified alerts list from persistent systemAlerts + dynamic events
  const dynamicAlerts: AlertItem[] = [];
  const seenIds = new Set<string>();

  // 1. Persistent System Alerts from Database
  systemAlerts.filter((sa) => sa.status !== 'DISMISSED' && !dismissedSet.has(sa.id) && !dismissedSet.has(sa.client_generated_id || '')).forEach((sa) => {
    seenIds.add(sa.id);
    if (sa.client_generated_id) seenIds.add(sa.client_generated_id);
    dynamicAlerts.push({
      id: sa.id,
      category: sa.severity === 'CRITICAL' ? 'CRITICAL' : sa.severity === 'HIGH' ? 'WARNING' : 'INFO',
      title: sa.title,
      description: sa.message,
      timestamp: new Date(sa.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: sa.source,
      clientGeneratedId: sa.client_generated_id || sa.id,
      status: sa.status,
      isSos: sa.alert_type === 'SOS' || sa.title.includes('SOS'),
    });
  });

  // 2. Driver SOS Emergencies (if not already represented/dismissed)
  emergencies.forEach((em) => {
    if (!seenIds.has(em.client_generated_id) && !dismissedSet.has(em.client_generated_id)) {
      const isCritical = em.severity === 'CRITICAL' || em.event_type === 'EMERGENCY_SOS';
      dynamicAlerts.push({
        id: em.client_generated_id,
        category: isCritical ? 'CRITICAL' : 'WARNING',
        title: em.event_type === 'EMERGENCY_SOS' ? `🚨 DRIVER SOS: ${em.sos_type}` : `⚠ DRIVER HAZARD: ${em.sos_type}`,
        description: `Truck ${em.truck_id} (${em.driver_id}) — ${em.description}. GPS: (${em.latitude.toFixed(4)}°, ${em.longitude.toFixed(4)}°)`,
        timestamp: new Date(em.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: `Driver Mobile Telemetry • ${em.truck_id}`,
        clientGeneratedId: em.client_generated_id,
        status: em.status,
        isSos: true,
      });
    }
  });

  // 3. Field Officer Reports
  fieldReports.forEach((rep) => {
    if (!seenIds.has(rep.client_generated_id) && !dismissedSet.has(rep.client_generated_id) && !dismissedSet.has(rep.id)) {
      dynamicAlerts.push({
        id: rep.client_generated_id,
        category: rep.severity === 'CRITICAL' ? 'CRITICAL' : rep.severity === 'HIGH' ? 'WARNING' : 'INFO',
        title: `FIELD INCIDENT: ${rep.report_type}`,
        description: `${rep.description} (Reported by ${rep.reported_by} at ${rep.location.latitude.toFixed(4)}°, ${rep.location.longitude.toFixed(4)}°)`,
        timestamp: new Date(rep.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: `Field Officer Mobile App`,
        clientGeneratedId: rep.client_generated_id,
      });
    }
  });

  // 4. Active Disasters
  disasters.filter((d) => d.status === 'ACTIVE').forEach((d) => {
    if (!seenIds.has(d.id) && !dismissedSet.has(d.id)) {
      dynamicAlerts.push({
        id: d.id,
        category: d.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `DISASTER ALERT: ${d.title}`,
        description: `Active ${d.disaster_type} in ${d.affected_state}. Impact zone active.`,
        timestamp: new Date(d.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Disaster Intelligence Service',
      });
    }
  });

  // 5. Blocked Road Corridors
  roads.filter((r) => r.current_status === 'BLOCKED' || r.current_status === 'IMPASSABLE').forEach((r) => {
    if (!seenIds.has(r.id) && !dismissedSet.has(r.id)) {
      dynamicAlerts.push({
        id: r.id,
        category: 'WARNING',
        title: `ROAD BLOCKAGE: ${r.highway_code}`,
        description: `Segment '${r.segment_name}' is currently ${r.current_status}. Heavy vehicles prohibited.`,
        timestamp: new Date(r.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Route Intelligence Service',
      });
    }
  });

  const handleDismiss = (id: string, clientGenId?: string) => {
    const targetId = id || clientGenId;
    if (!targetId) return;

    setLocalDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (clientGenId) next.add(clientGenId);
      return next;
    });

    if (onDismissAlert) {
      onDismissAlert(targetId);
    }
  };

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4">
        <div className="flex items-center space-x-2">
          <Bell size={20} className="text-command-danger animate-pulse" />
          <h2 className="text-base font-bold text-command-text uppercase tracking-wider">
            Real-Time Command Alerts ({dynamicAlerts.length})
          </h2>
        </div>
        <span className="text-xs bg-command-card text-emerald-400 font-mono font-bold px-2.5 py-1 rounded border border-command-border">
          ✓ PERSISTENT ALERTS ENGINE ACTIVE
        </span>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {dynamicAlerts.length === 0 && (
          <div className="p-8 text-center text-xs text-command-muted border border-dashed border-command-border rounded-2xl">
            No active emergency alerts recorded. All systems operational.
          </div>
        )}

        {dynamicAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border text-xs flex items-start space-x-3 transition-all ${
              alert.category === 'CRITICAL'
                ? 'bg-command-danger/10 border-command-danger/40 shadow-lg'
                : alert.category === 'WARNING'
                ? 'bg-command-warning/10 border-command-warning/40'
                : 'bg-command-card/60 border-command-border'
            }`}
          >
            {alert.category === 'CRITICAL' ? (
              <ShieldAlert size={20} className="text-command-danger shrink-0 mt-0.5 animate-bounce" />
            ) : alert.category === 'WARNING' ? (
              <AlertTriangle size={20} className="text-command-warning shrink-0 mt-0.5" />
            ) : (
              <Info size={20} className="text-command-accent shrink-0 mt-0.5" />
            )}

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-command-text text-sm">{alert.title}</span>
                <div className="flex items-center space-x-2">
                  {alert.status && (
                    <span
                      className={`text-[9px] font-extrabold font-mono px-2 py-0.5 rounded border ${
                        alert.status === 'ACKNOWLEDGED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                      }`}
                    >
                      {alert.status}
                    </span>
                  )}
                  <span className="text-[10px] text-command-muted font-mono">{alert.timestamp}</span>
                </div>
              </div>

              <p className="text-command-muted leading-relaxed">{alert.description}</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-semibold text-command-accent font-mono">
                  Source: {alert.source}
                </span>

                <div className="flex items-center space-x-2">
                  {onViewOnMap && (
                    <button
                      onClick={onViewOnMap}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px]"
                    >
                      VIEW ON MAP
                    </button>
                  )}
                  {alert.isSos && alert.status === 'ACTIVE' && alert.clientGeneratedId && onAcknowledgeEmergency && (
                    <button
                      onClick={() => onAcknowledgeEmergency(alert.clientGeneratedId!)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] flex items-center space-x-1"
                    >
                      <CheckCircle2 size={12} />
                      <span>ACKNOWLEDGE</span>
                    </button>
                  )}
                  {onDismissAlert && (
                    <button
                      onClick={() => handleDismiss(alert.id, alert.clientGeneratedId)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-red-900 text-red-300 hover:text-white font-bold rounded text-[10px] border border-red-500/30 flex items-center space-x-1 transition-colors"
                      title="Dismiss alert permanently from active dashboard (persisted in database audit log)"
                    >
                      <Trash2 size={12} />
                      <span>DISMISS</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
