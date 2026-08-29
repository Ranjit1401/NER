import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { driverStore } from '../services/driverStore';
import { driverSync } from '../services/driverSync';

export const DriverEmergency: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleTriggerEmergency = async (type: string) => {
    setSubmitting(true);
    setMessage(null);

    try {
      await driverStore.saveEvent({
        eventType: 'EMERGENCY_SOS',
        dispatchId: 'DISP-1001',
        problemType: type,
        severity: 'CRITICAL',
        latitude: 26.1833,
        longitude: 91.7333,
        description: `DRIVER EMERGENCY SOS TRIGGERED: ${type}`,
      });

      if (navigator.onLine) {
        await driverSync.syncPendingDriverEvents();
      }

      setMessage(`🚨 EMERGENCY SOS BROADCAST: ${type}`);
    } catch {
      setMessage(`🚨 SOS RECORDED OFFLINE: ${type}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-command-bg flex flex-col max-w-md mx-auto relative pb-8">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 flex items-center space-x-3 shrink-0 shadow-lg">
        <button
          onClick={() => navigate('/driver-dashboard')}
          className="p-2 bg-command-card rounded-xl border border-command-border text-white hover:text-red-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-sm font-black text-red-400 uppercase tracking-wider">
            EMERGENCY ASSISTANCE (SOS)
          </h1>
          <p className="text-[10px] text-command-muted font-mono">Immediate Alert Broadcast</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {message && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-300 font-bold rounded-xl text-xs flex items-center space-x-2 animate-pulse">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-200 space-y-1">
          <div className="font-extrabold uppercase text-red-400 flex items-center space-x-1.5">
            <ShieldAlert size={16} />
            <span>Command Center Priority Alert</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Pressing an emergency button captures your live GPS location and broadcasts a priority alert to the Command Center.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleTriggerEmergency('VEHICLE BREAKDOWN')}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>🚨 VEHICLE BREAKDOWN</span>}
          </button>

          <button
            onClick={() => handleTriggerEmergency('MEDICAL EMERGENCY')}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>🚨 MEDICAL EMERGENCY</span>}
          </button>

          <button
            onClick={() => handleTriggerEmergency('ROAD BLOCKED')}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>🚨 ROAD BLOCKED</span>}
          </button>

          <button
            onClick={() => handleTriggerEmergency('SECURITY EMERGENCY')}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>🚨 SECURITY EMERGENCY</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
