import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, Loader2, Send } from 'lucide-react';
import { driverStore } from '../services/driverStore';
import { driverSync } from '../services/driverSync';

export const DriverReportProblem: React.FC = () => {
  const navigate = useNavigate();
  const [problemType, setProblemType] = useState('ROAD BLOCKAGE');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [description, setDescription] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await driverStore.saveEvent({
        eventType: 'PROBLEM_REPORT',
        dispatchId: 'DISP-1001',
        problemType,
        severity,
        latitude: 26.1833,
        longitude: 91.7333,
        description,
        photoName: photoName || undefined,
      });

      if (navigator.onLine) {
        await driverSync.syncPendingDriverEvents();
      }

      setMessage('Road problem report saved offline and queued.');
      setTimeout(() => {
        navigate('/driver-dashboard');
      }, 1000);
    } catch {
      setMessage('Failed to log problem report.');
      setSubmitting(false);
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
            REPORT ROAD PROBLEM
          </h1>
          <p className="text-[10px] text-command-muted font-mono">Convoy Hazard Observation</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            PROBLEM TYPE
          </label>
          <select
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            className="w-full bg-command-panel border border-command-border rounded-xl py-3 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ROAD BLOCKAGE">ROAD BLOCKAGE</option>
            <option value="LANDSLIDE">LANDSLIDE</option>
            <option value="VEHICLE BREAKDOWN">VEHICLE BREAKDOWN</option>
            <option value="HEAVY RAIN">HEAVY RAIN</option>
            <option value="FLOODING">FLOODING</option>
            <option value="ACCIDENT">ACCIDENT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            SEVERITY
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
            className="w-full bg-command-panel border border-command-border rounded-xl py-3 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            placeholder="Describe the road issue..."
            className="w-full bg-command-panel border border-command-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-all resize-none"
          />
        </div>

        <div className="space-y-1.5 bg-command-panel border border-command-border p-3.5 rounded-xl">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            ATTACH PHOTO
          </label>
          <label className="cursor-pointer bg-command-card hover:bg-command-border border border-dashed border-command-border text-command-text font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all block text-center">
            <Camera size={16} className="text-amber-400 inline mr-1" />
            <span>{photoName ? photoName : 'TAKE / CHOOSE PHOTO'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>{submitting ? 'LOGGING...' : 'SUBMIT ROAD PROBLEM'}</span>
        </button>
      </form>
    </div>
  );
};
