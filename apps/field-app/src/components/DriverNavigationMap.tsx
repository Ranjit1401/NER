import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut, Compass, AlertTriangle, Map as MapIcon } from 'lucide-react';

interface DriverNavigationMapProps {
  driverLat: number;
  driverLon: number;
  isLiveGps: boolean;
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  waypoints?: [number, number][];
  speedKmh?: number;
  onLocateMe?: () => void;
  routeStatus?: 'CLEAR' | 'CAUTION' | 'BLOCKED' | 'IMPASSABLE';
  showAlternateRoute?: boolean;
  alternateWaypoints?: [number, number][];
  hazards?: Array<{ id: string; type: string; lat: number; lon: number; severity: string; description: string }>;
}

// Stored waypoints along NH-27 Corridor (Guwahati -> Shillong route)
const DEFAULT_NH27_WAYPOINTS: [number, number][] = [
  [91.7362, 26.1445], // Guwahati Central Depot
  [91.8200, 26.0500],
  [91.8900, 25.8500],
  [91.8800, 25.6800],
  [91.8933, 25.5788], // Shillong Relief Camp
];

type BasemapKey = 'voyager' | 'dark' | 'positron' | 'osm';

const BASEMAP_STYLES: Record<BasemapKey, { name: string; style: string | maplibregl.StyleSpecification }> = {
  voyager: {
    name: 'Voyager Navigation',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  dark: {
    name: 'Dark Tactical',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  positron: {
    name: 'Light Positron',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  osm: {
    name: 'OpenStreetMap Streets',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

export const DriverNavigationMap: React.FC<DriverNavigationMapProps> = ({
  driverLat,
  driverLon,
  origin,
  destination,
  waypoints = DEFAULT_NH27_WAYPOINTS,
  onLocateMe,
  routeStatus = 'CLEAR',
  showAlternateRoute = false,
  alternateWaypoints = [
    [91.7362, 26.1445],
    [92.1500, 26.2500],
    [92.2000, 25.4500],
    [91.8933, 25.5788],
  ],
  hazards = [
    {
      id: 'haz-1',
      type: 'LANDSLIDE',
      lat: 25.8500,
      lon: 91.8900,
      severity: 'HIGH',
      description: 'Landslide blocking NH-27 lane near km 42',
    },
  ],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>('voyager');
  const [mapError, setMapError] = useState<string | null>(null);

  const addRouteAndMarkers = (map: maplibregl.Map) => {
    try {
      console.log('[DriverMap] adding route layers and markers');

      // Fit map bounds to Guwahati & Shillong
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origin.lon, origin.lat]);
      bounds.extend([destination.lon, destination.lat]);
      bounds.extend([driverLon, driverLat]);

      map.fitBounds(bounds, {
        padding: 50,
        duration: 0,
      });

      // Clear existing DOM markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

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
            'line-color': routeStatus === 'BLOCKED' || routeStatus === 'IMPASSABLE' ? '#EF4444' : routeStatus === 'CAUTION' ? '#F59E0B' : '#10B981',
            'line-width': 5,
          },
        });
      }

      // Render Alternate Route if enabled
      if (showAlternateRoute && alternateWaypoints) {
        if (!map.getSource('alternate-route')) {
          map.addSource('alternate-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: alternateWaypoints,
              },
            },
          });
        }

        if (!map.getLayer('alternate-route-layer')) {
          map.addLayer({
            id: 'alternate-route-layer',
            type: 'line',
            source: 'alternate-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3B82F6',
              'line-width': 5,
              'line-dasharray': [2, 2],
            },
          });
        }
      }

      // Add Map Hazard Markers
      if (hazards && hazards.length > 0) {
        hazards.forEach((haz) => {
          const hazEl = document.createElement('div');
          hazEl.className = 'flex items-center justify-center bg-red-600 text-white rounded-full p-1.5 border-2 border-amber-300 shadow-2xl animate-pulse cursor-pointer';
          hazEl.title = `${haz.type}: ${haz.description}`;
          hazEl.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          `;
          const m = new maplibregl.Marker({ element: hazEl })
            .setLngLat([haz.lon, haz.lat])
            .addTo(map);
          markersRef.current.push(m);
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
      const origM = new maplibregl.Marker({ element: originEl })
        .setLngLat([origin.lon, origin.lat])
        .addTo(map);
      markersRef.current.push(origM);

      // Add Destination Marker (Shillong)
      const destEl = document.createElement('div');
      destEl.className = 'flex items-center justify-center bg-emerald-600 text-white rounded-full p-1.5 border-2 border-white shadow-xl';
      destEl.title = destination.name;
      destEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
        </svg>
      `;
      const destM = new maplibregl.Marker({ element: destEl })
        .setLngLat([destination.lon, destination.lat])
        .addTo(map);
      markersRef.current.push(destM);

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

      requestAnimationFrame(() => {
        map.resize();
      });
    } catch (err) {
      console.error('[DriverMap] error adding layers/markers:', err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;
    console.log('[DriverMap] container found:', container);
    console.log('[DriverMap] container size:', container.clientWidth, 'x', container.clientHeight);

    try {
      console.log('[DriverMap] initializing MapLibre with style:', currentBasemap);
      const map = new maplibregl.Map({
        container,
        style: BASEMAP_STYLES[currentBasemap].style,
        center: [driverLon, driverLat],
        zoom: 9.5,
        pitch: 25,
      });

      mapRef.current = map;

      map.on('error', (e: maplibregl.ErrorEvent) => {
        console.warn('[DriverMap] non-fatal map warning:', e.error?.message || e);
      });

      map.on('load', () => {
        console.log('[DriverMap] map "load" event fired successfully');
        setMapError(null);
        addRouteAndMarkers(map);
      });

      map.on('style.load', () => {
        console.log('[DriverMap] map "style.load" event fired');
        if (map.isStyleLoaded()) {
          addRouteAndMarkers(map);
        }
      });
    } catch (err) {
      console.error('[DriverMap] initialization exception:', err);
      setMapError('Failed to initialize map engine.');
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
      if (mapRef.current) {
        console.log('[DriverMap] cleaning up MapLibre instance');
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        if (driverMarkerRef.current) {
          driverMarkerRef.current.remove();
          driverMarkerRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update driver marker position when GPS coordinates change (WITHOUT recreating map)
  useEffect(() => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverLon, driverLat]);
    }
  }, [driverLat, driverLon]);

  const handleBasemapChange = (styleKey: BasemapKey) => {
    const map = mapRef.current;
    if (!map || styleKey === currentBasemap) return;
    setCurrentBasemap(styleKey);
    console.log('[DriverMap] switching basemap style to:', styleKey);
    map.setStyle(BASEMAP_STYLES[styleKey].style);
  };

  const handleCenterDriver = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [driverLon, driverLat], zoom: 11, pitch: 25 });
    }
    if (onLocateMe) onLocateMe();
  };

  return (
    <div className="relative w-full h-[480px] min-h-[420px] overflow-hidden rounded-2xl border border-command-border shadow-2xl bg-slate-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full min-h-[420px]" />

      {/* Map Service Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-4 space-y-3 text-center">
          <AlertTriangle size={32} className="text-amber-400 animate-bounce" />
          <div className="font-extrabold text-xs text-white uppercase tracking-wider">{mapError}</div>
        </div>
      )}

      {/* Top Floating Route Badge & Basemap Selector */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="bg-slate-950/90 backdrop-blur border border-amber-500/40 text-amber-300 text-[10px] font-mono px-2.5 py-1 rounded-lg shadow-xl flex items-center space-x-1.5">
          <Navigation size={12} className="text-command-accent shrink-0" />
          <span>NH-27 Corridor</span>
        </div>

        <div className="bg-slate-950/90 backdrop-blur border border-command-border text-white text-[10px] font-mono px-2 py-1 rounded-lg shadow-xl flex items-center space-x-1">
          <MapIcon size={12} className="text-amber-400 shrink-0" />
          <select
            value={currentBasemap}
            onChange={(e) => handleBasemapChange(e.target.value as BasemapKey)}
            className="bg-slate-900 text-white text-[10px] font-mono rounded border border-command-border px-1 py-0.5 focus:ring-0 cursor-pointer"
          >
            {Object.entries(BASEMAP_STYLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
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

