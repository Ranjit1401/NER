import React, { useState, useMemo } from 'react';
import { AIAuditLog } from '../services/api';
import {
  FileText,
  Clock,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
  Cpu,
} from 'lucide-react';

interface AuditLogPanelProps {
  logs: AIAuditLog[];
  loading: boolean;
  error: string | null;
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ logs, loading, error }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AIAuditLog | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Helper to categorize log entry
  const getCategory = (log: AIAuditLog): string => {
    const agent = (log.agent_name || '').toUpperCase();
    const summary = (log.prompt_summary || '').toUpperCase();
    const rec = (log.recommendation || '').toUpperCase();

    if (agent.includes('DISPATCH') || summary.includes('DISPATCH') || rec.includes('DISPATCH')) {
      return 'DISPATCH';
    }
    if (agent.includes('ROUTE') || summary.includes('ROUTE') || rec.includes('CORRIDOR')) {
      return 'ROUTE';
    }
    if (agent.includes('DISASTER') || summary.includes('FLOOD') || summary.includes('LANDSLIDE')) {
      return 'DISASTER';
    }
    if (agent.includes('SYNC') || summary.includes('FIELD') || summary.includes('REPORT')) {
      return 'FIELD REPORT';
    }
    return 'OTHER';
  };

  // Helper for human-in-the-loop oversight status
  const getHumanOversightBadge = (log: AIAuditLog) => {
    const agent = (log.agent_name || '').toUpperCase();

    if (agent.includes('HUMAN_COMMANDER_APPROVAL') || agent.includes('COMMANDER_APPROVAL')) {
      return {
        label: 'COMMANDER ACKNOWLEDGED',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        icon: UserCheck,
      };
    }
    if (agent.includes('HUMAN_COMMANDER_REJECTION') || agent.includes('REJECTION')) {
      return {
        label: 'COMMANDER REJECTED',
        color: 'bg-red-500/20 text-red-400 border-red-500/40',
        icon: XCircle,
      };
    }
    if (log.confidence_score < 0.85 || agent.includes('PROPOSAL')) {
      return {
        label: 'HUMAN REVIEW REQUIRED',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
        icon: ShieldAlert,
      };
    }
    return {
      label: 'SYSTEM COMPLETED',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      icon: CheckCircle2,
    };
  };

  // Filtered log items
  const filteredLogs = useMemo(() => {
    if (categoryFilter === 'ALL') return logs;
    return logs.filter((log) => getCategory(log) === categoryFilter);
  }, [logs, categoryFilter]);

  // Format evidence JSON into key-value pairs
  const formatEvidencePoints = (evidence: Record<string, unknown>) => {
    if (!evidence || Object.keys(evidence).length === 0) return [];
    return Object.entries(evidence).slice(0, 4).map(([key, val]) => {
      const formattedKey = key.replace(/_/g, ' ').toUpperCase();
      let formattedVal = String(val);
      if (typeof val === 'object' && val !== null) {
        formattedVal = JSON.stringify(val);
      }
      return { key: formattedKey, value: formattedVal };
    });
  };

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <FileText size={22} className="text-command-accent animate-pulse" />
          <div>
            <h1 className="text-sm font-extrabold text-command-text uppercase tracking-wider">
              AI DECISION AUDIT LOGS
            </h1>
            <p className="text-[11px] text-command-muted">
              Explainable record of AI recommendations, operational decisions and human actions
            </p>
          </div>
        </div>
        <span className="text-xs bg-command-card text-command-text font-mono font-bold px-3 py-1 rounded border border-command-border">
          {filteredLogs.length} DECISIONS
        </span>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-command-border/60 mb-3 shrink-0">
        <div className="flex items-center space-x-2 text-xs">
          <Filter size={14} className="text-command-accent shrink-0" />
          <span className="text-command-muted font-bold uppercase tracking-wider text-[11px]">Filter Category:</span>
          <div className="flex items-center space-x-1">
            {['ALL', 'DISASTER', 'ROUTE', 'DISPATCH', 'FIELD REPORT'].map((catKey) => (
              <button
                key={catKey}
                onClick={() => setCategoryFilter(catKey)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  categoryFilter === catKey
                    ? 'bg-command-accent text-slate-950 font-black shadow-md'
                    : 'bg-command-card text-command-muted hover:text-white border border-command-border'
                }`}
              >
                {catKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Decision Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs min-h-0">
        {loading && (
          <div className="p-8 text-center text-xs text-command-muted animate-pulse">
            Loading explainable decision audit records...
          </div>
        )}

        {error && (
          <div className="p-4 bg-command-danger/10 border border-command-danger/30 text-command-danger rounded flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div className="p-8 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
            No audit records found matching the selected category.
          </div>
        )}

        {!loading &&
          !error &&
          filteredLogs.map((log) => {
            const oversight = getHumanOversightBadge(log);
            const OversightIcon = oversight.icon;
            const evidenceList = formatEvidencePoints(log.evidence_data);
            const category = getCategory(log);

            return (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-command-card/60 border border-command-border hover:border-command-accent/60 transition-all space-y-2.5 relative group shadow-md"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between pb-2 border-b border-command-border/40">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/40">
                      {category}
                    </span>
                    <h3 className="text-xs font-bold text-command-text truncate max-w-[300px]">
                      {log.prompt_summary}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border flex items-center space-x-1 ${oversight.color}`}>
                      <OversightIcon size={11} />
                      <span>{oversight.label}</span>
                    </span>
                    <span className="text-[10px] text-command-muted font-mono flex items-center">
                      <Clock size={11} className="mr-1 text-command-accent" />
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Recommendation Body */}
                <div className="bg-command-bg/50 p-2.5 rounded border border-command-border/40 space-y-1">
                  <div className="text-[9px] text-command-muted uppercase font-bold tracking-wider">
                    Recommendation / Action Taken
                  </div>
                  <div className="text-xs font-semibold text-command-text font-mono leading-snug">
                    {log.recommendation}
                  </div>
                </div>

                {/* Evidence Key Points */}
                {evidenceList.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[9px] text-command-muted uppercase font-bold tracking-wider">
                      Supporting Evidence
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[10px] font-mono">
                      {evidenceList.map((item, idx) => (
                        <div key={idx} className="bg-command-panel p-1.5 rounded border border-command-border/40 flex items-center justify-between">
                          <span className="text-command-muted truncate pr-2">• {item.key}:</span>
                          <span className="text-command-text font-bold truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-command-border/40 text-[10px] text-command-muted">
                  <div className="flex items-center space-x-3 font-mono">
                    <span>AI Confidence: <strong className="text-emerald-400">{(log.confidence_score * 100).toFixed(0)}%</strong></span>
                    <span>Agent: <strong className="text-command-text">{log.agent_name.replace(/_/g, ' ')}</strong></span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLog(log);
                      setShowTechnicalDetails(false);
                    }}
                    className="px-3 py-1 bg-command-accent/20 hover:bg-command-accent text-command-accent hover:text-slate-950 font-bold rounded border border-command-accent/40 transition-colors flex items-center space-x-1"
                  >
                    <Eye size={12} />
                    <span>VIEW DETAILS</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* 4. Decision Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-command-panel border border-command-border rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-command-border">
              <div className="flex items-center space-x-2">
                <Cpu size={20} className="text-command-accent" />
                <div>
                  <h2 className="text-sm font-extrabold text-command-text uppercase tracking-wider">
                    DECISION DETAILS & EXPLANATION
                  </h2>
                  <p className="text-[10px] text-command-muted font-mono">
                    Audit ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-command-muted hover:text-white font-bold p-1 rounded bg-command-card"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="bg-command-card/60 p-3 rounded border border-command-border space-y-1">
                <div className="text-[10px] text-command-muted uppercase font-bold">Event / Query Summary:</div>
                <div className="text-xs font-bold text-command-text">{selectedLog.prompt_summary}</div>
              </div>

              <div className="bg-command-card/60 p-3 rounded border border-command-border space-y-1">
                <div className="text-[10px] text-command-muted uppercase font-bold">AI Recommendation:</div>
                <div className="text-xs font-mono font-bold text-amber-300 bg-command-bg/80 p-2.5 rounded border border-command-border/50">
                  {selectedLog.recommendation}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-command-card/60 p-3 rounded border border-command-border font-mono text-[10px]">
                  <div className="text-command-muted font-sans uppercase font-bold mb-1">AI Confidence Score:</div>
                  <div className="text-sm font-bold text-emerald-400">{(selectedLog.confidence_score * 100).toFixed(1)}%</div>
                </div>

                <div className="bg-command-card/60 p-3 rounded border border-command-border font-mono text-[10px]">
                  <div className="text-command-muted font-sans uppercase font-bold mb-1">Recorded Timestamp:</div>
                  <div className="text-xs font-bold text-command-text">{new Date(selectedLog.created_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Formatted Evidence */}
              <div className="bg-command-card/60 p-3 rounded border border-command-border space-y-2">
                <div className="text-[10px] text-command-muted uppercase font-bold">Evidence Key-Value Pairs:</div>
                <div className="space-y-1 font-mono text-[11px]">
                  {formatEvidencePoints(selectedLog.evidence_data).map((pt, idx) => (
                    <div key={idx} className="bg-command-bg p-2 rounded border border-command-border/40 flex items-center justify-between">
                      <span className="text-command-muted">{pt.key}:</span>
                      <span className="text-command-text font-bold">{pt.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collapsible Technical Details */}
              <div className="border border-command-border/60 rounded overflow-hidden">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="w-full bg-command-card/80 p-2.5 flex items-center justify-between text-command-muted hover:text-white text-[11px] font-bold"
                >
                  <span>TECHNICAL EVIDENCE (DEVELOPER)</span>
                  {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showTechnicalDetails && (
                  <div className="p-3 bg-command-bg space-y-2 font-mono text-[10px] text-command-muted border-t border-command-border/40">
                    <div>Model Used: {selectedLog.model_used}</div>
                    <div>Execution Time: {selectedLog.execution_time_ms} ms</div>
                    <div>Agent Name: {selectedLog.agent_name}</div>
                    <div>
                      <div className="text-command-muted mb-1">Raw Evidence JSON:</div>
                      <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-[9px] text-emerald-400">
                        {JSON.stringify(selectedLog.evidence_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-command-border flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-command-card hover:bg-command-border text-command-text font-bold rounded border border-command-border"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
