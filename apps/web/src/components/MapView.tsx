import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DisasterEvent, RoadSegment, LogisticsHub, DispatchOrder } from '../services/api';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Map as MapIcon, Maximize2, Minimize2 } from 'lucide-react';

interface MapViewProps {
  disasters: DisasterEvent[];
  roads: RoadSegment[];
  hubs: LogisticsHub[];
  dispatches?: DispatchOrder[];
  selectedDisasterId?: string | null;
  selectedRoad?: RoadSegment | null;
  selectedHub?: LogisticsHub | null;
  onSelectDisaster?: (disaster: DisasterEvent) => void;
  onSelectHub?: (hub: LogisticsHub) => void;
  onSelectRoad?: (road: RoadSegment) => void;
  onSelectDispatch?: (dispatch: DispatchOrder) => void;
}

type BasemapStyle = 'dark' | 'light' | 'voyager' | 'osm' | 'hot' | 'satellite';

const BASEMAP_STYLES: Record<BasemapStyle, { name: string; url: string | maplibregl.StyleSpecification }> = {
  dark: {
    name: 'Dark Tactical',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  light: {
    name: 'Light Standard',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  voyager: {
    name: 'Voyager Navigation',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  osm: {
    name: 'OpenStreetMap Streets',
    url: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
  hot: {
    name: 'OSM Humanitarian (HOT)',
    url: {
      version: 8,
      sources: {
        'hot-tiles': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, HOT',
        },
      },
      layers: [
        {
          id: 'hot-tiles-layer',
          type: 'raster',
          source: 'hot-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  satellite: {
    name: 'Satellite Imagery',
    url: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        },
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

export const MapView: React.FC<MapViewProps> = ({
  disasters,
  roads,
  hubs,
  dispatches = [],
  selectedDisasterId,
  selectedRoad,
  selectedHub,
  onSelectDisaster,
  onSelectHub,
  onSelectRoad,
  onSelectDispatch,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // State
  const [currentBasemap, setCurrentBasemap] = useState<BasemapStyle>('dark');
  const [showDisasters, setShowDisasters] = useState(true);
  const [showImpactZones, setShowImpactZones] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showHubs, setShowHubs] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [selectedFeatureInfo, setSelectedFeatureInfo] = useState<{
    title: string;
    type: string;
    details: { label: string; value: string }[];
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Compute unique rendered counts dynamically
  const uniqueRenderedDisasters = useMemo(() => {
    const seen = new Set<string>();
    return disasters.filter((d) => {
      const key = `${d.title.trim().toLowerCase()}-${d.affected_state.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [disasters]);

  const hazardsCount = uniqueRenderedDisasters.length;
  const zonesCount = uniqueRenderedDisasters.length;
  const roadsCount = roads.length;
  const hubsCount = hubs.length;
  const vehiclesCount = dispatches.length;

  // Toggle Fullscreen handler
  const toggleFullscreen = () => {
    if (!mapContainer.current) return;
    const container = mapContainer.current.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => mapRef.current?.resize(), 100);
      }).catch(() => {
        setIsFullscreen(!isFullscreen);
        setTimeout(() => mapRef.current?.resize(), 100);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.resize(), 100);
      }).catch(() => {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.resize(), 100);
      });
    }
  };

  // Re-add GeoJSON sources and layers safely with isStyleLoaded guard
  const addMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      // Impact Zones Source & Layers
      if (!map.getSource('impact-zones')) {
        map.addSource('impact-zones', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: disasters
              .filter((d) => d.impact_zone && d.impact_zone.exterior)
              .map((d) => ({
                type: 'Feature',
                properties: { id: d.id, title: d.title, severity: d.severity },
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    d.impact_zone!.exterior.map((pt) => [pt.longitude, pt.latitude]),
                  ],
                },
              })),
          },
        });
      }

      if (!map.getLayer('impact-zones-layer') && map.getSource('impact-zones')) {
        map.addLayer({
          id: 'impact-zones-layer',
          type: 'fill',
          source: 'impact-zones',
          paint: {
            'fill-color': '#EF4444',
            'fill-opacity': 0.25,
          },
        });
      }

      if (!map.getLayer('impact-zones-outline') && map.getSource('impact-zones')) {
        map.addLayer({
          id: 'impact-zones-outline',
          type: 'line',
          source: 'impact-zones',
          paint: {
            'line-color': '#EF4444',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      }

      // Road Segments Source & Layer
      if (!map.getSource('road-segments')) {
        map.addSource('road-segments', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: roads.map((r) => ({
              type: 'Feature',
              properties: {
                id: r.id,
                highway_code: r.highway_code,
                segment_name: r.segment_name,
                current_status: r.current_status,
                weight_limit_tons: r.weight_limit_tons,
                elevation_m: r.elevation_m,
              },
              geometry: {
                type: 'LineString',
                coordinates: r.geometry.points.map((pt) => [pt.longitude, pt.latitude]),
              },
            })),
          },
        });
      }

      if (!map.getLayer('road-segments-casing') && map.getSource('road-segments')) {
        map.addLayer({
          id: 'road-segments-casing',
          type: 'line',
          source: 'road-segments',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': currentBasemap === 'light' || currentBasemap === 'osm' ? '#0F172A' : '#000000',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 5,
              8, 8,
              12, 13
            ],
            'line-opacity': 0.9,
          },
        });
      }

      if (!map.getLayer('road-segments-layer') && map.getSource('road-segments')) {
        map.addLayer({
          id: 'road-segments-layer',
          type: 'line',
          source: 'road-segments',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'current_status'],
              'CLEAR', '#10B981',
              'CAUTION', '#F59E0B',
              'BLOCKED', '#EF4444',
              'IMPASSABLE', '#DC2626',
              '#3B82F6',
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 3,
              8, 5.5,
              12, 9.5
            ],
          },
        });

        map.on('click', 'road-segments-layer', (e) => {
          if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            const foundRoad = roads.find((r) => r.id === props.id);
            if (foundRoad && onSelectRoad) onSelectRoad(foundRoad);
            setSelectedFeatureInfo({
              title: `${props.highway_code}: ${props.segment_name}`,
              type: 'Road Corridor Segment',
              details: [
                { label: 'Highway Code', value: props.highway_code },
                { label: 'Current Status', value: props.current_status },
                { label: 'Weight Limit', value: props.weight_limit_tons ? `${props.weight_limit_tons} Tons` : 'N/A' },
                { label: 'Elevation', value: props.elevation_m ? `${props.elevation_m} m` : 'N/A' },
              ],
            });
          }
        });
      }

      // Update layer visibility
      if (map.getLayer('impact-zones-layer')) {
        map.setLayoutProperty('impact-zones-layer', 'visibility', showImpactZones ? 'visible' : 'none');
      }
      if (map.getLayer('impact-zones-outline')) {
        map.setLayoutProperty('impact-zones-outline', 'visibility', showImpactZones ? 'visible' : 'none');
      }
      if (map.getLayer('road-segments-casing')) {
        map.setLayoutProperty('road-segments-casing', 'visibility', showRoads ? 'visible' : 'none');
      }
      if (map.getLayer('road-segments-layer')) {
        map.setLayoutProperty('road-segments-layer', 'visibility', showRoads ? 'visible' : 'none');
      }
    } catch (err) {
      console.warn('MapLibre layer operations guarded:', err);
    }
  }, [disasters, roads, showImpactZones, showRoads, onSelectRoad]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[currentBasemap].url,
      center: [92.2, 26.1], // Centered around Assam / NER
      zoom: 6.8,
    });

    map.on('style.load', () => {
      addMapLayers();
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync layers whenever layer data or layer toggle visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      addMapLayers();
    }
  }, [addMapLayers]);

  // Handle Basemap Switch
  const handleBasemapChange = (styleKey: BasemapStyle) => {
    const map = mapRef.current;
    if (styleKey === currentBasemap || !map) return;
    setCurrentBasemap(styleKey);
    map.setStyle(BASEMAP_STYLES[styleKey].url);
    map.once('style.load', () => {
      addMapLayers();
    });
  };

  // Center on selected disaster when changed
  useEffect(() => {
    if (!selectedDisasterId || !mapRef.current) return;
    const found = disasters.find((d) => d.id === selectedDisasterId);
    if (found && found.location) {
      mapRef.current.flyTo({
        center: [found.location.longitude, found.location.latitude],
        zoom: 9,
        essential: true,
      });
    }
  }, [selectedDisasterId, disasters]);

  // Center on selected road segment when changed
  useEffect(() => {
    if (!selectedRoad || !mapRef.current) return;
    if (selectedRoad.geometry?.points?.length > 0) {
      const midPoint = selectedRoad.geometry.points[Math.floor(selectedRoad.geometry.points.length / 2)];
      mapRef.current.flyTo({
        center: [midPoint.longitude, midPoint.latitude],
        zoom: 8.5,
        essential: true,
      });
    }
  }, [selectedRoad]);

  // Center on selected hub when changed
  useEffect(() => {
    if (!selectedHub || !mapRef.current) return;
    if (selectedHub.location) {
      mapRef.current.flyTo({
        center: [selectedHub.location.longitude, selectedHub.location.latitude],
        zoom: 9.5,
        essential: true,
      });
    }
  }, [selectedHub]);

  // Render DOM Markers (Hubs, Disasters, Trucks)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing DOM markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Add Hub Markers
    if (showHubs) {
      hubs.forEach((hub) => {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border shadow-lg transition-transform hover:scale-125 z-10';
        if (hub.hub_type === 'DEPOT') {
          el.className += ' bg-blue-600/90 border-blue-400 text-white';
        } else if (hub.hub_type === 'HELIPAD') {
          el.className += ' bg-purple-600/90 border-purple-400 text-white';
        } else {
          el.className += ' bg-teal-600/90 border-teal-400 text-white';
        }
        el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;

        el.addEventListener('click', () => {
          if (onSelectHub) onSelectHub(hub);
          setSelectedFeatureInfo({
            title: hub.name,
            type: `Logistics Hub (${hub.hub_type})`,
            details: [
              { label: 'State / District', value: `${hub.state} / ${hub.district}` },
              { label: 'Status', value: hub.status },
              { label: 'Capacity', value: hub.capacity_sqm ? `${hub.capacity_sqm} sq.m` : 'N/A' },
              { label: 'Contact', value: hub.contact_person || 'N/A' },
            ],
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([hub.location.longitude, hub.location.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 2. Add Disaster Markers (High Z-Index so they are never covered by overlay UI)
    if (showDisasters) {
      disasters.forEach((d) => {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 shadow-2xl animate-bounce z-30';
        if (d.severity === 'CRITICAL') {
          el.className += ' bg-red-600 border-red-300 text-white ring-2 ring-red-500/50';
        } else if (d.severity === 'HIGH') {
          el.className += ' bg-amber-600 border-amber-300 text-white ring-2 ring-amber-500/50';
        } else {
          el.className += ' bg-yellow-600 border-yellow-200 text-white';
        }
        el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"></path></svg>`;

        el.addEventListener('click', () => {
          if (onSelectDisaster) onSelectDisaster(d);
          setSelectedFeatureInfo({
            title: d.title,
            type: `Disaster Event (${d.disaster_type})`,
            details: [
              { label: 'Severity', value: d.severity },
              { label: 'Affected State', value: d.affected_state },
              { label: 'Status', value: d.status },
              { label: 'Reported At', value: new Date(d.reported_at).toLocaleString() },
            ],
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([d.location.longitude, d.location.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 3. Add Truck / Dispatch Markers on Road Corridors
    if (showTrucks && dispatches.length > 0) {
      dispatches.forEach((dispatch, index) => {
        let targetRoad = roads.find((r) => r.highway_code === dispatch.recommended_route_id);
        if (!targetRoad && roads.length > 0) {
          targetRoad = roads[index % roads.length];
        }

        if (targetRoad && targetRoad.geometry?.points?.length > 0) {
          const points = targetRoad.geometry.points;
          // Offset position if multiple trucks share the same road segment
          const posRatio = 0.35 + (index % 3) * 0.25;
          const idxFloat = (points.length - 1) * posRatio;
          const baseIdx = Math.floor(idxFloat);
          const nextIdx = Math.min(baseIdx + 1, points.length - 1);
          const p1 = points[baseIdx];
          const p2 = points[nextIdx];

          // Precise Geographic Bearing Calculation (in degrees clockwise from North)
          const lat1 = (p1.latitude * Math.PI) / 180;
          const lat2 = (p2.latitude * Math.PI) / 180;
          const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;

          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          let bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;
          bearingDeg = (bearingDeg + 360) % 360;

          // Convert geographic bearing to CSS rotation angle (for SVG pointing rightwards by default)
          const cssRotation = bearingDeg - 90;

          // Lookup origin and destination hub names
          const originHub = hubs.find((h) => h.id === dispatch.origin_hub_id);
          const destHub = hubs.find((h) => h.id === dispatch.destination_hub_id);

          const el = document.createElement('div');
          el.className = 'flex items-center space-x-1 cursor-pointer transition-transform hover:scale-125 z-20 group';
          el.title = `Convoy ${dispatch.order_code} [IN TRANSIT] - Click for Cargo Manifest`;
          
          el.innerHTML = `
            <div class="relative flex items-center bg-slate-950/90 border-2 border-amber-400 text-amber-300 rounded-md p-1 shadow-2xl filter drop-shadow-xl" style="transform: rotate(${cssRotation}deg);">
              <!-- Animated Movement Radar Beacon -->
              <span class="absolute -top-1 -right-1 flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-black"></span>
              </span>

              <!-- Detailed 2D Logistics Truck Silhouette (Cab Facing Right/East) -->
              <div class="flex items-center">
                <svg width="42" height="22" viewBox="0 0 70 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
                  <!-- Heavy Duty Chassis Frame -->
                  <rect x="4" y="22" width="58" height="3" fill="#334155" />
                  
                  <!-- Main Cargo Container Box -->
                  <rect x="2" y="2" width="42" height="20" rx="2" fill="#F59E0B" stroke="#000000" stroke-width="1.8" />
                  <line x1="8" y1="2" x2="8" y2="22" stroke="#78350F" stroke-width="1.2" />
                  <line x1="23" y1="2" x2="23" y2="22" stroke="#78350F" stroke-width="1.2" />
                  <line x1="37" y1="2" x2="37" y2="22" stroke="#78350F" stroke-width="1.2" />
                  <text x="10" y="15" fill="#000000" font-size="8" font-weight="900" font-family="monospace" letter-spacing="0.5">LOGISTICS</text>
                  
                  <!-- Truck Cab Unit (Facing Front/Right) -->
                  <path d="M44 7H56L64 15V22H44V7Z" fill="#D97706" stroke="#000000" stroke-width="1.8" />
                  <!-- Windshield Glass -->
                  <path d="M55 9H59.5L62.5 15H55V9Z" fill="#38BDF8" stroke="#000000" stroke-width="1" />
                  <!-- Headlight Glow -->
                  <path d="M64 18L68 18" stroke="#FEF08A" stroke-width="3" stroke-linecap="round" />
                  
                  <!-- Wheels & Hubcaps -->
                  <circle cx="12" cy="24" r="4.5" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
                  <circle cx="12" cy="24" r="1.8" fill="#CBD5E1" />
                  <circle cx="32" cy="24" r="4.5" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
                  <circle cx="32" cy="24" r="1.8" fill="#CBD5E1" />
                  <circle cx="54" cy="24" r="4.5" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" />
                  <circle cx="54" cy="24" r="1.8" fill="#CBD5E1" />
                </svg>
              </div>
            </div>

            <!-- Hover Telemetry Tag -->
            <div class="bg-slate-900/95 border border-amber-500/60 text-[9px] font-mono px-1.5 py-0.5 rounded text-amber-300 font-extrabold shadow-2xl hidden group-hover:block shrink-0">
              ${dispatch.order_code} [TRK-NE-042] • 45 km/h • GPS LIVE (12s ago)
            </div>
          `;

          const itemsText = dispatch.allocated_items
            ? Object.entries(dispatch.allocated_items)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
            : 'General Emergency Relief Rations';

          el.addEventListener('click', () => {
            if (onSelectDispatch) onSelectDispatch(dispatch);
            setSelectedFeatureInfo({
              title: `Truck Convoy: ${dispatch.order_code}`,
              type: 'Active Dispatch Vehicle [DEMO VEHICLE IN TRANSIT]',
              details: [
                { label: 'Assigned Route', value: `${targetRoad?.highway_code}: ${targetRoad?.segment_name}` },
                { label: 'Origin Hub', value: originHub?.name || 'Guwahati Central Depot' },
                { label: 'Destination Hub', value: destHub?.name || 'Shillong Relief Camp' },
                { label: 'Dispatch Status', value: dispatch.status },
                { label: 'Allocated Cargo', value: itemsText },
                { label: 'Telemetry', value: 'Corridor PostGIS Tracking' },
              ],
            });
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([p1.longitude, p1.latitude])
            .addTo(map);
          markersRef.current.push(marker);
        }
      });
    }
  }, [disasters, roads, hubs, dispatches, showDisasters, showHubs, showTrucks, onSelectDisaster, onSelectHub, onSelectDispatch]);

  return (
    <div className="relative w-full h-full min-h-[450px] bg-command-panel rounded-lg overflow-hidden border border-command-border">
      {/* Map Canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left Basemap Selector */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-command-panel/90 backdrop-blur border border-command-border px-2 py-1.5 rounded shadow-2xl text-xs">
        <MapIcon size={14} className="text-command-accent shrink-0" />
        <select
          value={currentBasemap}
          onChange={(e) => handleBasemapChange(e.target.value as BasemapStyle)}
          className="bg-command-card border border-command-border text-command-text text-[11px] rounded px-1.5 py-0.5 focus:ring-0 cursor-pointer font-medium"
        >
          {Object.entries(BASEMAP_STYLES).map(([key, style]) => (
            <option key={key} value={key}>
              {style.name}
            </option>
          ))}
        </select>
      </div>

      {/* Top Right GIS Layer Control Bar */}
      <div className="absolute top-3 right-14 z-10 flex items-center space-x-3 bg-command-panel/90 backdrop-blur border border-command-border px-3 py-1.5 rounded shadow-2xl text-[11px] font-medium text-command-text whitespace-nowrap">
        <label className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showDisasters}
            onChange={(e) => setShowDisasters(e.target.checked)}
            className="rounded bg-command-card border-command-border text-command-accent focus:ring-0"
          />
          <span>Hazards ({hazardsCount})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showImpactZones}
            onChange={(e) => setShowImpactZones(e.target.checked)}
            className="rounded bg-command-card border-command-border text-command-accent focus:ring-0"
          />
          <span>Zones ({zonesCount})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showRoads}
            onChange={(e) => setShowRoads(e.target.checked)}
            className="rounded bg-command-card border-command-border text-command-accent focus:ring-0"
          />
          <span>Roads ({roadsCount})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showHubs}
            onChange={(e) => setShowHubs(e.target.checked)}
            className="rounded bg-command-card border-command-border text-command-accent focus:ring-0"
          />
          <span>Hubs ({hubsCount})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showTrucks}
            onChange={(e) => setShowTrucks(e.target.checked)}
            className="rounded bg-command-card border-command-border text-command-accent focus:ring-0"
          />
          <span>Vehicles ({vehiclesCount})</span>
        </label>
      </div>

      {/* Map Zoom & Fullscreen Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-1">
        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-command-panel/90 hover:bg-command-card border border-command-border text-command-accent rounded shadow hover:text-white transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-1.5 bg-command-panel/90 hover:bg-command-card border border-command-border text-command-text rounded shadow hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-1.5 bg-command-panel/90 hover:bg-command-card border border-command-border text-command-text rounded shadow hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => mapRef.current?.flyTo({ center: [91.8, 25.8], zoom: 6.2 })}
          className="p-1.5 bg-command-panel/90 hover:bg-command-card border border-command-border text-command-text rounded shadow hover:text-white transition-colors"
          title="Reset Regional Overview (NER)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Compact Tactical Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-command-panel/90 backdrop-blur border border-command-border p-2 rounded shadow-2xl text-[10px] space-y-1 max-w-xs">
        <div className="font-bold uppercase tracking-wider text-command-muted flex items-center space-x-1">
          <Layers size={11} className="text-command-accent" />
          <span>Tactical Legend</span>
        </div>
        <div className="flex items-center space-x-3 text-command-text">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Blocked</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Caution</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Clear</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded bg-amber-400"></span>
            <span>Convoy</span>
          </span>
        </div>
      </div>

      {/* Selected Feature Info Card */}
      {selectedFeatureInfo && (
        <div className="absolute bottom-3 right-3 z-20 bg-command-panel border border-command-border p-3 rounded-lg shadow-2xl max-w-sm w-full animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-command-border mb-2">
            <div>
              <div className="text-[10px] font-bold text-command-accent">{selectedFeatureInfo.type}</div>
              <div className="text-xs font-bold text-command-text">{selectedFeatureInfo.title}</div>
            </div>
            <button
              onClick={() => setSelectedFeatureInfo(null)}
              className="text-command-muted hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-command-card"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            {selectedFeatureInfo.details.map((d, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-command-muted">{d.label}:</span>
                <span className="font-medium text-command-text text-right truncate pl-2">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
