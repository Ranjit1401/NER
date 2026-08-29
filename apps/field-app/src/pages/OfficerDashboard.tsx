import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  Bell,
  Home,
  FileCheck,
  Briefcase,
  User,
} from 'lucide-react';
import { fieldReportStore } from '../services/fieldReportStore';

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'operations' | 'profile'>('home');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch live pending sync count from IndexedDB
  const updatePendingCount = async () => {
    try {
      const count = await fieldReportStore.getPendingCount();
      setPendingSyncCount(count);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    updatePendingCount();
  }, []);

  return (
    <div className="min-h-screen bg-command-bg flex flex-col justify-between max-w-md mx-auto relative pb-20">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 shadow-xl space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-6 w-6 text-command-accent" />
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">
                FIELD OFFICER
              </h1>
              <p className="text-[10px] text-command-muted font-mono">ID: NER-OFFICER-01</p>
            </div>
          </div>

          {isOnline ? (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
              <Wifi size={10} className="animate-pulse mr-1" />
              <span>ONLINE</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
              <WifiOff size={10} className="animate-pulse mr-1" />
              <span>OFFLINE</span>
            </span>
          )}
        </div>

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-command-card/80 p-2 rounded-lg border border-command-border/60 flex items-center space-x-1.5">
            <MapPin size={12} className="text-command-accent shrink-0" />
            <div className="truncate">
              <span className="text-command-muted block text-[8px]">LOCATION</span>
              <strong className="text-white truncate">Guwahati, Assam</strong>
            </div>
          </div>

          <div className="bg-command-card/80 p-2 rounded-lg border border-command-border/60 flex items-center space-x-1.5">
            <RefreshCw size={12} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-command-muted block text-[8px]">PENDING SYNC</span>
              <strong className="text-amber-300">{pendingSyncCount} Items</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <>
            {/* Urgent Incident Alert Banner */}
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-3 text-red-300">
              <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 animate-bounce" />
              <div>
                <div className="font-extrabold text-xs uppercase tracking-wider">Critical Hazard Alert</div>
                <div className="text-[10px] text-red-200/80">
                  Heavy rainfall reported along NH-6 corridor.
                </div>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Report Incident */}
              <div
                onClick={() => navigate('/officer/report-incident')}
                className="bg-command-panel border border-command-border hover:border-red-500/60 p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-red-500/20 text-red-400 rounded-xl w-fit">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    REPORT INCIDENT
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    Log new hazard or disaster
                  </p>
                </div>
              </div>

              {/* Card 2: Field Reports */}
              <div
                onClick={() => navigate('/officer/reports')}
                className="bg-command-panel border border-command-border hover:border-command-accent p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-command-accent/20 text-command-accent rounded-xl w-fit">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    FIELD REPORTS
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    View submitted observations
                  </p>
                </div>
              </div>

              {/* Card 3: Assigned Operations */}
              <div
                onClick={() => setActiveTab('operations')}
                className="bg-command-panel border border-command-border hover:border-emerald-500/60 p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    ASSIGNED OPS
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    Monitor active relief missions
                  </p>
                </div>
              </div>

              {/* Card 4: Alerts */}
              <div
                onClick={() => setActiveTab('home')}
                className="bg-command-panel border border-command-border hover:border-amber-500/60 p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl w-fit">
                  <Bell size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    ALERTS
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    View critical warnings
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">FIELD REPORTS NAVIGATION</h2>
            <button
              onClick={() => navigate('/officer/reports')}
              className="w-full bg-command-accent text-white py-2.5 rounded-xl font-bold text-xs"
            >
              Open Offline Reports Manager
            </button>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">ASSIGNED OPERATIONS</h2>
            <div className="p-3 bg-command-card/50 rounded-xl border border-command-border text-xs text-command-muted font-mono space-y-1">
              <div className="text-emerald-400 font-bold">MISSION: Kamrup Relief Supply</div>
              <div>Hub: Guwahati Central Depot</div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3 text-xs">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">OFFICER PROFILE</h2>
            <div className="text-command-muted font-mono">Officer ID: NER-OFFICER-01</div>
            <div className="text-command-muted font-mono">Zone: Kamrup Metropolitan</div>
            <button
              onClick={() => navigate('/role-selection')}
              className="w-full bg-command-card hover:bg-command-border text-command-text py-2 rounded-xl font-bold transition-all"
            >
              Switch Role
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-command-panel border-t border-command-border p-2 flex justify-around items-center z-50">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl transition-all ${
            activeTab === 'home' ? 'text-command-accent bg-command-accent/10 font-bold' : 'text-command-muted'
          }`}
        >
          <Home size={18} />
          <span>HOME</span>
        </button>

        <button
          onClick={() => navigate('/officer/reports')}
          className="flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl text-command-muted hover:text-white transition-all"
        >
          <FileCheck size={18} />
          <span>REPORTS</span>
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl transition-all ${
            activeTab === 'operations' ? 'text-command-accent bg-command-accent/10 font-bold' : 'text-command-muted'
          }`}
        >
          <Briefcase size={18} />
          <span>OPS</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl transition-all ${
            activeTab === 'profile' ? 'text-command-accent bg-command-accent/10 font-bold' : 'text-command-muted'
          }`}
        >
          <User size={18} />
          <span>PROFILE</span>
        </button>
      </div>
    </div>
  );
};
