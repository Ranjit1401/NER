import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut, Compass, AlertTriangle, RefreshCw } from 'lucide-react';

interface DriverNavigationMapProps {
  driverLat: number;
  driverLon: number;
  isLiveGps: boolean;
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  waypoints?: [number, number][];
  speedKmh?: number;
  onLocateMe?: () => void;
}

// Stored waypoints along NH-27 Corridor (Guwahati -> Shillong route)
const DEFAULT_NH27_WAYPOINTS: [number, number][] = [
  [91.7362, 26.1445], // Guwahati Central Depot
  [91.8200, 26.0500],
  [91.8900, 25.8500],
  [91.8800, 25.6800],
  [91.8933, 25.5788], // Shillong Relief Camp
];

const STYLES_TO_TRY: (string | maplibregl.StyleSpecification)[] = [
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  {
    version: 8,
    sources: {
      'osm-raster': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-raster-layer',
        type: 'raster',
        source: 'osm-raster',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
];

export const DriverNavigationMap: React.FC<DriverNavigationMapProps> = ({
  driverLat,
  driverLon,
  origin,
  destination,
  waypoints = DEFAULT_NH27_WAYPOINTS,
  onLocateMe,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const styleIndexRef = useRef<number>(0);

  const initMap = () => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    setMapError(null);
    setIsMapLoaded(false);

    try {
      const currentStyle = STYLES_TO_TRY[styleIndexRef.current] || STYLES_TO_TRY[STYLES_TO_TRY.length - 1];

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: currentStyle,
        center: [driverLon, driverLat],
        zoom: 9.5,
        pitch: 25,
      });

      mapRef.current = map;

      // Event listeners for diagnostics
      map.on('error', (e) => {
        console.error('[MapLibre Error]:', e);
        if (!isMapLoaded && styleIndexRef.current < STYLES_TO_TRY.length - 1) {
          console.warn(`[MapLibre]: Style index ${styleIndexRef.current} failed, trying fallback style...`);
          styleIndexRef.current += 1;
          initMap();
        } else if (!isMapLoaded) {
          setMapError('MAP SERVICE UNAVAILABLE');
        }
      });

      map.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);

        // Fit map bounds to Guwahati & Shillong
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([origin.lon, origin.lat]);
        bounds.extend([destination.lon, destination.lat]);
        bounds.extend([driverLon, driverLat]);

        map.fitBounds(bounds, {
          padding: 50,
          duration: 0,
        });

        // Add Route Polyline
        if (!map.getSource('driver-route')) {
          map.addSource('driver-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: waypoints,
              },
            },
          });
        }

        if (!map.getLayer('driver-route-casing')) {
          map.addLayer({
            id: 'driver-route-casing',
            type: 'line',
            source: 'driver-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#0F172A',
              'line-width': 8,
              'line-opacity': 0.9,
            },
          });
        }

        if (!map.getLayer('driver-route-layer')) {
          map.addLayer({
            id: 'driver-route-layer',
            type: 'line',
            source: 'driver-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#F59E0B',
              'line-width': 5,
            },
          });
        }

        // Add Origin Marker (Guwahati)
        const originEl = document.createElement('div');
        originEl.className = 'flex items-center justify-center bg-blue-600 text-white rounded-full p-1.5 border-2 border-white shadow-xl';
        originEl.title = origin.name;
        originEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        `;
        new maplibregl.Marker({ element: originEl })
          .setLngLat([origin.lon, origin.lat])
          .addTo(map);

        // Add Destination Marker (Shillong)
        const destEl = document.createElement('div');
        destEl.className = 'flex items-center justify-center bg-emerald-600 text-white rounded-full p-1.5 border-2 border-white shadow-xl';
        destEl.title = destination.name;
        destEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
          </svg>
        `;
        new maplibregl.Marker({ element: destEl })
          .setLngLat([destination.lon, destination.lat])
          .addTo(map);

        // Add Driver Convoy Marker
        const driverEl = document.createElement('div');
        driverEl.className = 'relative flex items-center justify-center bg-slate-900 border-2 border-amber-400 text-amber-300 rounded-md p-1 shadow-2xl filter drop-shadow-xl z-30';
        driverEl.innerHTML = `
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-black"></span>
          </span>
          <svg width="32" height="18" viewBox="0 0 70 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="42" height="20" rx="2" fill="#F59E0B" stroke="#000000" stroke-width="1.8" />
            <path d="M44 7H56L64 15V22H44V7Z" fill="#D97706" stroke="#000000" stroke-width="1.8" />
            <path d="M55 9H59.5L62.5 15H55V9Z" fill="#38BDF8" stroke="#000000" stroke-width="1" />
            <circle cx="12" cy="24" r="4" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
            <circle cx="32" cy="24" r="4" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
            <circle cx="54" cy="24" r="4" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
          </svg>
        `;

        driverMarkerRef.current = new maplibregl.Marker({ element: driverEl })
          .setLngLat([driverLon, driverLat])
          .addTo(map);

        // Trigger map resize
        requestAnimationFrame(() => {
          map.resize();
        });
      });
    } catch (err) {
      console.error('[MapLibre Initialization Exception]:', err);
      setMapError('MAP SERVICE UNAVAILABLE');
    }
  };

  useEffect(() => {
    initMap();

    // ResizeObserver on container
    const container = mapContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        mapRef.current?.resize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update driver marker position when GPS coordinates change
  useEffect(() => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverLon, driverLat]);
    }
  }, [driverLat, driverLon]);

  const handleCenterDriver = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [driverLon, driverLat], zoom: 11, pitch: 25 });
    }
    if (onLocateMe) onLocateMe();
  };

  return (
    <div className="relative w-full h-[65vh] min-h-[420px] overflow-hidden rounded-2xl border border-command-border shadow-2xl bg-slate-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

      {/* Map Service Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-4 space-y-3 text-center">
          <AlertTriangle size={32} className="text-amber-400 animate-bounce" />
          <div className="font-extrabold text-xs text-white uppercase tracking-wider">{mapError}</div>
          <p className="text-[10px] text-command-muted font-mono max-w-xs">
            Unable to connect to remote vector style tiles. Tap retry to load raster fallback.
          </p>
          <button
            onClick={() => {
              styleIndexRef.current = (styleIndexRef.current + 1) % STYLES_TO_TRY.length;
              initMap();
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-lg active:scale-95"
          >
            <RefreshCw size={14} />
            <span>RETRY MAP SERVICE</span>
          </button>
        </div>
      )}

      {/* Top Floating Route Badge */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/90 backdrop-blur border border-amber-500/40 text-amber-300 text-[10px] font-mono px-2.5 py-1 rounded-lg shadow-xl flex items-center space-x-1.5">
        <Navigation size={12} className="text-command-accent shrink-0" />
        <span>DEMO ROUTE: NH-27 Corridor</span>
      </div>

      {/* Floating Map Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-1.5">
        <button
          onClick={handleCenterDriver}
          className="p-2 bg-slate-950/90 hover:bg-slate-900 border border-amber-500/50 text-amber-400 rounded-xl shadow-xl transition-all active:scale-95"
          title="Locate Me"
        >
          <Compass size={16} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 bg-slate-950/90 hover:bg-slate-900 border border-command-border text-white rounded-xl shadow-xl transition-all active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 bg-slate-950/90 hover:bg-slate-900 border border-command-border text-white rounded-xl shadow-xl transition-all active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
      </div>
    </div>
  );
};
