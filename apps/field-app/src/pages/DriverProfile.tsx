import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut } from 'lucide-react';

export const DriverProfile: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-command-bg flex flex-col max-w-md mx-auto relative pb-8">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 flex items-center space-x-3 shrink-0 shadow-lg">
        <button
          onClick={() => navigate('/driver-dashboard')}
          className="p-2 bg-command-card rounded-xl border border-command-border text-white hover:text-amber-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">
            DRIVER PROFILE
          </h1>
          <p className="text-[10px] text-command-muted font-mono">ID: NER-DRIVER-01</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
        <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <User size={24} />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm">Driver Ramesh Kumar</div>
              <div className="text-[10px] text-command-muted font-mono">Assigned Vehicle: Heavy Axle Truck #AS-01-E-4821</div>
            </div>
          </div>
        </div>

        <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-2 font-mono text-[11px]">
          <div className="text-[10px] text-command-muted uppercase font-bold font-sans">Operational Identity</div>
          <div className="flex justify-between bg-command-card/50 p-2 rounded-lg border border-command-border/40">
            <span className="text-command-muted">CONVOY ORDER:</span>
            <span className="text-amber-300 font-bold">DISP-1001</span>
          </div>
          <div className="flex justify-between bg-command-card/50 p-2 rounded-lg border border-command-border/40">
            <span className="text-command-muted">CORRIDOR:</span>
            <span className="text-white font-bold">NH-27 Guwahati ➔ Shillong</span>
          </div>
          <div className="flex justify-between bg-command-card/50 p-2 rounded-lg border border-command-border/40">
            <span className="text-command-muted">STATUS:</span>
            <span className="text-emerald-400 font-bold">ACTIVE EN ROUTE</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/role-selection')}
          className="w-full bg-command-card hover:bg-command-border text-command-text py-3 rounded-xl font-bold transition-all border border-command-border flex items-center justify-center space-x-2"
        >
          <LogOut size={16} />
          <span>SWITCH ROLE / LOGOUT</span>
        </button>
      </div>
    </div>
  );
};
