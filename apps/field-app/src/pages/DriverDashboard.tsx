import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Wifi,
  MapPin,
  ArrowRight,
  Package,
  AlertTriangle,
  Home,
  Navigation,
  Map,
  ShieldAlert,
  User,
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'trip' | 'map' | 'report' | 'profile'>('home');

  return (
    <div className="min-h-screen bg-command-bg flex flex-col justify-between max-w-md mx-auto relative pb-20">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 shadow-xl space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">
                TRUCK DRIVER
              </h1>
              <p className="text-[10px] text-command-muted font-mono">CONVOY: DISP-1001</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
            <Wifi size={10} className="animate-pulse mr-1" />
            <span>ONLINE</span>
          </span>
        </div>

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-command-card/80 p-2 rounded-lg border border-command-border/60 flex items-center space-x-1.5">
            <MapPin size={12} className="text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-command-muted block text-[8px]">DRIVER STATUS</span>
              <strong className="text-amber-300 truncate">EN ROUTE</strong>
            </div>
          </div>

          <div className="bg-command-card/80 p-2 rounded-lg border border-command-border/60 flex items-center space-x-1.5">
            <Navigation size={12} className="text-command-accent shrink-0" />
            <div>
              <span className="text-command-muted block text-[8px]">CORRIDOR</span>
              <strong className="text-white">NH-27 Main</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <>
            {/* Active Delivery Card */}
            <div className="bg-command-panel border border-amber-500/60 p-5 rounded-2xl shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-md">
                  ACTIVE DELIVERY
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  READY
                </span>
              </div>

              {/* Origin -> Destination */}
              <div className="flex items-center justify-between bg-command-card/80 p-3 rounded-xl border border-command-border/60">
                <div>
                  <span className="text-[9px] text-command-muted block uppercase font-bold">Origin</span>
                  <strong className="text-sm font-bold text-white">Guwahati</strong>
                </div>
                <ArrowRight size={18} className="text-amber-400 shrink-0 mx-2" />
                <div className="text-right">
                  <span className="text-[9px] text-command-muted block uppercase font-bold">Destination</span>
                  <strong className="text-sm font-bold text-white">Shillong</strong>
                </div>
              </div>

              {/* Route & Cargo Details */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-command-bg/80 p-2.5 rounded-xl border border-command-border/40">
                  <span className="text-[9px] text-command-muted block font-sans uppercase">Assigned Route</span>
                  <strong className="text-command-accent">NH-27</strong>
                </div>
                <div className="bg-command-bg/80 p-2.5 rounded-xl border border-command-border/40">
                  <span className="text-[9px] text-command-muted block font-sans uppercase">Cargo Manifest</span>
                  <strong className="text-amber-300 flex items-center">
                    <Package size={12} className="mr-1" />
                    <span>Food + Water</span>
                  </strong>
                </div>
              </div>

              <button
                onClick={() => navigate('/driver/trip')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-wider text-xs flex items-center justify-center space-x-2"
              >
                <span>VIEW ACTIVE TRIP</span>
              </button>
            </div>

            {/* Other Action Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Report Problem */}
              <div
                onClick={() => navigate('/driver/report-problem')}
                className="bg-command-panel border border-command-border hover:border-amber-500 p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl w-fit">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    REPORT PROBLEM
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    Log landslide or road block
                  </p>
                </div>
              </div>

              {/* Card 2: My Trips */}
              <div
                onClick={() => navigate('/driver/trip')}
                className="bg-command-panel border border-command-border hover:border-command-accent p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
              >
                <div className="p-3 bg-command-accent/20 text-command-accent rounded-xl w-fit">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    MY TRIPS
                  </h3>
                  <p className="text-[10px] text-command-muted mt-0.5">
                    View assigned trip history
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Emergency Banner */}
            <div
              onClick={() => navigate('/driver/emergency')}
              className="bg-red-500/10 border border-red-500/40 p-4 rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-red-300 uppercase tracking-wider">
                    EMERGENCY ASSISTANCE
                  </h3>
                  <p className="text-[10px] text-red-200/80">
                    Immediate SOS dispatch alert
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-red-400" />
            </div>
          </>
        )}

        {activeTab === 'trip' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">TRIP DETAILS</h2>
            <div className="p-3 bg-command-card/50 rounded-xl border border-command-border text-xs text-command-muted font-mono space-y-1">
              <div>DISPATCH: DISP-1001</div>
              <div>Guwahati Central Depot ➔ Shillong Camp</div>
              <div>Cargo: 100 Boxes Rice + 50 Packs Water</div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3 text-center">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">CORRIDOR MAP</h2>
            <div className="p-8 border border-dashed border-command-border rounded-xl text-xs text-command-muted font-mono">
              NH-27 Highway Navigation GPS Active
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">REPORT ROAD HAZARD</h2>
            <div className="p-3 bg-command-card/50 rounded-xl border border-command-border text-xs text-command-muted font-mono">
              Select hazard type: Landslide / Waterlogging / Road Block
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3 text-xs">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">DRIVER PROFILE</h2>
            <div className="text-command-muted font-mono">Driver ID: NER-DRIVER-01</div>
            <div className="text-command-muted font-mono">Vehicle: Heavy Axle Convoy Truck</div>
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
            activeTab === 'home' ? 'text-amber-400 bg-amber-500/10 font-bold' : 'text-command-muted'
          }`}
        >
          <Home size={18} />
          <span>HOME</span>
        </button>

        <button
          onClick={() => navigate('/driver/trip')}
          className="flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl text-command-muted hover:text-white transition-all"
        >
          <Truck size={18} />
          <span>TRIP</span>
        </button>

        <button
          onClick={() => navigate('/driver/map')}
          className="flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl text-command-muted hover:text-white transition-all"
        >
          <Map size={18} />
          <span>MAP</span>
        </button>

        <button
          onClick={() => navigate('/driver/report-problem')}
          className="flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl text-command-muted hover:text-white transition-all"
        >
          <AlertTriangle size={18} />
          <span>REPORT</span>
        </button>

        <button
          onClick={() => navigate('/driver/profile')}
          className="flex flex-col items-center space-y-1 text-[10px] font-mono p-2 rounded-xl text-command-muted hover:text-white transition-all"
        >
          <User size={18} />
          <span>PROFILE</span>
        </button>
      </div>
    </div>
  );
};
