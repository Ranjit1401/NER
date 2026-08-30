import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Radio,
  WifiOff,
  AlertTriangle,
  Gauge,
  Clock,
} from 'lucide-react';
import { DriverNavigationMap } from '../components/DriverNavigationMap';
import { driverStore } from '../services/driverStore';
import { driverSync } from '../services/driverSync';

export const DriverMap: React.FC = () => {
  const navigate = useNavigate();

  // Guwahati / Shillong NER Demo Coordinates
  const GUWAHATI_LAT = 26.1445;
  const GUWAHATI_LON = 91.7362;
  const SHILLONG_LAT = 25.5788;
  const SHILLONG_LON = 91.8933;

  // GPS State
  const [lat, setLat] = useState<number>(GUWAHATI_LAT);
  const [lon, setLon] = useState<number>(GUWAHATI_LON);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(45);
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

  // Throttled GPS Sync Effect (every 12 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isLiveGps && lat && lon) {
        driverStore
          .saveEvent({
            eventType: 'GPS_UPDATE',
            dispatchId: 'DISP-1001',
            latitude: lat,
            longitude: lon,
            description: `Driver GPS pulse (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          })
          .then(() => {
            if (navigator.onLine) {
              driverSync.syncPendingDriverEvents();
            }
          })
          .catch(() => {});
      }
    }, 12000);

    return () => clearInterval(timer);
  }, [isLiveGps, lat, lon]);

  // Request & Watch GPS Position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS permission required for live navigation.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        if (pos.coords.speed !== null && pos.coords.speed !== undefined) {
          setSpeed(Math.round(pos.coords.speed * 3.6)); // Convert m/s to km/h
        }
        setIsLiveGps(true);
        setGpsError(null);
      },
      (error) => {
        setIsLiveGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location access is required for live driver tracking.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('GPS signal unavailable.');
            break;
          case error.TIMEOUT:
            setGpsError('GPS request timed out.');
            break;
          default:
            setGpsError('Location access error.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleRetryGps = () => {
    setGpsError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setIsLiveGps(true);
        },
        () => {
          setIsLiveGps(false);
          setGpsError('Location access is required for live driver tracking.');
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-command-bg flex flex-col max-w-md mx-auto relative pb-6">
      {/* Header */}
      <div className="bg-command-panel border-b border-command-border p-3.5 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/driver-dashboard')}
            className="p-2 bg-command-card rounded-xl border border-command-border text-white hover:text-amber-400 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xs font-black text-white uppercase tracking-wider">
              CORRIDOR NAVIGATION MAP
            </h1>
            <p className="text-[10px] text-command-muted font-mono">NH-27 • Guwahati ➔ Shillong</p>
          </div>
        </div>

        <span
          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
            isLiveGps
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <Radio size={10} className="animate-ping mr-1" />
          <span>{isLiveGps ? 'LIVE GPS' : 'DEMO GPS'}</span>
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto flex flex-col justify-between">
        {/* GPS Permission Warning Banner */}
        {gpsError && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center justify-between font-mono shrink-0">
            <div className="flex items-center space-x-1.5">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button
              onClick={handleRetryGps}
              className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-extrabold text-[10px]"
            >
              RETRY
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="p-2 bg-slate-900 border border-command-border text-amber-400 rounded-xl text-[10px] font-mono flex items-center space-x-1.5 shrink-0">
            <WifiOff size={12} />
            <span>OFFLINE — LAST KNOWN LOCATION & CACHED ROUTE ACTIVE</span>
          </div>
        )}

        {/* 1. Real Interactive Map Container */}
        <div className="w-full h-[480px] min-h-[420px] shrink-0">
          <DriverNavigationMap
            driverLat={lat}
            driverLon={lon}
            isLiveGps={isLiveGps}
            origin={{ name: 'Guwahati Central Depot', lat: GUWAHATI_LAT, lon: GUWAHATI_LON }}
            destination={{ name: 'Shillong Relief Camp', lat: SHILLONG_LAT, lon: SHILLONG_LON }}
            speedKmh={speed}
            onLocateMe={handleRetryGps}
          />
        </div>

        {/* 2. Navigation Bottom Sheet Card */}
        <div className="bg-command-panel border border-command-border p-3.5 rounded-2xl shadow-2xl space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-command-border/60">
            <div className="flex items-center space-x-2">
              <MapPin size={15} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-command-muted block text-[8px] font-sans uppercase">CURRENT LOCATION</span>
                <strong className="text-white text-xs">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</strong>
              </div>
            </div>

            <div className="text-right">
              <span className="text-command-muted block text-[8px] font-sans uppercase">GPS STATUS</span>
              <strong className={isLiveGps ? 'text-emerald-400' : 'text-amber-400'}>
                {isLiveGps ? 'LIVE' : 'DEMO'}
              </strong>
            </div>
          </div>

          {/* Telemetry Metrics Row */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-command-card/80 p-2 rounded-xl border border-command-border/60">
              <Gauge size={14} className="mx-auto mb-0.5 text-amber-400" />
              <div className="text-[8px] text-command-muted">SPEED</div>
              <div className="font-extrabold text-white text-xs">{speed} km/h</div>
            </div>
            <div className="bg-command-card/80 p-2 rounded-xl border border-command-border/60">
              <Clock size={14} className="mx-auto mb-0.5 text-command-accent" />
              <div className="text-[8px] text-command-muted">ETA</div>
              <div className="font-extrabold text-white text-xs">45 min</div>
            </div>
            <div className="bg-command-card/80 p-2 rounded-xl border border-command-border/60">
              <Navigation size={14} className="mx-auto mb-0.5 text-emerald-400" />
              <div className="text-[8px] text-command-muted">ROUTE</div>
              <div className="font-extrabold text-white text-xs">NH-27</div>
            </div>
          </div>

          {/* Next Navigation Action Instruction */}
          <div className="p-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs flex items-center justify-between font-mono">
            <div>
              <span className="text-[8px] text-command-muted uppercase font-sans block">NEXT ACTION</span>
              <strong className="text-amber-300">Continue on NH-27 Corridor</strong>
            </div>
            <Navigation size={16} className="text-amber-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
