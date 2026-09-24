import React, { useState, useEffect } from 'react';
import {
  NationalAlert,
  HazardModuleInfo,
  LiveDisasterNewsItem,
  LiveWeatherReport,
  AirQualityReport,
  AccuWeatherLocationSearchResult,
} from '../types';
import {
  WEATHER_PRESET_LOCATIONS,
  NATIONAL_ALERTS,
  MULTI_HAZARD_MODULES,
  LIVE_DISASTER_NEWS,
} from '../data/mockData';
import { AccuWeatherPlaygroundModal } from './AccuWeatherPlaygroundModal';
import {
  AlertTriangle,
  Radio,
  ExternalLink,
  Droplets,
  Wind,
  CloudRain,
  Mountain,
  Zap,
  Activity,
  Flame,
  Waves,
  Snowflake,
  Sun,
  CloudFog,
  Sprout,
  Factory,
  ShieldCheck,
  PhoneCall,
  Clock,
  Compass,
  CheckCircle2,
  RefreshCw,
  Info,
  MapPin,
  ChevronRight,
  Shield,
  FileText,
  Hospital,
  Satellite,
  Thermometer,
  Layers,
  Search,
} from 'lucide-react';

interface NationalHomeViewProps {
  onNavigateToMap: () => void;
  onNavigateToCommandCenter: () => void;
  onNavigateToCitizenSOS: () => void;
}

export const NationalHomeView: React.FC<NationalHomeViewProps> = ({
  onNavigateToMap,
  onNavigateToCommandCenter,
  onNavigateToCitizenSOS,
}) => {
  // Weather location selection
  const [selectedLocationId, setSelectedLocationId] = useState<string>('aluva-kerala');
  const currentLocationData =
    WEATHER_PRESET_LOCATIONS.find((loc) => loc.id === selectedLocationId) ||
    WEATHER_PRESET_LOCATIONS[0];

  const [weatherData, setWeatherData] = useState<LiveWeatherReport>(currentLocationData.report);
  const [airQualityData, setAirQualityData] = useState<AirQualityReport>(currentLocationData.airQuality);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);

  // AccuWeather Quick-Start & Test Console State
  const [isAccuPlaygroundOpen, setIsAccuPlaygroundOpen] = useState<boolean>(false);
  const [citySearchInput, setCitySearchInput] = useState<string>('');
  const [searchResults, setSearchResults] = useState<AccuWeatherLocationSearchResult[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [activeCustomCityName, setActiveCustomCityName] = useState<string | null>(null);

  // Alert filters
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'>('ALL');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<NationalAlert | null>(null);

  // Hazard details modal
  const [selectedHazardModal, setSelectedHazardModal] = useState<HazardModuleInfo | null>(null);

  // News agency filter
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'NDRF' | 'PIB' | 'NDMA' | 'IMD' | 'ISRO'>('ALL');

  // Real-time clock for IST
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('13:38:00 IST');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setCurrentTimeStr(`${istTime} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live AccuWeather Data (Core Weather API)
  const handleFetchAccuWeather = async (locationKey: string, customName?: string) => {
    setIsRefreshingWeather(true);
    try {
      const res = await fetch(`/api/weather/overview?key=${encodeURIComponent(locationKey)}`);
      if (res.ok) {
        const live: LiveWeatherReport = await res.json();
        setWeatherData(live);
        if (customName) {
          setActiveCustomCityName(customName);
        }
      }
    } catch (err) {
      console.warn('AccuWeather overview fetch warning:', err);
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  // Live AccuWeather City Search
  const handleCitySearch = async (q: string) => {
    if (!q.trim()) return;
    setIsSearchingCities(true);
    try {
      const res = await fetch(`/api/weather/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowSearchDropdown(true);
        }
      }
    } catch (err) {
      console.warn('AccuWeather city search failed:', err);
    } finally {
      setIsSearchingCities(false);
    }
  };

  // Update weather whenever location preset changes
  useEffect(() => {
    setActiveCustomCityName(null);
    setShowSearchDropdown(false);
    if (currentLocationData.locationKey) {
      handleFetchAccuWeather(currentLocationData.locationKey);
    } else {
      setWeatherData(currentLocationData.report);
    }
    setAirQualityData(currentLocationData.airQuality);
  }, [selectedLocationId, currentLocationData]);

  // Filtered alerts
  const filteredAlerts =
    alertFilter === 'ALL'
      ? NATIONAL_ALERTS
      : NATIONAL_ALERTS.filter((a) => a.severity === alertFilter);

  // Filtered news
  const filteredNews =
    newsFilter === 'ALL'
      ? LIVE_DISASTER_NEWS
      : LIVE_DISASTER_NEWS.filter((n) => n.source === newsFilter);

  // Severity counts
  const redCount = NATIONAL_ALERTS.filter((a) => a.severity === 'RED').length;
  const orangeCount = NATIONAL_ALERTS.filter((a) => a.severity === 'ORANGE').length;
  const yellowCount = NATIONAL_ALERTS.filter((a) => a.severity === 'YELLOW').length;
  const greenCount = NATIONAL_ALERTS.filter((a) => a.severity === 'GREEN').length;

  // Helper for hazard icon component
  const getHazardIcon = (name: string, className = 'w-6 h-6') => {
    switch (name) {
      case 'Wind':
        return <Wind className={className} />;
      case 'CloudRain':
        return <CloudRain className={className} />;
      case 'Mountain':
        return <Mountain className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Activity':
        return <Activity className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Waves':
        return <Waves className={className} />;
      case 'Snowflake':
        return <Snowflake className={className} />;
      case 'Sun':
        return <Sun className={className} />;
      case 'CloudFog':
        return <CloudFog className={className} />;
      case 'Sprout':
        return <Sprout className={className} />;
      case 'Factory':
        return <Factory className={className} />;
      default:
        return <AlertTriangle className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. HERO SECTION (Screenshot 1) */}
      <section className="relative bg-gradient-to-b from-[#0a2540] via-[#0d3b66] to-[#0a2540] text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#60a5fa 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Status Badges with Logo */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-sky-500/40 shadow-lg">
              <img
                src="https://i.ibb.co/0V1sbjrr/Chat-GPT-Image-Sep-21-2026-02-05-10-PM.png"
                alt="RESQNET Emblem"
                className="w-5 h-5 object-contain rounded-md"
                referrerPolicy="no-referrer"
              />
              <span className="font-tactical font-black text-xs text-sky-300 tracking-wider">RESQNET INDIA</span>
            </div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>NATIONAL MULTI-HAZARD VIEW</span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              Updated continuously
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-4xl">
            One India. One Platform. <br />
            <span className="text-sky-300">Every Hazard. Every Community.</span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-200/90 max-w-3xl leading-relaxed font-normal">
            A modern disaster-intelligence interface bringing together alerts, weather, air quality,
            hazard awareness, emergency resources and geospatial situational awareness.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
            <a
              href="#alert-center"
              id="hero-btn-official-alerts"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-100 transition-all shadow-lg shadow-black/20"
            >
              <span className="text-lg">🚨</span>
              <span>Official Live Alerts</span>
            </a>

            <button
              id="hero-btn-explore-map"
              onClick={onNavigateToMap}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-400/40 font-bold text-sm sm:text-base transition-all shadow-lg"
            >
              <span className="text-lg">🗺️</span>
              <span>Explore Disaster Map</span>
            </button>

            <a
              href="#prepare-respond"
              id="hero-btn-prepare"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-sm sm:text-base transition-all"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Prepare & Respond</span>
            </a>

            <button
              id="hero-btn-open-command"
              onClick={onNavigateToCommandCenter}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-red-600/30"
            >
              <Activity className="w-5 h-5" />
              <span>RESQNET Ops Center</span>
            </button>
          </div>
        </div>
      </section>

      {/* METRIC CARDS ROW BENEATH HERO (Screenshot 1) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Active Alerts */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Alerts
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-red-600 flex items-center space-x-2">
                <span>{redCount + orangeCount}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold uppercase">
                  Active
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {redCount} Red &bull; {orangeCount} Orange
            </p>
          </div>

          {/* Weather Location */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Weather ({currentLocationData.name.split('/')[0].trim()})
            </span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {weatherData.temperature}°C
              </span>
              <span className="text-xs text-slate-500 font-semibold truncate">
                {weatherData.condition.split('&')[0]}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              {currentLocationData.state} &bull; Rain {weatherData.rainProbability}%
            </p>
          </div>

          {/* Air Quality */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Air Quality
            </span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                {airQualityData.aqi}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold ${
                  airQualityData.aqi <= 50
                    ? 'bg-emerald-100 text-emerald-700'
                    : airQualityData.aqi <= 100
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {airQualityData.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              PM2.5: {airQualityData.pm25} µg/m³
            </p>
          </div>

          {/* Risk Indicator */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Risk Indicator
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-black text-amber-600 uppercase">
                {selectedLocationId === 'aluva-kerala' || selectedLocationId === 'wayanad-kerala'
                  ? 'HIGH'
                  : 'MODERATE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              {selectedLocationId === 'aluva-kerala'
                ? 'Periyar Flood Surge'
                : selectedLocationId === 'wayanad-kerala'
                ? 'Landslide Hazard'
                : 'Seasonal Monitoring'}
            </p>
          </div>

          {/* Last Refresh */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Last Refresh
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">
                {currentTimeStr.slice(0, 5)} IST
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Auto refresh: 5 min</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. NATIONAL ALERT CENTRE (Screenshot 2) */}
      <section id="alert-center" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🚨</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                National Alert Centre
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Official alerts should always be verified through authorised Government sources.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition-colors"
            >
              <span>Open SACHET</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 2-Column Alert Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Alert Feed */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">Live Alert Feed</h3>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Official Portal Stream
                </span>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAlertFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      alertFilter === filter
                        ? filter === 'RED'
                          ? 'bg-red-600 text-white'
                          : filter === 'ORANGE'
                          ? 'bg-amber-500 text-white'
                          : filter === 'YELLOW'
                          ? 'bg-yellow-400 text-slate-900'
                          : filter === 'GREEN'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Cards List */}
            <div className="mt-4 space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="font-semibold">No active warnings for this category.</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      alert.severity === 'RED'
                        ? 'border-l-4 border-l-red-600 bg-red-50/50 border-red-100 hover:bg-red-50'
                        : alert.severity === 'ORANGE'
                        ? 'border-l-4 border-l-amber-500 bg-amber-50/40 border-amber-100 hover:bg-amber-50'
                        : alert.severity === 'YELLOW'
                        ? 'border-l-4 border-l-yellow-500 bg-yellow-50/40 border-yellow-100 hover:bg-yellow-50'
                        : 'border-l-4 border-l-emerald-500 bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                            alert.severity === 'RED'
                              ? 'bg-red-600 text-white'
                              : alert.severity === 'ORANGE'
                              ? 'bg-amber-500 text-white'
                              : alert.severity === 'YELLOW'
                              ? 'bg-yellow-400 text-slate-900'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {alert.source}
                        </span>
                        <span className="text-xs text-slate-400">&bull; {alert.issuedAt}</span>
                      </div>

                      <button
                        onClick={() => setSelectedAlertForModal(alert)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center space-x-1"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="mt-2 font-bold text-slate-900 text-sm sm:text-base">
                      {alert.title}
                    </h4>

                    <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-2">
                      {alert.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold">Affected:</span>
                      {alert.affectedRegions.map((region, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[11px] font-medium"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span className="font-mono">Feed: CAP v1.2 Protocol &bull; NDMA Gateway</span>
              <a
                href="https://sachet.ndma.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>View Official RSS Feed</span>
              </a>
            </div>
          </div>

          {/* Right Column: Alert Severity Matrix (Screenshot 2) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">Alert Severity</h3>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  National View
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {/* RED */}
                <div
                  onClick={() => setAlertFilter('RED')}
                  className="cursor-pointer p-3.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 transition-all border-l-4 border-l-red-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-red-700 text-sm">RED</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">
                        Immediate Action
                      </span>
                    </div>
                    <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      {redCount} Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Severe / dangerous situation. Follow official instructions immediately.
                  </p>
                </div>

                {/* ORANGE */}
                <div
                  onClick={() => setAlertFilter('ORANGE')}
                  className="cursor-pointer p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-all border-l-4 border-l-amber-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-amber-800 text-sm">ORANGE</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase">
                        Prepare
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {orangeCount} Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    High-impact event possible. Monitor official updates and prepare essentials.
                  </p>
                </div>

                {/* YELLOW */}
                <div
                  onClick={() => setAlertFilter('YELLOW')}
                  className="cursor-pointer p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50 transition-all border-l-4 border-l-yellow-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-yellow-800 text-sm">YELLOW</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-900 uppercase">
                        Be Aware
                      </span>
                    </div>
                    <span className="text-xs font-black text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">
                      {yellowCount} Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Potentially hazardous conditions. Stay informed on changing weather patterns.
                  </p>
                </div>

                {/* GREEN */}
                <div
                  onClick={() => setAlertFilter('GREEN')}
                  className="cursor-pointer p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-all border-l-4 border-l-emerald-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-emerald-800 text-sm">GREEN</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase">
                        Normal
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {greenCount} Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    No active warning shown by this interface. Baseline conditions normal.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Standard: IMD & NDMA Guidelines</span>
              <button
                onClick={() => setAlertFilter('ALL')}
                className="font-bold text-sky-600 hover:underline"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WEATHER & AIR QUALITY INTELLIGENCE (Powered by AccuWeather Core Weather API) */}
      <section id="weather-intelligence" className="bg-slate-100/70 border-y border-slate-200/80 py-16 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header with Title and AccuWeather Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-2xl">🌦️</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Weather & Air Quality Intelligence
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  AccuWeather Core Weather API
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Zuplo Gateway Active
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time observations, 5-day daily forecasts, and severe weather headlines powered by AccuWeather Core Weather API (Key: <code className="font-mono text-xs text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200">zpka_589...</code>)
              </p>
            </div>

            {/* Quick-Start Playground Console Trigger Button */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAccuPlaygroundOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 border border-slate-700"
              >
                <span className="text-amber-400 font-bold">⚡</span>
                <span>AccuWeather API Console</span>
                <span className="text-[10px] bg-sky-900 text-sky-200 px-1.5 py-0.5 rounded">
                  Quick-Start
                </span>
              </button>
            </div>
          </div>

          {/* Location Selector Bar + City Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Presets:
              </span>
              {WEATHER_PRESET_LOCATIONS.map((loc) => {
                const isSelected = selectedLocationId === loc.id && !activeCustomCityName;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setActiveCustomCityName(null);
                      setSelectedLocationId(loc.id);
                      if (loc.locationKey) {
                        handleFetchAccuWeather(loc.locationKey);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {loc.name.split('/')[0].trim()}
                    {loc.locationKey && (
                      <span className="ml-1 text-[10px] opacity-70 font-mono">
                        ({loc.locationKey})
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  const keyToUse = weatherData.locationKey || currentLocationData.locationKey || '349727';
                  handleFetchAccuWeather(keyToUse, activeCustomCityName || undefined);
                }}
                disabled={isRefreshingWeather}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
                title="Refresh Live AccuWeather Data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingWeather ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>

            {/* City Search Bar (AccuWeather /locations/v1/cities/search) */}
            <div className="relative w-full md:w-80">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500 transition-all">
                <input
                  type="text"
                  value={citySearchInput}
                  onChange={(e) => setCitySearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCitySearch(citySearchInput);
                    }
                  }}
                  placeholder="Search city (e.g. New York, Kochi)..."
                  className="w-full px-3 py-1.5 text-xs text-slate-800 bg-transparent outline-none"
                />
                <button
                  onClick={() => handleCitySearch(citySearchInput)}
                  disabled={isSearchingCities}
                  className="px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {isSearchingCities ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl z-30 max-h-60 overflow-y-auto p-1.5 space-y-1">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <span>AccuWeather Locations</span>
                    <button
                      onClick={() => setShowSearchDropdown(false)}
                      className="text-slate-500 hover:text-slate-800 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.map((city) => (
                    <button
                      key={city.Key}
                      onClick={() => {
                        setShowSearchDropdown(false);
                        setCitySearchInput(city.LocalizedName);
                        handleFetchAccuWeather(city.Key, city.LocalizedName);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-sky-50 text-xs flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{city.LocalizedName}</span>
                        <span className="text-slate-500 text-[11px] ml-1">
                          ({city.AdministrativeArea?.LocalizedName}, {city.Country?.LocalizedName})
                        </span>
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        Key: {city.Key}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout: Live Weather + Air Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Weather Card (8 columns) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Live Weather — {activeCustomCityName || weatherData.locationName || currentLocationData.name}
                      </h3>
                      {weatherData.locationKey && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                          Location Key: {weatherData.locationKey}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {weatherData.state && `${weatherData.state}, `}
                      {weatherData.country || 'India'} &bull; GPS: {weatherData.latitude.toFixed(4)}° N, {weatherData.longitude.toFixed(4)}° E
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>AccuWeather Live &bull; {weatherData.updatedAt}</span>
                  </div>
                </div>

                {/* AccuWeather Severe Headline Banner */}
                {weatherData.accuHeadline && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-2.5">
                    <span className="text-base">📢</span>
                    <div className="flex-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                        AccuWeather Forecast Advisory
                      </span>
                      <p className="text-xs font-semibold text-amber-950 mt-0.5">
                        {weatherData.accuHeadline}
                      </p>
                    </div>
                  </div>
                )}

                {/* Weather Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
                  {/* Left: Big Temp & Condition */}
                  <div className="md:col-span-5 bg-gradient-to-br from-sky-50 to-blue-50/60 p-5 rounded-2xl border border-sky-100/80 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {(activeCustomCityName || weatherData.locationName).toUpperCase()}
                    </span>

                    <div className="my-4 flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl">
                        {weatherData.condition.toLowerCase().includes('rain')
                          ? '🌧️'
                          : weatherData.condition.toLowerCase().includes('storm')
                          ? '⛈️'
                          : weatherData.condition.toLowerCase().includes('cloud')
                          ? '⛅'
                          : '☀️'}
                      </div>
                      <div>
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                          {weatherData.temperature}°C
                        </span>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {weatherData.condition}
                        </p>
                      </div>
                    </div>

                    {/* 4 sub-metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/80 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">RealFeel</span>
                        <p className="font-bold text-slate-800 text-sm">{weatherData.feelsLike}°C</p>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Humidity</span>
                        <p className="font-bold text-slate-800 text-sm">{weatherData.humidity}%</p>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Wind Speed</span>
                        <p className="font-bold text-slate-800 text-sm">{weatherData.windSpeed} km/h</p>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Precipitation</span>
                        <p className="font-bold text-slate-800 text-sm">{weatherData.precipitation} mm</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: AccuWeather 5-Day Daily Forecast */}
                  <div className="md:col-span-7">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        5-Day Daily Forecast (AccuWeather)
                      </span>
                      <span className="text-[11px] font-mono text-sky-700 font-bold">
                        Metric Units
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {weatherData.forecast.slice(0, 5).map((f, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 hover:bg-sky-50 transition-colors p-2.5 rounded-xl border border-slate-200/60 text-center flex flex-col items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-700">{f.day}</span>
                          <div className="my-1 text-lg">
                            {f.condition.toLowerCase().includes('rain') || f.condition.toLowerCase().includes('storm')
                              ? '🌧️'
                              : f.condition.toLowerCase().includes('cloud')
                              ? '⛅'
                              : '☀️'}
                          </div>
                          <span className="text-xs font-extrabold text-slate-900">
                            {f.maxTemp}° / {f.minTemp}°
                          </span>
                          <span className="text-[10px] font-semibold text-sky-600 mt-1">
                            Rain {f.rainProb}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium">Gateway: Zuplo Edge API Proxy &bull; AccuWeather Core Weather</span>
                </div>
                {weatherData.accuMobileLink && (
                  <a
                    href={weatherData.accuMobileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 font-bold hover:underline inline-flex items-center space-x-1"
                  >
                    <span>AccuWeather Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Air Quality Card (4 columns, Screenshot 3) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Wind className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Air Quality</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Open-Meteo model</span>
                </div>

                {/* Big AQI Number */}
                <div className="text-center my-6">
                  <span className="text-5xl sm:text-6xl font-black text-emerald-600 tracking-tight">
                    {airQualityData.aqi}
                  </span>
                  <p className="text-base font-bold text-slate-700 mt-1">
                    {airQualityData.status}
                  </p>
                </div>

                {/* Gradient Scale Bar with Indicator */}
                <div className="my-4">
                  <div className="relative w-full h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-amber-500 to-rose-600">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-950 border-2 border-white shadow-md"
                      style={{
                        left: `${Math.min(95, Math.max(5, (airQualityData.aqi / 250) * 100))}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1.5">
                    <span>Good (0)</span>
                    <span>Moderate (50)</span>
                    <span>Poor (100)</span>
                    <span>Severe (200+)</span>
                  </div>
                </div>

                {/* 4 atmospheric metrics */}
                <div className="grid grid-cols-2 gap-2.5 mt-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">PM2.5</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {airQualityData.pm25} µg/m³
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">PM10</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {airQualityData.pm10} µg/m³
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">NO₂</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {airQualityData.no2} µg/m³
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">O₃</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {airQualityData.o3} µg/m³
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                CPCB National Air Quality Standard (NAAQS)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MULTI-HAZARD INTELLIGENCE (Screenshot 4 - 12 Dedicated Modules) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🌪️</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Multi-Hazard Intelligence
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated hazard modules for preparedness, monitoring and response. Click any hazard to view safety protocols and active zones.
          </p>
        </div>

        {/* 12 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {MULTI_HAZARD_MODULES.map((hazard) => (
            <button
              key={hazard.id}
              onClick={() => setSelectedHazardModal(hazard)}
              className="group bg-white hover:bg-slate-50 transition-all p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md text-center flex flex-col items-center justify-between relative overflow-hidden"
            >
              {/* Active warnings pill */}
              {hazard.activeWarningsCount > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700">
                  {hazard.activeWarningsCount}
                </span>
              )}

              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:scale-110 transition-transform flex items-center justify-center text-slate-700 my-2">
                {getHazardIcon(hazard.iconName, 'w-6 h-6 text-slate-800')}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  {hazard.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hazard.tagline}
                </p>
              </div>

              <span className="mt-3 text-[10px] font-bold text-sky-600 group-hover:underline">
                View Guidelines &rarr;
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. LIVE DISASTER NEWS & UPDATES (Screenshot 5) */}
      <section className="bg-slate-100/60 border-y border-slate-200/80 py-16 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📰</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Live Disaster News & Updates
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Curated from official Government and disaster-management sources.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE FEED</span>
              </span>
              <button
                onClick={() => {}}
                className="px-3 py-1.5 rounded-xl bg-sky-900 text-white text-xs font-bold flex items-center space-x-1 hover:bg-sky-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* News Card Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            {/* Filter Badges */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  National Disaster & Response News
                </h3>
                <span className="text-xs text-slate-400">Directly from agency release desks</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'NDRF', 'PIB', 'NDMA', 'IMD', 'ISRO'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setNewsFilter(src)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      newsFilter === src
                        ? 'bg-sky-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            {/* News List */}
            <div className="space-y-4">
              {filteredNews.map((news) => (
                <div
                  key={news.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-100 text-sky-800">
                      {news.source}
                    </span>
                    <span className="text-xs font-bold text-slate-400">&bull; {news.timestamp}</span>
                    {news.verified && (
                      <span className="flex items-center space-x-1 text-[11px] text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Release</span>
                      </span>
                    )}
                  </div>

                  <h4 className="mt-2 font-bold text-slate-900 text-sm sm:text-base">
                    {news.title}
                  </h4>

                  <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {news.summary}
                  </p>
                </div>
              ))}
            </div>

            {/* Source Policy Note */}
            <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                <strong>Source policy:</strong> News items are intended for situational awareness. For warnings or emergency instructions, rely on official NDMA SACHET / IMD alerts. Every news card links to its originating source.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PREPARE • RESPOND • RECOVER (Screenshot 5) */}
      <section id="prepare-respond" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <Shield className="w-7 h-7 text-sky-700" />
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Prepare &bull; Respond &bull; Recover
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Citizen-facing disaster preparedness and response tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Do's & Don'ts */}
          <div
            onClick={() => setSelectedHazardModal(MULTI_HAZARD_MODULES[1])}
            className="cursor-pointer bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl mb-4">
                📋
              </div>
              <h3 className="font-bold text-slate-900 text-base">Do's & Don'ts</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hazard-specific safety guidance for cyclones, floods, lightning, earthquakes, landslides and other emergencies.
              </p>
            </div>
            <span className="mt-4 text-xs font-bold text-sky-600 flex items-center space-x-1">
              <span>Read Safety Protocols</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 2: Find Emergency Help */}
          <div
            onClick={onNavigateToMap}
            className="cursor-pointer bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-xl mb-4">
                🏥
              </div>
              <h3 className="font-bold text-slate-900 text-base">Find Emergency Help</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect this module to a GIS database of hospitals, shelters, fire stations, police and relief facilities.
              </p>
            </div>
            <span className="mt-4 text-xs font-bold text-sky-600 flex items-center space-x-1">
              <span>Open GIS Safe Zones</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 3: Official Alert Feed */}
          <div
            onClick={() => setAlertFilter('ALL')}
            className="cursor-pointer bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl mb-4">
                📡
              </div>
              <h3 className="font-bold text-slate-900 text-base">Official Alert Feed</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Access NDMA SACHET's CAP/RSS alert dissemination service for integration with authorised systems.
              </p>
            </div>
            <span className="mt-4 text-xs font-bold text-sky-600 flex items-center space-x-1">
              <span>View Active Stream</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 4: Space-Based Intelligence */}
          <div
            onClick={onNavigateToMap}
            className="cursor-pointer bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl mb-4">
                🛰️
              </div>
              <h3 className="font-bold text-slate-900 text-base">Space-Based Intelligence</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect NRSC / ISRO disaster-management layers for flood inundation, cyclone, forest fire, and landslide.
              </p>
            </div>
            <span className="mt-4 text-xs font-bold text-sky-600 flex items-center space-x-1">
              <span>View Satellite Overlays</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </section>

      {/* 7. EMERGENCY QUICK ACCESS (Screenshot 6) */}
      <section className="bg-gradient-to-r from-[#0a2540] via-[#0d3b66] to-[#0a2540] text-white py-12 px-4 sm:px-6 lg:px-8 w-full shadow-inner">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-black uppercase tracking-wider">
              SOS
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Emergency Quick Access
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">
            Keep this section highly visible on the production portal. Direct emergency contact numbers across India.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            {/* 112 */}
            <a
              href="tel:112"
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 sm:p-5 rounded-2xl text-center transition-all flex flex-col justify-center"
            >
              <span className="text-3xl sm:text-4xl font-black text-white">112</span>
              <span className="text-xs font-semibold text-slate-200 mt-1">National Emergency</span>
            </a>

            {/* 101 */}
            <a
              href="tel:101"
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 sm:p-5 rounded-2xl text-center transition-all flex flex-col justify-center"
            >
              <span className="text-3xl sm:text-4xl font-black text-white">101</span>
              <span className="text-xs font-semibold text-slate-200 mt-1">Fire & Rescue</span>
            </a>

            {/* 108 */}
            <a
              href="tel:108"
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 sm:p-5 rounded-2xl text-center transition-all flex flex-col justify-center"
            >
              <span className="text-3xl sm:text-4xl font-black text-white">108</span>
              <span className="text-xs font-semibold text-slate-200 mt-1">Ambulance</span>
            </a>

            {/* SACHET */}
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 sm:p-5 rounded-2xl text-center transition-all flex flex-col justify-center"
            >
              <span className="text-2xl sm:text-3xl font-black text-white">SACHET</span>
              <span className="text-xs font-semibold text-slate-200 mt-1">Disaster Alerts</span>
            </a>

            {/* GIS */}
            <button
              onClick={onNavigateToMap}
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 sm:p-5 rounded-2xl text-center transition-all flex flex-col justify-center col-span-2 sm:col-span-1"
            >
              <span className="text-2xl sm:text-3xl font-black text-white">GIS</span>
              <span className="text-xs font-semibold text-slate-200 mt-1">Find Nearest Help</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. AUTHORITATIVE DATA ECOSYSTEM (Screenshot 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏛️</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Authoritative Data Ecosystem
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Production implementation connects authenticated/authorised feeds from these agencies.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* NDMA */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">NDMA</span>
            <span className="text-xs text-slate-500 mt-0.5">SACHET Alerts</span>
          </div>

          {/* IMD */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">IMD</span>
            <span className="text-xs text-slate-500 mt-0.5">Weather & Warnings</span>
          </div>

          {/* NRSC / ISRO */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">NRSC / ISRO</span>
            <span className="text-xs text-slate-500 mt-0.5">Satellite & GIS</span>
          </div>

          {/* NDEM */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">NDEM</span>
            <span className="text-xs text-slate-500 mt-0.5">Disaster Geoportal</span>
          </div>

          {/* INCOIS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">INCOIS</span>
            <span className="text-xs text-slate-500 mt-0.5">Ocean & Tsunami</span>
          </div>

          {/* CWC */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="font-extrabold text-slate-900 text-base">CWC</span>
            <span className="text-xs text-slate-500 mt-0.5">Water & Flood</span>
          </div>
        </div>
      </section>

      {/* 9. GOVERNMENT FOOTER (Screenshot 6) */}
      <footer className="bg-[#06182a] text-slate-400 text-xs border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-xl">
            <h4 className="text-white font-black text-sm tracking-wide">
              India Disaster Intelligence & Early Warning System
            </h4>
            <p className="mt-2 text-slate-400 leading-relaxed text-xs">
              A concept interface for a national multi-hazard disaster intelligence portal. Official warnings must be verified through authorised Government sources. Model-based weather and air-quality information should not be represented as official disaster warnings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://sachet.ndma.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
            >
              NDMA SACHET
            </a>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 font-semibold text-xs border border-slate-700">
              NRSC / ISRO
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 font-semibold text-xs border border-slate-700">
              IMD
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 font-semibold text-xs border border-slate-700">
              NDEM
            </span>
          </div>
        </div>
      </footer>

      {/* ALERT DETAILS MODAL */}
      {selectedAlertForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    selectedAlertForModal.severity === 'RED'
                      ? 'bg-red-600 text-white'
                      : selectedAlertForModal.severity === 'ORANGE'
                      ? 'bg-amber-500 text-white'
                      : 'bg-yellow-400 text-slate-900'
                  }`}
                >
                  {selectedAlertForModal.severity} ALERT
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedAlertForModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlertForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {selectedAlertForModal.description}
            </p>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase block mb-2">
                Official Action Instructions:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                {selectedAlertForModal.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Source: {selectedAlertForModal.source}</span>
              <span className="font-mono">{selectedAlertForModal.capIdentifier}</span>
            </div>

            <button
              onClick={() => setSelectedAlertForModal(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* HAZARD GUIDELINES MODAL */}
      {selectedHazardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800">
                  {getHazardIcon(selectedHazardModal.iconName, 'w-6 h-6')}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedHazardModal.name} Advisory
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedHazardModal.tagline} &bull; National Disaster Management Authority
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHazardModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* High risk zones */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase block mb-1">
                Major Vulnerable Zones across India:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedHazardModal.highRiskZones.map((zone, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-medium"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>

            {/* Dos and Donts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase flex items-center space-x-1 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DO's (Actions to take)</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {selectedHazardModal.dos.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-xs font-bold text-rose-800 uppercase flex items-center space-x-1 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>DON'Ts (Avoid doing)</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {selectedHazardModal.donts.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Helpline */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold">Dedicated Emergency Helpline:</span>
              <span className="font-bold text-slate-900">{selectedHazardModal.keyHelpline}</span>
            </div>

            <button
              onClick={() => setSelectedHazardModal(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
            >
              Close Guidelines
            </button>
          </div>
        </div>
      )}

      {/* ACCUWEATHER CORE WEATHER API TEST PLAYGROUND CONSOLE */}
      <AccuWeatherPlaygroundModal
        isOpen={isAccuPlaygroundOpen}
        onClose={() => setIsAccuPlaygroundOpen(false)}
        onApplyLocation={(locKey, locName) => {
          handleFetchAccuWeather(locKey, locName);
          setIsAccuPlaygroundOpen(false);
        }}
      />
    </div>
  );
};
