import React from 'react';
import { InventoryItem, LogisticsHub } from '../services/api';
import { Box } from 'lucide-react';

interface ResourcePanelProps {
  hubs: LogisticsHub[];
  loading: boolean;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ hubs, loading }) => {
  const allInventoryItems: Array<InventoryItem & { hubName: string }> = [];
  hubs.forEach((hub) => {
    if (hub.inventory_items) {
      hub.inventory_items.forEach((item) => {
        allInventoryItems.push({ ...item, hubName: hub.name });
      });
    }
  });

  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-command-border mb-3">
        <div className="flex items-center space-x-2">
          <Box size={18} className="text-command-accent" />
          <h2 className="text-sm font-bold text-command-text uppercase tracking-wider">
            Resource Stock & Supply Inventory ({allInventoryItems.length})
          </h2>
        </div>
        <span className="text-[10px] bg-command-card text-command-muted px-2 py-0.5 rounded border border-command-border">
          Deterministic Stock Tracker
        </span>
      </div>

      {/* Inventory Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && (
          <div className="p-6 text-center text-xs text-command-muted animate-pulse">
            Loading emergency resource stock...
          </div>
        )}

        {!loading && allInventoryItems.length === 0 && (
          <div className="p-6 text-center text-xs text-command-muted border border-dashed border-command-border rounded">
            No stock inventory records available.
          </div>
        )}

        {!loading &&
          allInventoryItems.map((item) => {
            const isLowStock = item.quantity < 200.0;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-md border transition-all ${
                  isLowStock
                    ? 'bg-command-warning/10 border-command-warning/40'
                    : 'bg-command-card/50 border-command-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-command-text">{item.item_name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isLowStock
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    {isLowStock ? 'LOW STOCK WARNING' : 'ADEQUATE'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-command-muted mt-1">
                  <span>Category: {item.item_category}</span>
                  <span className="font-mono text-xs font-bold text-command-text">
                    {item.quantity} {item.unit}
                  </span>
                </div>

                <div className="text-[10px] text-command-muted mt-1 pt-1 border-t border-command-border/40 flex justify-between">
                  <span>Depot: {item.hubName}</span>
                  <span>Updated: {new Date(item.last_updated).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
