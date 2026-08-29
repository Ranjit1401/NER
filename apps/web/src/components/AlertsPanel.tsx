import React from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AlertItem {
  id: string;
  category: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  timestamp: string;
  source: string;
}

const DEMO_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    category: 'CRITICAL',
    title: 'NH-6 Highway Blockage Alert',
    description: 'Landslide in East Khasi Hills (Shillong-Jowai section) has completely blocked traffic. Heavy vehicles prohibited.',
    timestamp: '10 mins ago',
    source: 'Route Intelligence Agent',
  },
  {
    id: 'alt-2',
    category: 'CRITICAL',
    title: 'Brahmaputra River Warning',
    description: 'Flash flood levels in Kamrup Metropolitan exceeding danger mark. Guwahati emergency depot on high alert.',
    timestamp: '25 mins ago',
    source: 'Disaster Intelligence Agent',
  },
  {
    id: 'alt-3',
    category: 'WARNING',
    title: 'Low Water Stock at Shillong Camp',
    description: 'Water purification tablet inventory dropped below 250 packs. Dispatch order proposed.',
    timestamp: '1 hour ago',
    source: 'Resource Inventory System',
  },
  {
    id: 'alt-4',
    category: 'INFO',
    title: 'Teesta Stage-III GLOF Advisory',
    description: 'Glacial lake level monitoring in North Sikkim initiated. Advisory issued for downstream transit.',
    timestamp: '2 hours ago',
    source: 'Sikkim SDMA Alert Feed',
  },
];

export const AlertsPanel: React.FC = () => {
  return (
    <div className="bg-command-panel border border-command-border rounded-lg p-6 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-command-border mb-4">
        <div className="flex items-center space-x-2">
          <Bell size={20} className="text-command-danger animate-pulse" />
          <h2 className="text-base font-bold text-command-text uppercase tracking-wider">
            Real-Time Command Alerts ({DEMO_ALERTS.length})
          </h2>
        </div>
        <span className="text-xs bg-command-card text-command-muted px-2.5 py-1 rounded border border-command-border">
          DEMO / SYNTHETIC FEED
        </span>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {DEMO_ALERTS.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border text-xs flex items-start space-x-3 ${
              alert.category === 'CRITICAL'
                ? 'bg-command-danger/10 border-command-danger/40'
                : alert.category === 'WARNING'
                ? 'bg-command-warning/10 border-command-warning/40'
                : 'bg-command-card/60 border-command-border'
            }`}
          >
            {alert.category === 'CRITICAL' ? (
              <ShieldAlert size={20} className="text-command-danger shrink-0 mt-0.5" />
            ) : alert.category === 'WARNING' ? (
              <AlertTriangle size={20} className="text-command-warning shrink-0 mt-0.5" />
            ) : (
              <Info size={20} className="text-command-accent shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-command-text text-sm">{alert.title}</span>
                <span className="text-[10px] text-command-muted font-mono">{alert.timestamp}</span>
              </div>
              <p className="text-command-muted mb-2">{alert.description}</p>
              <div className="text-[10px] font-semibold text-command-accent">Source: {alert.source}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
