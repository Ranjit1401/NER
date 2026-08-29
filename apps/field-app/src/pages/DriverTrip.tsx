import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { driverStore } from '../services/driverStore';
import { driverSync } from '../services/driverSync';

export const DriverTrip: React.FC = () => {
  const navigate = useNavigate();
  const [tripStatus, setTripStatus] = useState<'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'DELIVERED'>('EN_ROUTE');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load last saved trip status from local IndexedDB
  useEffect(() => {
    driverStore.getAllEvents().then((events) => {
      const tripUpdates = events.filter((e) => e.eventType === 'TRIP_UPDATE' && e.tripStatus);
      if (tripUpdates.length > 0) {
        const latestStatus = tripUpdates[0].tripStatus as 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'DELIVERED';
        setTripStatus(latestStatus);
      }
    }).catch(() => {});
  }, []);

  const handleStatusTransition = async (newStatus: 'ACCEPTED' | 'EN_ROUTE' | 'DELIVERED') => {
    setUpdating(true);
    setMessage(null);

    try {
      setTripStatus(newStatus);
      await driverStore.saveEvent({
        eventType: 'TRIP_UPDATE',
        dispatchId: 'DISP-1001',
        tripStatus: newStatus,
        latitude: 26.1833,
        longitude: 91.7333,
        description: `Driver updated trip status to ${newStatus}`,
      });

      if (navigator.onLine) {
        await driverSync.syncPendingDriverEvents();
      }

      setMessage(`Trip status updated to ${newStatus}.`);
    } catch {
      setMessage(`Status updated to ${newStatus} (Saved Offline).`);
    } finally {
      setUpdating(false);
    }
  };

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
            ACTIVE TRIP DISPATCH
          </h1>
          <p className="text-[10px] text-command-muted font-mono">ORDER: DISP-1001</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {/* Current Lifecycle Status Banner */}
        <div className="bg-command-panel border border-amber-500/60 p-4 rounded-2xl space-y-2">
          <div className="text-[10px] text-command-muted uppercase font-bold tracking-wider">
            Current Trip Lifecycle Status
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black font-mono text-amber-300">
              {tripStatus}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              GPS ACTIVE
            </span>
          </div>
        </div>

        {/* Origin & Destination */}
        <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-3">
          <div className="text-xs font-bold text-command-muted uppercase tracking-wider">
            Route Corridors & Hubs
          </div>
          <div className="flex items-center justify-between bg-command-card/80 p-3 rounded-xl border border-command-border/60 text-xs">
            <div>
              <span className="text-[9px] text-command-muted block uppercase font-bold">Origin Depot</span>
              <strong className="text-white text-xs">Guwahati Central Depot</strong>
            </div>
            <ArrowRight size={18} className="text-amber-400 shrink-0 mx-2" />
            <div className="text-right">
              <span className="text-[9px] text-command-muted block uppercase font-bold">Destination Hub</span>
              <strong className="text-white text-xs">Shillong Relief Camp</strong>
            </div>
          </div>
        </div>

        {/* Cargo Manifest */}
        <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-2 text-xs font-mono">
          <div className="text-xs font-bold text-command-muted uppercase font-sans tracking-wider flex items-center space-x-1.5">
            <Package size={14} className="text-amber-400" />
            <span>Cargo Manifest</span>
          </div>
          <div className="p-2.5 bg-command-card/60 rounded-xl border border-command-border/50 flex justify-between">
            <span>FOOD RATIONS:</span>
            <strong className="text-amber-300">100 BOXES</strong>
          </div>
          <div className="p-2.5 bg-command-card/60 rounded-xl border border-command-border/50 flex justify-between">
            <span>WATER TABLETS:</span>
            <strong className="text-amber-300">50 PACKS</strong>
          </div>
        </div>

        {/* Transition Action Buttons */}
        <div className="bg-command-panel border border-command-border p-4 rounded-2xl space-y-2.5">
          <div className="text-xs font-bold text-command-muted uppercase tracking-wider">
            Trip Lifecycle Transition
          </div>

          {tripStatus === 'ASSIGNED' && (
            <button
              onClick={() => handleStatusTransition('ACCEPTED')}
              disabled={updating}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              ACCEPT TRIP
            </button>
          )}

          {tripStatus === 'ACCEPTED' && (
            <button
              onClick={() => handleStatusTransition('EN_ROUTE')}
              disabled={updating}
              className="w-full bg-command-accent hover:bg-blue-600 text-white font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              START TRIP (EN ROUTE)
            </button>
          )}

          {tripStatus === 'EN_ROUTE' && (
            <button
              onClick={() => handleStatusTransition('DELIVERED')}
              disabled={updating}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              MARK DELIVERED
            </button>
          )}

          {tripStatus === 'DELIVERED' && (
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-center font-bold font-mono">
              ✓ TRIP COMPLETED & DELIVERED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
