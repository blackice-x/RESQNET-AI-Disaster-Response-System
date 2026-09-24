import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  EmergencyReport,
  RescueTeam,
  LandmarkFacility,
  PriorityLevel,
} from '../types';
import { rankNearestRescueTeams } from '../utils/triage';
import { PERIYAR_WATER_GAUGES, RiverWaterGauge } from '../data/mockData';
import { DisasterDistrict } from './DistrictPlaceModal';
import {
  WeatherFrame,
  INDIAN_CONVECTIVE_STORM_CELLS,
  DISTRICT_WEATHER_TELEMETRY,
  fetchRainViewerRadarFrames,
  getOpenWeatherMapTileUrl,
  SectorWeatherTelemetry,
} from '../utils/weatherData';
import {
  Layers,
  Filter,
  Flame,
  AlertTriangle,
  Hospital,
  Shield,
  LifeBuoy,
  X,
  Maximize2,
  ExternalLink,
  Droplets,
  Radio,
  MapPin,
  CloudRain,
  Play,
  Pause,
  Sliders,
  Settings,
  Wind,
  Cloud,
  Zap,
  Check,
  Compass,
  Activity,
  ChevronDown,
} from 'lucide-react';

interface LiveDisasterMapProps {
  incidents: EmergencyReport[];
  rescueTeams: RescueTeam[];
  landmarks: LandmarkFacility[];
  selectedIncident: EmergencyReport | null;
  onSelectIncident: (incident: EmergencyReport | null) => void;
  selectedTeam: RescueTeam | null;
  onSelectTeam: (team: RescueTeam | null) => void;
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  selectedDistrict?: DisasterDistrict;
}

type MapTileStyle = 'GOOGLE_HYBRID' | 'GOOGLE_STREETS' | 'CARTO_DARK' | 'OSM';
type WeatherOverlayType = 'PRECIPITATION' | 'STORM_CELLS' | 'WIND' | 'CLOUDS';

export const LiveDisasterMap: React.FC<LiveDisasterMapProps> = ({
  incidents,
  rescueTeams,
  landmarks,
  selectedIncident,
  onSelectIncident,
  selectedTeam,
  onSelectTeam,
  showHeatmap,
  setShowHeatmap,
  selectedDistrict,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const weatherTileLayerRef = useRef<L.TileLayer | null>(null);
  const stormCellsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const waterGaugesLayerRef = useRef<L.LayerGroup | null>(null);

  const [tileStyle, setTileStyle] = useState<MapTileStyle>('GOOGLE_HYBRID');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH_MEDIUM' | 'TEAMS_ONLY'>('ALL');
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showWaterGauges, setShowWaterGauges] = useState<boolean>(true);

  // Real-Time Weather Layer State
  const [showWeatherLayer, setShowWeatherLayer] = useState<boolean>(true);
  const [weatherLayerType, setWeatherLayerType] = useState<WeatherOverlayType>('PRECIPITATION');
  const [weatherOpacity, setWeatherOpacity] = useState<number>(0.75);
  const [radarPlaying, setRadarPlaying] = useState<boolean>(true);
  const [radarFrames, setRadarFrames] = useState<WeatherFrame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [showWeatherControls, setShowWeatherControls] = useState<boolean>(true);
  const [showWeatherSettingsModal, setShowWeatherSettingsModal] = useState<boolean>(false);
  const [customOwmKey, setCustomOwmKey] = useState<string>(() => {
    return (
      (import.meta.env.VITE_OPENWEATHER_API_KEY as string) ||
      localStorage.getItem('RESQNET_OWM_KEY') ||
      ''
    );
  });
  const [isSimulatedCloudburst, setIsSimulatedCloudburst] = useState<boolean>(false);

  // Current sector weather telemetry
  const activeDistrictId = selectedDistrict?.id || 'aluva-ernakulam';
  const baseTelemetry: SectorWeatherTelemetry =
    DISTRICT_WEATHER_TELEMETRY[activeDistrictId] || DISTRICT_WEATHER_TELEMETRY['aluva-ernakulam'];

  const currentTelemetry: SectorWeatherTelemetry = isSimulatedCloudburst
    ? {
        ...baseTelemetry,
        rainRateMmHr: 48.5,
        humidityPct: 98,
        imdWarningColor: 'RED',
        radarEchoStatus: 'SEVERE CLOUDBURST (62 dBZ)',
        stormDescription: 'Extreme Monsoon Cloudburst & Flash Flood Surge. All emergency teams placed on maximum alert.',
      }
    : baseTelemetry;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center around Aluva / Periyar River Basin or selected district
    const initialLat = selectedDistrict?.coordinates.lat || 10.1115;
    const initialLng = selectedDistrict?.coordinates.lng || 76.358;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer: Google Maps Hybrid (satellite + road labels)
    const initialTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Satellite & Labels | RESQNET India Early Warning',
    }).addTo(map);

    tileLayerRef.current = initialTile;

    const markersLayer = L.layerGroup().addTo(map);
    const heatmapLayer = L.layerGroup().addTo(map);
    const waterGaugesLayer = L.layerGroup().addTo(map);
    const stormCellsLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    heatmapLayerRef.current = heatmapLayer;
    waterGaugesLayerRef.current = waterGaugesLayer;
    stormCellsLayerRef.current = stormCellsLayer;
    mapInstanceRef.current = map;

    // Resize observer to handle container changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Doppler Radar Frames
  useEffect(() => {
    let isMounted = true;
    fetchRainViewerRadarFrames().then((frames) => {
      if (isMounted && frames.length > 0) {
        setRadarFrames(frames);
        setActiveFrameIndex(frames.length - 1); // Latest frame
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Radar Timeline Animation Loop
  useEffect(() => {
    if (!radarPlaying || radarFrames.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [radarPlaying, radarFrames.length]);

  // Smooth Fly-To when Selected Sector/District changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedDistrict) return;

    const currentCenter = map.getCenter();
    const targetLat = selectedDistrict.coordinates.lat;
    const targetLng = selectedDistrict.coordinates.lng;

    // Only fly if coordinates significantly differ
    const dist = Math.sqrt(
      Math.pow(currentCenter.lat - targetLat, 2) + Math.pow(currentCenter.lng - targetLng, 2)
    );
    if (dist > 0.005) {
      map.flyTo([targetLat, targetLng], 13, { duration: 1.2 });
    }
  }, [selectedDistrict]);

  // Handle Base Tile Style Switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Maps Satellite & Labels';

    if (tileStyle === 'GOOGLE_STREETS') {
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps Vector';
    } else if (tileStyle === 'CARTO_DARK') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap & CARTO Dark';
    } else if (tileStyle === 'OSM') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    }

    const newTile = L.tileLayer(url, {
      maxZoom: 20,
      attribution,
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [tileStyle]);

  // Handle Real-Time Weather Tile Layer (OpenWeatherMap + RainViewer Doppler)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current = null;
    }

    if (!showWeatherLayer) return;

    let tileUrl = '';
    let attribution = '&copy; RainViewer Doppler Radar | IMD Network';

    // If OpenWeatherMap API Key is configured
    if (customOwmKey.trim()) {
      if (weatherLayerType === 'PRECIPITATION') {
        tileUrl = getOpenWeatherMapTileUrl('precipitation_new', customOwmKey.trim());
        attribution = '&copy; OpenWeatherMap Precipitation Radar';
      } else if (weatherLayerType === 'WIND') {
        tileUrl = getOpenWeatherMapTileUrl('wind_new', customOwmKey.trim());
        attribution = '&copy; OpenWeatherMap Wind Vectors';
      } else if (weatherLayerType === 'CLOUDS') {
        tileUrl = getOpenWeatherMapTileUrl('clouds_new', customOwmKey.trim());
        attribution = '&copy; OpenWeatherMap Cloud Satellite';
      }
    }

    // Default or Fallback: Live Doppler Radar Tiles from RainViewer (Global & India coverage)
    if (!tileUrl && radarFrames.length > 0) {
      const currentFrame = radarFrames[activeFrameIndex] || radarFrames[radarFrames.length - 1];
      if (currentFrame?.path) {
        tileUrl = `https://tilecache.rainviewer.com/v2/radar/${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        attribution = '&copy; RainViewer Doppler Radar (India & Kerala)';
      }
    }

    if (tileUrl) {
      const weatherTile = L.tileLayer(tileUrl, {
        opacity: weatherOpacity,
        zIndex: 400,
        attribution,
      }).addTo(map);

      weatherTileLayerRef.current = weatherTile;
    }
  }, [
    showWeatherLayer,
    weatherLayerType,
    weatherOpacity,
    activeFrameIndex,
    radarFrames,
    customOwmKey,
  ]);

  // Handle Convective Storm Cells Layer (Storm Intensity, dBZ Reflectivity, Lightning)
  useEffect(() => {
    const stormCellsGroup = stormCellsLayerRef.current;
    if (!stormCellsGroup) return;

    stormCellsGroup.clearLayers();
    if (!showWeatherLayer) return;

    INDIAN_CONVECTIVE_STORM_CELLS.forEach((cell) => {
      const isExtreme = cell.severity === 'TORRENTIAL_EXTREME';

      // 1. Radar Reflectivity Circle
      const radarCircle = L.circle(cell.center, {
        radius: cell.radiusMeters,
        color: isExtreme ? '#dc2626' : '#ea580c',
        fillColor: isExtreme ? '#ef4444' : '#f97316',
        fillOpacity: isExtreme ? 0.35 : 0.25,
        weight: 2,
        dashArray: isExtreme ? '4, 4' : undefined,
      });

      radarCircle.bindPopup(`
        <div class="p-1 font-sans text-slate-900 max-w-[240px]">
          <div class="flex items-center justify-between pb-1 border-b border-slate-200">
            <span class="font-extrabold text-xs text-red-800">⚡ ${cell.name}</span>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded ${
              isExtreme ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }">${cell.reflectivityDbz} dBZ</span>
          </div>
          <div class="text-[11px] text-slate-700 mt-1 font-medium">
            Precipitation: <strong class="text-red-600">${cell.rainRateMmHr} mm/hr</strong>
          </div>
          <div class="text-[10px] text-slate-600 mt-0.5">
            Surface Wind: <strong>${cell.windSpeedKmh} km/h (${cell.windDirectionDeg}°)</strong>
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">
            Trajectory: <strong>${cell.movementHeading}</strong>
          </div>
          ${
            cell.lightningDetected
              ? `<div class="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚡ Active In-Cloud Lightning Detected</span>
                </div>`
              : ''
          }
        </div>
      `);

      stormCellsGroup.addLayer(radarCircle);

      // 2. Storm Center Marker
      const stormIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform hover:scale-125 transition-transform">
          <div class="absolute -inset-2 rounded-full ${
            isExtreme ? 'bg-red-600/40 animate-ping' : 'bg-orange-500/30 animate-pulse'
          } pointer-events-none"></div>
          <div class="w-8 h-8 rounded-full ${
            isExtreme ? 'bg-red-700' : 'bg-orange-600'
          } border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
            ${cell.lightningDetected ? '⚡' : '🌧️'}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-600/50 shadow font-mono pointer-events-none">
            ${cell.reflectivityDbz} dBZ &bull; ${cell.rainRateMmHr}mm/h
          </div>
        </div>
      `;

      const stormIcon = L.divIcon({
        className: 'storm-cell-marker',
        html: stormIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(cell.center, { icon: stormIcon });
      marker.bindPopup(radarCircle.getPopup()!);
      stormCellsGroup.addLayer(marker);
    });
  }, [showWeatherLayer]);

  // Update Markers (Incidents, Teams, Landmarks)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Render Incidents (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
    incidents.forEach((inc) => {
      if (activeFilter === 'CRITICAL' && inc.priority !== 'CRITICAL') return;
      if (activeFilter === 'HIGH_MEDIUM' && inc.priority !== 'HIGH' && inc.priority !== 'MEDIUM') return;
      if (activeFilter === 'TEAMS_ONLY') return;

      const isSelected = selectedIncident?.id === inc.id;

      let bgClass = 'bg-emerald-600';
      let borderClass = 'border-white';
      let pulseRing = '';
      let priorityEmoji = '🟢';

      if (inc.priority === 'CRITICAL') {
        bgClass = 'bg-red-600';
        borderClass = isSelected ? 'border-amber-300 ring-4 ring-red-400/50' : 'border-white';
        pulseRing = '<div class="absolute -inset-2 rounded-full bg-red-500/40 animate-ping pointer-events-none"></div>';
        priorityEmoji = '🔴';
      } else if (inc.priority === 'HIGH') {
        bgClass = 'bg-orange-500';
        borderClass = isSelected ? 'border-amber-300 ring-4 ring-orange-400/50' : 'border-white';
        pulseRing = '<div class="absolute -inset-1.5 rounded-full bg-orange-400/30 animate-pulse pointer-events-none"></div>';
        priorityEmoji = '🟠';
      } else if (inc.priority === 'MEDIUM') {
        bgClass = 'bg-amber-500';
        borderClass = isSelected ? 'border-slate-900 ring-4 ring-amber-300/50' : 'border-white';
        priorityEmoji = '🟡';
      }

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-125">
          ${pulseRing}
          <div class="w-8 h-8 rounded-full ${bgClass} ${borderClass} border-2 shadow-lg flex items-center justify-center text-white text-xs font-bold font-tactical">
            ${inc.peopleCount > 1 ? inc.peopleCount : '!'}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow border border-slate-700 font-tactical font-semibold pointer-events-none">
            ${inc.incidentCode}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([inc.coordinates.lat, inc.coordinates.lng], { icon: customIcon });

      const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${inc.coordinates.lat},${inc.coordinates.lng}`;

      const popupContent = `
        <div class="p-1 text-slate-900 font-sans max-w-[240px]">
          <div class="flex items-center justify-between font-bold text-xs pb-1 border-b border-slate-200">
            <span>${priorityEmoji} ${inc.incidentCode}</span>
            <span class="px-1.5 py-0.2 text-[10px] rounded font-extrabold ${
              inc.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
            }">${inc.priority}</span>
          </div>
          <div class="text-xs font-semibold text-slate-800 mt-1.5">${inc.title}</div>
          <div class="text-[11px] text-slate-600 mt-1">
            👥 <strong>${inc.peopleCount} people</strong> &bull; ❤️ <strong>${inc.injuredCount} injured</strong>
          </div>
          <div class="text-[10px] text-slate-500 mt-1 italic line-clamp-2">
            "${inc.description}"
          </div>
          <div class="mt-2 flex items-center justify-between gap-1">
            <a href="${googleMapsNavUrl}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 border border-blue-200">
              <span>Google Maps ↗</span>
            </a>
            ${
              inc.assignedTeamName
                ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">🚑 Dispatched</span>`
                : `<span class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Pending Triage</span>`
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onSelectIncident(inc);
      });

      markersGroup.addLayer(marker);
    });

    // 2. Render Rescue Teams (🔵 Rescue Team)
    rescueTeams.forEach((team) => {
      const isSelected = selectedTeam?.id === team.id;
      const isDispatched = team.status === 'DISPATCHED';

      const teamIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-125">
          <div class="absolute -inset-2 rounded-full ${isDispatched ? 'bg-indigo-500/40 animate-ping' : 'bg-blue-500/20'}"></div>
          <div class="w-9 h-9 rounded-xl bg-blue-600 border-2 ${isSelected ? 'border-amber-300 ring-4 ring-blue-400' : 'border-white'} shadow-xl flex items-center justify-center text-white text-xs font-black">
            ${team.type === 'BOAT_RESCUE' ? '🚤' : team.type === 'AMBULANCE_MEDICAL' ? '🚑' : team.type === 'AIRLIFT_DRONE' ? '🚁' : '🔵'}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-950 text-blue-200 text-[10px] px-1.5 py-0.5 rounded shadow border border-blue-800 font-tactical font-extrabold pointer-events-none">
            ${team.callsign}
          </div>
        </div>
      `;

      const customTeamIcon = L.divIcon({
        className: 'custom-team-marker',
        html: teamIconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([team.currentLocation.lat, team.currentLocation.lng], { icon: customTeamIcon });
      const googleMapsTeamNav = `https://www.google.com/maps/dir/?api=1&destination=${team.currentLocation.lat},${team.currentLocation.lng}`;

      marker.bindPopup(`
        <div class="p-1 text-slate-900 font-sans max-w-[220px]">
          <div class="font-extrabold text-xs text-blue-800 flex items-center justify-between pb-1 border-b border-blue-200">
            <span>🔵 ${team.name}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded ${
              team.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }">${team.status}</span>
          </div>
          <div class="text-[11px] text-slate-700 mt-1">
            Callsign: <strong>${team.callsign}</strong> (${team.personnelCount} members)
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">${team.vehicle}</div>
          <div class="text-[10px] text-blue-600 mt-1 font-semibold">📞 ${team.phone}</div>
          <div class="mt-2 pt-1 border-t border-slate-100">
            <a href="${googleMapsTeamNav}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-bold text-blue-600 hover:underline">
              Navigate to Team in Google Maps &rarr;
            </a>
          </div>
        </div>
      `);

      marker.on('click', () => {
        onSelectTeam(team);
      });

      markersGroup.addLayer(marker);
    });

    // 3. Render Landmark Facilities
    if (showLandmarks) {
      landmarks.forEach((fac) => {
        let badgeBg = 'bg-slate-700';
        let badgeText = '⚫';

        if (fac.type === 'HOSPITAL') {
          badgeBg = 'bg-rose-600';
          badgeText = '🏥';
        } else if (fac.type === 'SHELTER') {
          badgeBg = 'bg-emerald-600';
          badgeText = '🏠';
        } else if (fac.type === 'SAFE_ZONE') {
          badgeBg = 'bg-teal-600';
          badgeText = '🟢';
        } else if (fac.type === 'ROAD_BLOCK') {
          badgeBg = 'bg-stone-900';
          badgeText = '⚫';
        }

        const facIconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-110">
            <div class="w-7 h-7 rounded-lg ${badgeBg} border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
              ${badgeText}
            </div>
            <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-slate-200 text-[9px] px-1 py-0.2 rounded border border-slate-700 pointer-events-none">
              ${fac.name.length > 18 ? fac.name.slice(0, 16) + '…' : fac.name}
            </div>
          </div>
        `;

        const facIcon = L.divIcon({
          className: 'custom-fac-marker',
          html: facIconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([fac.coordinates.lat, fac.coordinates.lng], { icon: facIcon });
        marker.bindPopup(`
          <div class="p-1 text-slate-900 font-sans max-w-[200px]">
            <div class="font-bold text-xs text-slate-900 border-b border-slate-200 pb-1">${fac.name}</div>
            <div class="text-[11px] font-semibold text-slate-700 mt-1">${fac.status}</div>
            ${fac.capacity ? `<div class="text-[10px] text-emerald-700 mt-0.5">${fac.capacity}</div>` : ''}
            ${fac.details ? `<div class="text-[10px] text-slate-500 mt-0.5 italic">${fac.details}</div>` : ''}
          </div>
        `);

        markersGroup.addLayer(marker);
      });
    }
  }, [incidents, rescueTeams, landmarks, selectedIncident, selectedTeam, activeFilter, showLandmarks]);

  // Render CWC River Water Gauge Stations
  useEffect(() => {
    const map = mapInstanceRef.current;
    const gaugeGroup = waterGaugesLayerRef.current;
    if (!map || !gaugeGroup) return;

    gaugeGroup.clearLayers();
    if (!showWaterGauges) return;

    PERIYAR_WATER_GAUGES.forEach((gauge: RiverWaterGauge) => {
      const isDanger = gauge.status === 'DANGER';
      const isWarning = gauge.status === 'WARNING';

      const gaugeHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform hover:scale-125 transition-transform">
          <div class="w-8 h-8 rounded-full ${
            isDanger ? 'bg-red-600 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-sky-600'
          } border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
            🌊
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-sky-200 text-[10px] font-tactical font-bold px-1.5 py-0.5 rounded border border-slate-700">
            ${gauge.currentWaterLevelM.toFixed(1)}m
          </div>
        </div>
      `;

      const gaugeIcon = L.divIcon({
        className: 'cwc-water-gauge-marker',
        html: gaugeHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([gauge.lat, gauge.lng], { icon: gaugeIcon });
      marker.bindPopup(`
        <div class="p-1 font-sans text-slate-900 max-w-[230px]">
          <div class="flex items-center justify-between pb-1 border-b border-slate-200">
            <span class="font-extrabold text-xs text-sky-900">🌊 CWC: ${gauge.name}</span>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded ${
              isDanger ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }">${gauge.status}</span>
          </div>
          <div class="text-[11px] text-slate-700 mt-1 font-medium">
            Basin: <strong>${gauge.riverBasin}</strong>
          </div>
          <div class="grid grid-cols-2 gap-1 mt-1.5 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 font-mono">
            <div>Current: <strong>${gauge.currentWaterLevelM}m</strong></div>
            <div>Danger: <strong class="text-red-600">${gauge.dangerLevelM}m</strong></div>
            <div>Warning: <strong>${gauge.warningLevelM}m</strong></div>
            <div>Discharge: <strong>${gauge.dischargeCusecs} cusecs</strong></div>
          </div>
          <div class="text-[10px] text-slate-400 mt-1">Updated: ${gauge.lastUpdated}</div>
        </div>
      `);

      gaugeGroup.addLayer(marker);
    });
  }, [showWaterGauges]);

  // Route Polyline when an incident is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (!selectedIncident) return;

    let targetTeam: RescueTeam | undefined;
    if (selectedIncident.assignedTeamId) {
      targetTeam = rescueTeams.find((t) => t.id === selectedIncident.assignedTeamId);
    } else {
      const ranked = rankNearestRescueTeams(selectedIncident, rescueTeams);
      if (ranked.length > 0) {
        targetTeam = ranked[0].team;
      }
    }

    if (targetTeam) {
      const latlngs: [number, number][] = [
        [targetTeam.currentLocation.lat, targetTeam.currentLocation.lng],
        [selectedIncident.coordinates.lat, selectedIncident.coordinates.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: selectedIncident.assignedTeamId ? '#2563eb' : '#f59e0b',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9,
      }).addTo(map);

      polyline.bindTooltip(
        selectedIncident.assignedTeamId
          ? `Dispatched Route: ${targetTeam.callsign} &rarr; ${selectedIncident.incidentCode} (ETA: ${selectedIncident.dispatchEtaMinutes}m)`
          : `Recommended Route: ${targetTeam.callsign} &rarr; ${selectedIncident.incidentCode}`,
        { permanent: true, direction: 'center', className: 'route-label-tooltip' }
      );

      routePolylineRef.current = polyline;

      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [selectedIncident, rescueTeams]);

  // Heatmap Overlay
  useEffect(() => {
    const heatmapGroup = heatmapLayerRef.current;
    if (!heatmapGroup) return;

    heatmapGroup.clearLayers();
    if (!showHeatmap) return;

    incidents.forEach((inc) => {
      let radius = 250;
      let color = '#10b981';
      let opacity = 0.2;

      if (inc.priority === 'CRITICAL') {
        radius = 500;
        color = '#ef4444';
        opacity = 0.35;
      } else if (inc.priority === 'HIGH') {
        radius = 400;
        color = '#f97316';
        opacity = 0.3;
      } else if (inc.priority === 'MEDIUM') {
        radius = 300;
        color = '#f59e0b';
        opacity = 0.25;
      }

      const circle = L.circle([inc.coordinates.lat, inc.coordinates.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: opacity,
        stroke: false,
      });

      heatmapGroup.addLayer(circle);
    });
  }, [incidents, showHeatmap]);

  const handleJumpToSector = (lat: number, lng: number, zoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  const handleSaveOwmKey = (key: string) => {
    setCustomOwmKey(key);
    localStorage.setItem('RESQNET_OWM_KEY', key);
    setShowWeatherSettingsModal(false);
  };

  return (
    <div className="relative w-full h-full min-h-[520px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 max-w-[95%]">
        {/* Base Map Switcher */}
        <div className="flex items-center glass-panel p-1 rounded-xl shadow-xl text-xs">
          <Layers className="w-3.5 h-3.5 text-sky-400 mx-1.5" />
          <button
            id="map-style-google-hybrid"
            onClick={() => setTileStyle('GOOGLE_HYBRID')}
            className={`px-2 py-1 rounded-lg font-bold transition-all ${
              tileStyle === 'GOOGLE_HYBRID'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Google Satellite imagery with road networks and place names"
          >
            Google Satellite
          </button>
          <button
            id="map-style-google-streets"
            onClick={() => setTileStyle('GOOGLE_STREETS')}
            className={`px-2 py-1 rounded-lg font-bold transition-all ${
              tileStyle === 'GOOGLE_STREETS'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            Streets
          </button>
          <button
            id="map-style-dark"
            onClick={() => setTileStyle('CARTO_DARK')}
            className={`px-2 py-1 rounded-lg font-bold transition-all ${
              tileStyle === 'CARTO_DARK'
                ? 'bg-slate-800 text-amber-400 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            Dark Ops
          </button>
        </div>

        {/* Real-Time Weather Radar Master Toggle */}
        <button
          id="map-toggle-weather-radar"
          onClick={() => setShowWeatherLayer(!showWeatherLayer)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-tactical font-bold border backdrop-blur-md shadow-lg transition-all ${
            showWeatherLayer
              ? 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-600/30'
              : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle OpenWeatherMap & Live Doppler Precipitation Radar Overlays"
        >
          <CloudRain className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>Weather Radar</span>
          <span className={`w-2 h-2 rounded-full ${showWeatherLayer ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
        </button>

        {/* Weather Layer Mode Selector (When Weather is Active) */}
        {showWeatherLayer && (
          <div className="hidden md:flex items-center glass-panel p-1 rounded-xl shadow-lg text-xs font-tactical">
            <button
              onClick={() => setWeatherLayerType('PRECIPITATION')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                weatherLayerType === 'PRECIPITATION'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌧️ Rain Radar
            </button>
            <button
              onClick={() => setWeatherLayerType('STORM_CELLS')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                weatherLayerType === 'STORM_CELLS'
                  ? 'bg-red-950 text-red-300 border border-red-500/60 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Convective Storm Cells
            </button>
            <button
              onClick={() => setWeatherLayerType('WIND')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                weatherLayerType === 'WIND'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💨 Wind Vectors
            </button>
            <button
              onClick={() => setWeatherLayerType('CLOUDS')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                weatherLayerType === 'CLOUDS'
                  ? 'bg-blue-950 text-blue-300 border border-blue-500/60 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ☁️ Cloud Cover
            </button>
          </div>
        )}

        {/* Layer Filter Pills */}
        <div className="flex items-center glass-panel px-2 py-1 rounded-xl text-xs font-semibold text-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <div className="flex space-x-1 font-tactical">
            <button
              id="map-filter-all"
              onClick={() => setActiveFilter('ALL')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeFilter === 'ALL' ? 'bg-red-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              All ({incidents.length})
            </button>
            <button
              id="map-filter-critical"
              onClick={() => setActiveFilter('CRITICAL')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${
                activeFilter === 'CRITICAL' ? 'bg-red-600 text-white font-bold' : 'hover:bg-slate-800 text-red-400'
              }`}
            >
              <span>🔴 Critical</span>
            </button>
            <button
              id="map-filter-teams"
              onClick={() => setActiveFilter('TEAMS_ONLY')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${
                activeFilter === 'TEAMS_ONLY' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-blue-400'
              }`}
            >
              <span>🔵 Teams</span>
            </button>
          </div>
        </div>

        {/* CWC Water Gauges Toggle */}
        <button
          id="map-toggle-cwc-water"
          onClick={() => setShowWaterGauges(!showWaterGauges)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md shadow-lg transition-all ${
            showWaterGauges
              ? 'bg-sky-700 text-white border-sky-400 font-bold'
              : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle CWC River Water Gauge Station Telemetry"
        >
          <Droplets className="w-3.5 h-3.5 text-sky-300" />
          <span>River Telemetry ({PERIYAR_WATER_GAUGES.length})</span>
        </button>

        {/* Heatmap Toggle */}
        <button
          id="map-toggle-heatmap"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md shadow-lg transition-all ${
            showHeatmap
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'glass-panel text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Disaster Heatmap</span>
        </button>

        {/* Weather Layer API Configuration Pill */}
        <button
          onClick={() => setShowWeatherSettingsModal(true)}
          className="glass-panel p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          title="OpenWeatherMap & Doppler Radar Settings"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Center View */}
        <button
          id="map-btn-recenter"
          onClick={() => {
            const lat = selectedDistrict?.coordinates.lat || 10.1115;
            const lng = selectedDistrict?.coordinates.lng || 76.358;
            handleJumpToSector(lat, lng, 13);
          }}
          className="glass-panel hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-xl shadow-lg transition-all"
          title="Recenter Map on Current Sector"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Real-Time Indian Weather Telemetry HUD (Top Right) */}
      <div className="absolute top-16 right-3 z-[1000] max-w-xs sm:max-w-sm w-full pointer-events-auto">
        <div className="glass-panel-elevated p-3 sm:p-3.5 rounded-2xl text-white shadow-2xl border border-slate-700/80">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
              <span className="font-tactical font-bold text-xs uppercase tracking-wider text-cyan-300">
                IMD &bull; SECTOR DOPPLER TELEMETRY
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-tactical font-black ${
              currentTelemetry.imdWarningColor === 'RED'
                ? 'bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse'
                : 'bg-amber-600/30 text-amber-400 border border-amber-500/50'
            }`}>
              {currentTelemetry.imdWarningColor} ALERT
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl sm:text-2xl font-black font-tactical text-white">
                  {currentTelemetry.tempC}°C
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  Humidity: <strong className="text-slate-200">{currentTelemetry.humidityPct}%</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-tactical text-red-400 flex items-center justify-end space-x-1">
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400 inline mr-0.5" />
                  <span>{currentTelemetry.rainRateMmHr} mm/h</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentTelemetry.radarEchoStatus}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-medium">
              {currentTelemetry.stormDescription}
            </p>

            <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
              <div>
                <span className="block text-[9px] text-slate-500">SURFACE WIND</span>
                <strong className="text-slate-200">{currentTelemetry.windDirectionText}</strong>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">BAROMETER</span>
                <strong className="text-slate-200">{currentTelemetry.pressureHpa} hPa</strong>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">ELEVATION</span>
                <strong className="text-slate-200">{currentTelemetry.elevationM}m MSL</strong>
              </div>
            </div>

            {/* Presentation Cloudburst Escalation Trigger */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
              <button
                onClick={() => setIsSimulatedCloudburst(!isSimulatedCloudburst)}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold font-tactical transition-all flex items-center justify-center space-x-1 ${
                  isSimulatedCloudburst
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Toggle simulated extreme monsoon cloudburst for presentation"
              >
                <span>⚡</span>
                <span>{isSimulatedCloudburst ? 'Cloudburst Active (48mm/h)' : 'Simulate Heavy Torrent'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Doppler Radar Playback Bar & Opacity Control (Bottom Left) */}
      {showWeatherLayer && (
        <div className="absolute bottom-4 left-3 z-[1000] max-w-md w-[calc(100%-24px)] sm:w-auto glass-panel p-2.5 rounded-2xl shadow-2xl border border-slate-700/80">
          <div className="flex items-center space-x-3 text-xs">
            {/* Play/Pause Button */}
            <button
              onClick={() => setRadarPlaying(!radarPlaying)}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-600/30"
              title={radarPlaying ? 'Pause Doppler Loop' : 'Play Doppler Loop'}
            >
              {radarPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Timeline Scrubber */}
            <div className="flex-1 min-w-[140px] sm:min-w-[180px]">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span className="flex items-center space-x-1 text-cyan-300">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>DOPPLER RADAR LOOP</span>
                </span>
                <span className="text-slate-300 font-bold font-tactical">
                  {radarFrames.length > 0
                    ? new Date((radarFrames[activeFrameIndex]?.time || Date.now() / 1000) * 1000).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) + ' IST'
                    : 'LIVE NOW'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, radarFrames.length - 1)}
                value={activeFrameIndex}
                onChange={(e) => {
                  setActiveFrameIndex(Number(e.target.value));
                  setRadarPlaying(false);
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Opacity Slider */}
            <div className="hidden sm:flex flex-col items-center pl-2 border-l border-slate-800">
              <span className="text-[9px] text-slate-400 font-mono">OPACITY {Math.round(weatherOpacity * 100)}%</span>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={weatherOpacity}
                onChange={(e) => setWeatherOpacity(Number(e.target.value))}
                className="w-16 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Storm Intensity dBZ Legend */}
          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="text-slate-500">INTENSITY:</span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Drizzle</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Moderate</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Heavy</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-red-400 font-bold">Torrential (&gt;35mm/h)</span>
            </span>
          </div>
        </div>
      )}

      {/* Selected Incident Drawer on bottom */}
      {selectedIncident && (
        <div className="absolute bottom-4 right-3 sm:right-auto sm:left-[360px] z-[1000] max-w-sm w-[calc(100%-24px)] glass-panel-elevated p-3.5 rounded-2xl shadow-2xl text-white border border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 text-[10px] font-black font-tactical rounded ${
                  selectedIncident.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                }`}
              >
                {selectedIncident.priority}
              </span>
              <span className="font-bold text-sm text-slate-100 font-tactical">
                {selectedIncident.incidentCode}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.coordinates.lat},${selectedIncident.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800 font-mono"
              >
                <span>Google Maps ↗</span>
              </a>
              <button onClick={() => onSelectIncident(null)} className="text-slate-400 hover:text-white p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">{selectedIncident.title}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{selectedIncident.description}</p>
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-300 mt-2 pt-1.5 border-t border-slate-800">
            <span>👥 {selectedIncident.peopleCount} People &bull; ❤️ {selectedIncident.injuredCount} Injured</span>
            {selectedIncident.assignedTeamName ? (
              <span className="text-blue-400 font-bold">🚑 Dispatched: {selectedIncident.assignedTeamName}</span>
            ) : (
              <span className="text-amber-400 font-bold">⚠️ Unit Unassigned</span>
            )}
          </div>
        </div>
      )}

      {/* Weather Settings & API Key Modal */}
      {showWeatherSettingsModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-elevated p-5 rounded-2xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyan-400">
                <CloudRain className="w-5 h-5" />
                <h3 className="font-tactical font-black text-white text-base">
                  Weather Radar & OpenWeatherMap
                </h3>
              </div>
              <button
                onClick={() => setShowWeatherSettingsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  OpenWeatherMap API Key (Optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  Real-time Doppler precipitation radar over Kerala & India is already active via RainViewer IMD telemetry. You can optionally provide an OpenWeatherMap API key for high-resolution cloud and wind overlays.
                </p>
                <input
                  type="password"
                  placeholder="Enter your OpenWeatherMap API Key..."
                  value={customOwmKey}
                  onChange={(e) => setCustomOwmKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Doppler Radar Network:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE (India / IMD)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>RainViewer Frames:</span>
                  <span className="text-cyan-300">{radarFrames.length} Frames Synced</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Convective Storm Cells:</span>
                  <span className="text-amber-300">{INDIAN_CONVECTIVE_STORM_CELLS.length} Monitored</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowWeatherSettingsModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveOwmKey(customOwmKey)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />
    </div>
  );
};
