import React, { useState, useEffect } from 'react';
import { DispatchOrder, LogisticsHub, api } from '../services/api';
import { Truck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { CommanderReviewModal } from './CommanderReviewModal';

interface DispatchOperationsViewProps {
  hubs: LogisticsHub[];
  onDataRefresh: () => void;
}

export const DispatchOperationsView: React.FC<DispatchOperationsViewProps> = ({ hubs, onDataRefresh }) => {
  const [dispatches, setDispatches] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);

  const loadDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispatch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, []);

  const getHubById = (hubId?: string | null) => {
    if (!hubId) return null;
    return hubs.find((h) => h.id === hubId) || null;
  };

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4">
        <div className="flex items-center space-x-2">
          <Truck size={20} className="text-command-accent" />
          <h2 className="text-base font-bold text-command-text uppercase tracking-wider">
            Operational Dispatch Queue & Human Sign-Off
          </h2>
        </div>
        <span className="text-xs bg-command-card text-command-muted px-2.5 py-1 rounded border border-command-border">
          HITL Workflow Active
        </span>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {loading && (
          <div className="p-8 text-center text-xs text-command-muted animate-pulse">
            Loading dispatch queue...
          </div>
        )}

        {error && (
          <div className="p-4 bg-command-danger/10 border border-command-danger/30 text-command-danger rounded flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && dispatches.length === 0 && (
          <div className="p-8 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
            No dispatch orders in queue.
          </div>
        )}

        {!loading &&
          !error &&
          dispatches.map((order) => {
            const originHub = getHubById(order.origin_hub_id);
            const destHub = getHubById(order.destination_hub_id);
            const isPending = order.status === 'PENDING_APPROVAL' || order.status === 'PROPOSED';

            return (
              <div
                key={order.id}
                className={`p-4 rounded-lg border text-xs transition-all ${
                  isPending
                    ? 'bg-command-warning/10 border-command-warning/40'
                    : order.status === 'APPROVED'
                    ? 'bg-command-success/10 border-command-success/30'
                    : order.status === 'REJECTED'
                    ? 'bg-command-danger/10 border-command-danger/30'
                    : 'bg-command-card/60 border-command-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-command-text text-sm">{order.order_code}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        order.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1 bg-command-accent hover:bg-command-accent/80 text-white font-bold rounded flex items-center space-x-1"
                    >
                      <ShieldAlert size={14} />
                      <span>REVIEW DISPATCH</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-2 p-2 bg-command-bg/50 rounded border border-command-border/40">
                  <div>
                    <span className="text-command-muted text-[10px] uppercase block">Origin:</span>
                    <span className="font-bold text-command-text">{originHub?.name || order.origin_hub_id}</span>
                  </div>
                  <div>
                    <span className="text-command-muted text-[10px] uppercase block">Destination:</span>
                    <span className="font-bold text-command-text">{destHub?.name || order.destination_hub_id}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-command-muted pt-1">
                  <span>
                    Allocated Items:{' '}
                    <span className="font-mono text-command-text">
                      {Object.entries(order.allocated_items)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </span>
                  </span>
                  <span>Created: {new Date(order.created_at).toLocaleTimeString()}</span>
                </div>

                {order.rejection_reason && (
                  <div className="mt-2 p-2 bg-command-danger/20 border border-command-danger/30 rounded text-command-danger text-[11px]">
                    Rejection Reason: {order.rejection_reason}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Review Modal */}
      {selectedOrder && (
        <CommanderReviewModal
          order={selectedOrder}
          originHub={getHubById(selectedOrder.origin_hub_id)}
          destinationHub={getHubById(selectedOrder.destination_hub_id)}
          onClose={() => setSelectedOrder(null)}
          onActionComplete={() => {
            loadDispatches();
            onDataRefresh();
          }}
        />
      )}
    </div>
  );
};
