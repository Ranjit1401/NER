import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  enqueueMutation,
  getPendingMutations,
  OfflineMutation,
} from '../services/offlineStore';
import { syncEngine } from '../services/syncEngine';
import { FileText, Send, RefreshCw } from 'lucide-react';

export const FieldReportsPanel: React.FC = () => {
  const [reportType, setReportType] = useState<string>('ROAD_BLOCKAGE');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [description, setDescription] = useState<string>('NH-6 blockage observed near Shillong due to slope instability.');
  const [latitude, setLatitude] = useState<string>('25.5788');
  const [longitude, setLongitude] = useState<string>('91.8933');

  const [pendingQueue, setPendingQueue] = useState<OfflineMutation[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadQueue = async () => {
    const queue = await getPendingMutations();
    setPendingQueue(queue);
  };

  useEffect(() => {
    loadQueue();
    syncEngine.onStateChange(() => {
      loadQueue();
    });
  }, []);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setNotice(null);

    const clientGeneratedId = `REP-FIELD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      client_generated_id: clientGeneratedId,
      report_type: reportType,
      severity,
      description,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      observed_at: new Date().toISOString(),
      reported_by: 'FIELD_OFFICER_PATIL',
      version: 1,
    };

    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        const res = await api.syncFieldReport(payload);
        if (res.status === 'SYNCED') {
          setNotice(`✓ Report synchronized immediately with server (ID: ${res.server_id})`);
        } else if (res.status === 'CONFLICT') {
          setNotice(`⚠ CONFLICT DETECTED: ${res.message}`);
          await enqueueMutation({
            client_generated_id: clientGeneratedId,
            mutation_type: 'FIELD_REPORT',
            payload,
            created_at: new Date().toISOString(),
            retry_count: 0,
            status: 'CONFLICT',
            error_message: res.message,
          });
        }
      } catch {
        // Fallback to offline queue on network error
        await enqueueMutation({
          client_generated_id: clientGeneratedId,
          mutation_type: 'FIELD_REPORT',
          payload,
          created_at: new Date().toISOString(),
          retry_count: 0,
          status: 'QUEUED',
        });
        setNotice('OFFLINE / Network error. Report saved locally ➔ QUEUED FOR SYNC');
      }
    } else {
      // Offline mode: Store directly in IndexedDB queue
      await enqueueMutation({
        client_generated_id: clientGeneratedId,
        mutation_type: 'FIELD_REPORT',
        payload,
        created_at: new Date().toISOString(),
        retry_count: 0,
        status: 'QUEUED',
      });
      setNotice('OFFLINE DETECTED: Report saved locally in IndexedDB ➔ QUEUED FOR SYNC');
    }

    setSubmitting(false);
    loadQueue();
  };

  const handleManualSync = async () => {
    await syncEngine.syncPendingMutations();
    loadQueue();
  };

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4">
        <div className="flex items-center space-x-2">
          <FileText size={20} className="text-command-accent" />
          <h2 className="text-base font-bold text-command-text uppercase tracking-wider">
            Field Officer Observations & Offline Sync
          </h2>
        </div>
        <button
          onClick={handleManualSync}
          className="px-3 py-1.5 bg-command-accent hover:bg-command-accent/80 text-white font-bold rounded flex items-center space-x-1.5"
        >
          <RefreshCw size={14} />
          <span>SYNC NOW</span>
        </button>
      </div>

      {notice && (
        <div className="mb-4 p-3 bg-command-accent/15 border border-command-accent/30 text-command-text rounded font-mono text-[11px]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
        {/* New Report Form */}
        <form onSubmit={handleSubmitReport} className="space-y-3 bg-command-card/50 p-4 rounded-lg border border-command-border">
          <div className="font-bold text-sm text-command-text uppercase tracking-wider mb-2 border-b border-command-border/50 pb-2">
            Create Field Observation Report
          </div>

          <div>
            <label className="block text-command-muted font-semibold mb-1">Report Category:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-command-bg border border-command-border rounded p-2 text-command-text"
            >
              <option value="ROAD_BLOCKAGE">ROAD BLOCKAGE / LANDSLIDE</option>
              <option value="DISASTER_OBSERVATION">DISASTER / FLOOD OBSERVATION</option>
              <option value="LOGISTICS_ISSUE">LOGISTICS / DEPOT ISSUE</option>
            </select>
          </div>

          <div>
            <label className="block text-command-muted font-semibold mb-1">Observed Severity:</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-command-bg border border-command-border rounded p-2 text-command-text"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-command-muted font-semibold mb-1">Latitude:</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-command-bg border border-command-border rounded p-2 text-command-text font-mono"
              />
            </div>
            <div>
              <label className="block text-command-muted font-semibold mb-1">Longitude:</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-command-bg border border-command-border rounded p-2 text-command-text font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-command-muted font-semibold mb-1">Detailed Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-command-bg border border-command-border rounded p-2 text-command-text"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-command-accent hover:bg-command-accent/80 text-white font-bold rounded flex items-center justify-center space-x-1.5 shadow-lg"
          >
            <Send size={16} />
            <span>Submit Field Report</span>
          </button>
        </form>

        {/* Offline Queue Display */}
        <div className="bg-command-card/50 p-4 rounded-lg border border-command-border flex flex-col">
          <div className="font-bold text-sm text-command-text uppercase tracking-wider mb-2 border-b border-command-border/50 pb-2 flex justify-between">
            <span>Offline Mutation Queue</span>
            <span className="font-mono text-command-accent">{pendingQueue.length} Pending</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {pendingQueue.length === 0 && (
              <div className="p-8 text-center text-command-muted border border-dashed border-command-border rounded">
                Queue empty. All local reports synced with server.
              </div>
            )}

            {pendingQueue.map((item) => (
              <div key={item.client_generated_id} className="p-3 bg-command-bg/60 rounded border border-command-border font-mono text-[11px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-command-text">{item.client_generated_id}</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      item.status === 'QUEUED'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : item.status === 'SYNCED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="text-command-muted text-[10px] truncate mb-1">
                  {(item.payload as any).description}
                </div>
                <div className="text-[9px] text-command-muted flex justify-between">
                  <span>Attempts: {item.retry_count}</span>
                  <span>Created: {new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
