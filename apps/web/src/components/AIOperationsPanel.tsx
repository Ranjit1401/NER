import React, { useState } from 'react';
import { api, OrchestratedQueryResponse } from '../services/api';
import { Bot, Send, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

  export const AIOperationsPanel: React.FC = () => {
    const [query, setQuery] = useState<string>('Heavy rainfall has affected Shillong. Which routes should we avoid and which nearby hubs can supply emergency materials?');
    const [loading, setLoading] = useState<boolean>(false);
    const [response, setResponse] = useState<OrchestratedQueryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAskIntelligence = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setLoading(true);
      setError(null);
      try {
        const res = await api.queryIntelligence(query);
        setResponse(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'AI Query processing failed');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4">
          <div className="flex items-center space-x-2">
            <Bot size={22} className="text-command-accent" />
            <div>
              <h2 className="text-base font-bold text-command-text uppercase tracking-wider">
                Command Intelligence Assistant
              </h2>
              <p className="text-[11px] text-command-muted">
                Multi-agent decision support powered by LatentStack gateway
              </p>
            </div>
          </div>
          <span className="text-xs bg-command-card text-command-accent px-2.5 py-1 rounded border border-command-border flex items-center space-x-1 font-mono">
            <Cpu size={14} className="mr-1" />
            <span>Router: fast-reasoner</span>
          </span>
        </div>

        {/* Query Input Box */}
        <form onSubmit={handleAskIntelligence} className="mb-4">
          <div className="flex items-center space-x-2 bg-command-card p-1.5 rounded-lg border border-command-border">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask intelligence about disasters, route risks, or resource supply..."
              className="flex-1 bg-transparent px-3 py-2 text-xs text-command-text focus:outline-none placeholder-command-muted"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-command-accent hover:bg-command-accent/80 text-white font-bold text-xs px-4 py-2 rounded-md flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Ask Intelligence</span>
            </button>
          </div>
        </form>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {error && (
            <div className="p-3 bg-command-danger/10 border border-command-danger/30 text-command-danger rounded flex items-center space-x-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {response && (
            <div className="space-y-4 animate-fade-in">
              {/* Executive Summary */}
              <div className="p-4 rounded-lg bg-command-card border border-command-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-command-accent uppercase text-[11px] flex items-center">
                    <CheckCircle2 size={14} className="mr-1 text-command-success" />
                    Orchestrated Operational Summary
                  </span>
                  <span className="text-[10px] text-command-muted font-mono">
                    Execution: {response.total_execution_time_ms} ms
                  </span>
                </div>
                <p className="text-command-text text-sm leading-relaxed">{response.final_summary}</p>
              </div>

              {/* Warnings / Safety Overrides */}
              {response.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-command-danger/10 border border-command-danger/40 space-y-1">
                  <div className="font-bold text-command-danger flex items-center text-xs">
                    <ShieldAlert size={14} className="mr-1" />
                    Safety Warnings & Hard Rules Triggered:
                  </div>
                  {response.warnings.map((w, idx) => (
                    <div key={idx} className="text-command-muted text-[11px] font-mono">
                      • {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Execution Plan */}
              <div className="p-3 rounded-lg bg-command-card/50 border border-command-border">
                <div className="font-bold text-command-muted text-[10px] uppercase mb-1.5">
                  Supervisor Plan & Agent Dispatch Strategy
                </div>
                <div className="space-y-1">
                  {response.execution_plan.map((step, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-command-text text-[11px]">
                      <ArrowRight size={12} className="text-command-accent shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialized Agent Findings Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.agent_results.map((agent, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-command-card/60 border border-command-border">
                    <div className="flex items-center justify-between mb-2 border-b border-command-border/50 pb-1.5">
                      <span className="font-bold text-command-text">{agent.agent_name}</span>
                      <span className="text-[10px] font-mono text-command-accent">
                        {(agent.confidence_score * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <p className="text-command-muted text-[11px] mb-2">{agent.summary}</p>

                    {/* Findings */}
                    {agent.findings.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {agent.findings.map((f, fIdx) => (
                          <div key={fIdx} className="bg-command-bg/50 p-1.5 rounded border border-command-border/40 text-[10px]">
                            <span className="font-bold text-command-accent mr-1">[{f.category}]</span>
                            <span className="text-command-text">{f.fact}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommendations (Human-in-the-Loop) */}
              {response.recommendations.length > 0 && (
                <div className="p-4 rounded-lg bg-command-card border border-command-border">
                  <div className="font-bold text-command-text mb-2 text-xs uppercase tracking-wider flex items-center">
                    <ShieldAlert size={16} className="mr-1.5 text-command-warning" />
                    <span>Proposed Actions (Requires Command Officer Sign-Off)</span>
                  </div>
                  <div className="space-y-2">
                    {response.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="p-2.5 bg-command-bg/60 rounded border border-command-border flex items-start justify-between">
                        <div>
                          <div className="font-bold text-command-text text-xs">{rec.action}</div>
                          <div className="text-[11px] text-command-muted mt-0.5">{rec.reasoning}</div>
                        </div>
                        <span className="text-[10px] font-bold bg-command-warning/20 text-command-warning px-2 py-0.5 rounded border border-command-warning/30 shrink-0 ml-2">
                          APPROVAL REQUIRED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
