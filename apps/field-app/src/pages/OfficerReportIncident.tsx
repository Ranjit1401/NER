import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { fieldReportStore } from '../services/fieldReportStore';

export const OfficerReportIncident: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [reportType, setReportType] = useState('ROAD BLOCKAGE / LANDSLIDE');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [description, setDescription] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Capture GPS Location via browser Geolocation API
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your device.');
      return;
    }

    setGettingLocation(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
        setLocationStatus('Location captured successfully.');
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('Location permission denied by user.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationStatus('Location request timed out.');
            break;
          default:
            setLocationStatus('Unable to obtain GPS coordinates.');
            break;
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Photo Capture/Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Form to IndexedDB
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fieldReportStore.saveReport({
        reportType,
        severity,
        latitude,
        longitude,
        description,
        photoName: photoName || undefined,
        photoPreview: photoPreview || undefined,
      });

      setSubmittedMessage('Field report saved to local offline store.');
      setTimeout(() => {
        navigate('/officer/reports');
      }, 1000);
    } catch {
      setLocationStatus('Failed to save report locally.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-command-bg flex flex-col max-w-md mx-auto relative pb-8">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-4 flex items-center space-x-3 shrink-0 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-command-card rounded-xl border border-command-border text-white hover:text-command-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">
            CREATE INCIDENT REPORT
          </h1>
          <p className="text-[10px] text-command-muted">Submit a field observation</p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
        {submittedMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{submittedMessage}</span>
          </div>
        )}

        {/* Report Type Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            REPORT TYPE
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-command-panel border border-command-border rounded-xl py-3 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-command-accent"
          >
            <option value="ROAD BLOCKAGE / LANDSLIDE">ROAD BLOCKAGE / LANDSLIDE</option>
            <option value="FLOODING">FLOODING</option>
            <option value="ACCIDENT">ACCIDENT</option>
            <option value="INFRASTRUCTURE DAMAGE">INFRASTRUCTURE DAMAGE</option>
            <option value="SUPPLY SHORTAGE">SUPPLY SHORTAGE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* Severity Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            SEVERITY
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
            className="w-full bg-command-panel border border-command-border rounded-xl py-3 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-command-accent"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {/* Location Section */}
        <div className="space-y-1.5 bg-command-panel border border-command-border p-3.5 rounded-xl">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider flex items-center justify-between">
            <span>LOCATION</span>
            {latitude && longitude && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                <CheckCircle2 size={10} className="mr-1" /> Captured
              </span>
            )}
          </label>

          {latitude && longitude ? (
            <div className="p-2 bg-command-card/80 border border-command-border/60 rounded-lg text-xs font-mono text-command-text">
              {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
            </div>
          ) : (
            <div className="text-xs text-command-muted font-mono italic">
              No coordinates captured yet.
            </div>
          )}

          {locationStatus && (
            <div className="text-[11px] font-mono text-amber-300 flex items-center space-x-1">
              <AlertCircle size={12} />
              <span>{locationStatus}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className="w-full bg-command-card hover:bg-command-border border border-command-border text-command-accent font-bold py-2.5 rounded-lg text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {gettingLocation ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MapPin size={14} />
            )}
            <span>{gettingLocation ? 'LOCATING GPS...' : 'USE CURRENT LOCATION'}</span>
          </button>
        </div>

        {/* Description Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            placeholder="Describe what you observed (e.g. Mudslide blocking NH-6 right lane near kilometer 42)..."
            className="w-full bg-command-panel border border-command-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-command-accent transition-all resize-none"
          />
        </div>

        {/* Photo Input Section */}
        <div className="space-y-1.5 bg-command-panel border border-command-border p-3.5 rounded-xl">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            ATTACH PHOTO
          </label>

          <label className="cursor-pointer bg-command-card hover:bg-command-border border border-dashed border-command-border text-command-text font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all block text-center">
            <Camera size={16} className="text-command-accent inline mr-1" />
            <span>{photoName ? photoName : 'TAKE / CHOOSE PHOTO'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>

          {photoPreview && (
            <div className="mt-2 rounded-lg overflow-hidden border border-command-border max-h-36">
              <img src={photoPreview} alt="Field Capture Preview" className="w-full h-36 object-cover" />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-command-accent hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          <span>{submitting ? 'SAVING LOCALLY...' : 'SUBMIT FIELD REPORT'}</span>
        </button>
      </form>
    </div>
  );
};
