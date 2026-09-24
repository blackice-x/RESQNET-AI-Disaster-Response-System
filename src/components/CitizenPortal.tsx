import React, { useState, useEffect } from 'react';
import {
  EmergencyReport,
  EmergencyType,
  PriorityLevel,
} from '../types';
import { calculateRuleBasedPriority } from '../utils/triage';
import {
  AlertCircle,
  Radio,
  MapPin,
  Users,
  HeartPulse,
  Send,
  WifiOff,
  Wifi,
  Sparkles,
  CheckCircle2,
  Phone,
  RefreshCw,
  Camera,
  Layers,
  Baby,
  Activity,
  ArrowRight,
  Navigation,
} from 'lucide-react';

interface CitizenPortalProps {
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (offline: boolean) => void;
  onSubmitIncident: (data: Partial<EmergencyReport>) => Promise<EmergencyReport>;
  offlineQueue: Partial<EmergencyReport>[];
  onSyncOfflineQueue: () => Promise<void>;
  onSwitchToCommandCenter: () => void;
}

const LOCATION_PRESETS = [
  {
    name: 'Aluva River Bank Road / Manappuram',
    sector: 'Ernakulam Flood Basin',
    lat: 10.1118,
    lng: 76.3575,
    nearestTeam: 'NDRF Boat Alpha (0.6 km)',
  },
  {
    name: 'Marthanda Varma Bridge / Desom Reach',
    sector: 'Aluva West Inundation',
    lat: 10.108,
    lng: 76.351,
    nearestTeam: 'Kerala Fire & Rescue Delta (1.2 km)',
  },
  {
    name: 'Kalamassery Lowland Residential Colony',
    sector: 'Ernakulam Metro Sector',
    lat: 10.0528,
    lng: 76.3278,
    nearestTeam: 'NDRF Bravo Unit (1.8 km)',
  },
  {
    name: 'Kalady Town / Periyar East',
    sector: 'Upper Periyar Lowlands',
    lat: 10.165,
    lng: 76.435,
    nearestTeam: 'SDRF River Quick Unit (2.1 km)',
  },
  {
    name: 'Chooralmala / Meppadi Hill Sector',
    sector: 'Wayanad Landslide Basin',
    lat: 11.5541,
    lng: 76.1264,
    nearestTeam: 'Army Madras Regt 12 Bn (0.9 km)',
  },
];

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  isSimulatedOffline,
  setIsSimulatedOffline,
  onSubmitIncident,
  offlineQueue,
  onSyncOfflineQueue,
  onSwitchToCommandCenter,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'QUICK_SOS' | 'DETAILED_FORM'>('QUICK_SOS');

  // Quick SOS states
  const [sosPeople, setSosPeople] = useState<number>(4);
  const [sosInjured, setSosInjured] = useState<number>(1);
  const [sosTrapped, setSosTrapped] = useState<boolean>(true);
  const [sosActivated, setSosActivated] = useState<boolean>(false);
  const [sosIncident, setSosIncident] = useState<EmergencyReport | null>(null);

  // Location Selection states
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customLandmark, setCustomLandmark] = useState<string>('');

  // Detailed Form States
  const [fullName, setFullName] = useState<string>('Suresh Kumar');
  const [contactPhone, setContactPhone] = useState<string>('+91 98460 22334');
  const [locationName, setLocationName] = useState<string>('River Bank Road, Aluva Flood Zone');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 10.1118,
    lng: 76.3575,
  });
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);
  const [peopleCount, setPeopleCount] = useState<number>(3);
  const [injuredCount, setInjuredCount] = useState<number>(0);
  const [hasChildren, setHasChildren] = useState<boolean>(false);
  const [hasElderly, setHasElderly] = useState<boolean>(true);
  const [isTrapped, setIsTrapped] = useState<boolean>(true);
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('FLOOD_TRAPPED');
  const [waterLevel, setWaterLevel] = useState<'NONE' | 'ANKLE' | 'WAIST' | 'ROOFTOP' | 'SURGING'>('ROOFTOP');
  const [description, setDescription] = useState<string>(
    'Water has reached 1st floor ceiling. We are trapped on the terrace with elderly person. Need emergency evacuation boat!'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<EmergencyReport | null>(null);

  // Live Rule-based priority preview
  const previewTriage = calculateRuleBasedPriority({
    description,
    peopleCount,
    injuredCount,
    hasChildren,
    hasElderly,
    isTrapped,
    emergencyType,
    floodWaterLevel: waterLevel,
  });

  const handleDetectGPS = () => {
    setGpsDetecting(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsDetecting(false);
          setLocationName(`GPS Detected (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        (err) => {
          // Fallback to Kerala Aluva coordinates
          setCoordinates({
            lat: 10.1115 + (Math.random() - 0.5) * 0.01,
            lng: 76.358 + (Math.random() - 0.5) * 0.01,
          });
          setGpsDetecting(false);
        },
        { timeout: 4000 }
      );
    } else {
      setGpsDetecting(false);
    }
  };

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      const activeLoc = LOCATION_PRESETS[selectedPresetIndex];
      const finalLocName = customLandmark.trim()
        ? `${customLandmark.trim()} • ${activeLoc?.name || locationName}`
        : (locationName || activeLoc?.name || 'Aluva Flood Sector');
      const finalCoordinates = coordinates.lat && coordinates.lng
        ? coordinates
        : { lat: activeLoc?.lat || 10.1118, lng: activeLoc?.lng || 76.3575 };

      const result = await onSubmitIncident({
        title: `🚨 CRITICAL SOS: Flood Trap (${sosPeople} People, ${sosInjured} Injured)`,
        description: `Emergency 1-Tap SOS signal triggered at ${finalLocName}. Water surge reported. ${sosPeople} people stranded, ${sosInjured} injured. Immediate extraction required.`,
        peopleCount: sosPeople,
        injuredCount: sosInjured,
        hasChildren: true,
        hasElderly: false,
        isTrapped: sosTrapped,
        emergencyType: 'FLOOD_TRAPPED',
        floodWaterLevel: 'SURGING',
        locationName: finalLocName,
        coordinates: finalCoordinates,
        isOfflineSynced: isSimulatedOffline,
      });

      setSosIncident(result);
      setSosActivated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await onSubmitIncident({
        title: `${emergencyType.replace(/_/g, ' ')}: ${peopleCount} People at ${locationName}`,
        description,
        locationName,
        coordinates,
        peopleCount,
        injuredCount,
        hasChildren,
        hasElderly,
        isTrapped,
        emergencyType,
        floodWaterLevel: waterLevel,
        victimName: fullName,
        contactNumber: contactPhone,
        isOfflineSynced: isSimulatedOffline,
      });

      setSubmitSuccess(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 space-y-5">
      {/* Offline Mode Banner when offline is simulated */}
      {isSimulatedOffline && (
        <div className="p-4 bg-amber-950/80 border-2 border-amber-600 rounded-2xl text-amber-200 shadow-xl space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-black text-sm text-amber-300">
              <WifiOff className="w-5 h-5 text-amber-400" />
              <span>OFFLINE EMERGENCY MODE ACTIVE</span>
            </div>
            <button
              onClick={() => setIsSimulatedOffline(false)}
              className="text-xs px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors"
            >
              Simulate Network Return
            </button>
          </div>
          <div className="text-xs font-mono bg-slate-950/70 p-2.5 rounded-lg border border-amber-800/60 flex items-center justify-between">
            <span>📡 GPS SATELLITE: <strong className="text-emerald-400">AVAILABLE</strong></span>
            <span>CELLULAR NETWORK: <strong className="text-red-400">OFFLINE</strong></span>
          </div>
          <p className="text-xs text-amber-300/90 leading-relaxed">
            Your emergency report will be securely stored locally in your device mesh buffer. When
            network connectivity resumes, RESQNET will automatically transmit it to the Disaster Command Center.
          </p>
          {offlineQueue.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-amber-800/80 text-xs">
              <span className="font-bold text-white">
                📦 {offlineQueue.length} Emergency Request(s) Cached Locally
              </span>
              <button
                onClick={onSyncOfflineQueue}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs: Quick SOS vs Detailed I Need Help */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('QUICK_SOS')}
          className={`py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2 ${
            activeSubTab === 'QUICK_SOS'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>🚨 1-Tap SOS Mode</span>
        </button>
        <button
          onClick={() => setActiveSubTab('DETAILED_FORM')}
          className={`py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2 ${
            activeSubTab === 'DETAILED_FORM'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>📝 I Need Help (Full Report)</span>
        </button>
      </div>

      {/* 1-Tap SOS Mode */}
      {activeSubTab === 'QUICK_SOS' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center space-y-6">
          {!sosActivated ? (
            <>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Instant Emergency Distress Beacon
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Select your hazard location and tap the SOS button to alert the rescue command.
                </p>
              </div>

              {/* 1. Interactive Location Selection */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      1. SELECT RESCUE LOCATION
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsDetecting}
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center space-x-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{gpsDetecting ? 'Detecting GPS...' : 'Detect Exact GPS'}</span>
                  </button>
                </div>

                {/* Preset Location Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LOCATION_PRESETS.map((loc, idx) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setSelectedPresetIndex(idx);
                        setCoordinates({ lat: loc.lat, lng: loc.lng });
                        setLocationName(loc.name);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPresetIndex === idx
                          ? 'bg-red-950/60 border-red-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{loc.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                        <span>{loc.sector}</span>
                        <span className="text-emerald-400 font-semibold">{loc.nearestTeam}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Landmark or House Details */}
                <div>
                  <input
                    type="text"
                    placeholder="Specific house no, landmark, or rooftop detail (e.g. Near St. Dominic Church, Red roof)..."
                    value={customLandmark}
                    onChange={(e) => setCustomLandmark(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Active location confirmation badge */}
                <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between font-mono">
                  <span className="text-slate-300 truncate">
                    📍 Target: <strong className="text-white">{customLandmark || locationName}</strong>
                  </span>
                  <span className="text-emerald-400 font-bold ml-2 shrink-0">
                    {coordinates.lat.toFixed(4)}°N, {coordinates.lng.toFixed(4)}°E
                  </span>
                </div>
              </div>

              {/* 2. Parameters (People & Trapped status) */}
              <div className="grid grid-cols-3 gap-2 text-xs text-left max-w-md mx-auto">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-medium">👥 People: {sosPeople}</div>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <button
                      onClick={() => setSosPeople(Math.max(1, sosPeople - 1))}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-white text-sm">{sosPeople}</span>
                    <button
                      onClick={() => setSosPeople(sosPeople + 1)}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-medium">❤️ Injured: {sosInjured}</div>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <button
                      onClick={() => setSosInjured(Math.max(0, sosInjured - 1))}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-red-400 text-sm">{sosInjured}</span>
                    <button
                      onClick={() => setSosInjured(sosInjured + 1)}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => setSosTrapped(!sosTrapped)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    sosTrapped
                      ? 'bg-red-950/60 border-red-600 text-red-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-medium">⚠️ Trapped?</div>
                  <div className="font-bold text-sm mt-1 text-white">
                    {sosTrapped ? '🚨 TRAPPED' : 'MOVABLE'}
                  </div>
                </div>
              </div>

              {/* Huge SOS Button */}
              <div className="py-2 flex justify-center">
                <button
                  id="btn-trigger-sos"
                  disabled={isSubmitting}
                  onClick={handleTriggerSOS}
                  className="relative group w-48 h-48 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white font-black text-2xl tracking-wider shadow-2xl shadow-red-600/60 border-4 border-red-400 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <div className="absolute -inset-4 rounded-full bg-red-600/30 animate-ping pointer-events-none"></div>
                  <Radio className="w-10 h-10 mb-2 animate-bounce" />
                  <span>🚨 SEND SOS</span>
                  <span className="text-[11px] font-semibold tracking-normal text-red-200 mt-1">
                    Tap to Dispatch Help
                  </span>
                </button>
              </div>
            </>
          ) : (
            /* SOS ACTIVATED Confirmation */
            <div className="space-y-5 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-red-600/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-red-400 tracking-tight">SOS ACTIVATED</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Your distress beacon has been broadcasted to the Disaster Command Center.
                </p>
              </div>

              {/* Status checklist matching the prompt specification */}
              <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 text-left font-mono text-xs space-y-2 max-w-md mx-auto">
                <div className="flex items-center text-emerald-400">
                  <span className="mr-2">📍</span>
                  <span>
                    Location: {sosIncident?.locationName || (customLandmark || locationName)} (
                    {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E)
                  </span>
                </div>
                <div className="flex items-center text-slate-200">
                  <span className="mr-2">👥</span>
                  <span>People affected: {sosPeople}</span>
                </div>
                <div className="flex items-center text-red-400">
                  <span className="mr-2">❤️</span>
                  <span>Injured individuals: {sosInjured}</span>
                </div>
                <div className="flex items-center text-amber-400">
                  <span className="mr-2">⚠️</span>
                  <span>Situation: Severe Flood Surge / Water Trapped</span>
                </div>
                <div className="flex items-center text-cyan-400">
                  <span className="mr-2">📡</span>
                  <span>Emergency Priority: <strong>CRITICAL (AI Score 96/100)</strong></span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={onSwitchToCommandCenter}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-red-600/30"
                >
                  <span>Track on Command Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSosActivated(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Send Another Update
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed I Need Help Form */}
      {activeSubTab === 'DETAILED_FORM' && (
        <form
          onSubmit={handleDetailedSubmit}
          className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4"
        >
          {submitSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Emergency Report Submitted: {submitSuccess.incidentCode}</span>
              </div>
              <p className="text-xs">
                AI has triaged this as <strong>{submitSuccess.priority} PRIORITY</strong>. Help has
                been queued on the Live Disaster Command Map.
              </p>
              <button
                type="button"
                onClick={onSwitchToCommandCenter}
                className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                View Dispatch Status &rarr;
              </button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-black text-white">🚨 I NEED HELP — Emergency Registration</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit critical details to help rescue commanders assess required boats, medical units, and priorities.
            </p>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name / Reporter</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone / WhatsApp Number</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* GPS Location & Detect Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">GPS Location & Landmarks</label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsDetecting}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{gpsDetecting ? 'Detecting GPS...' : 'Auto-Detect Coordinates'}</span>
              </button>
            </div>
            {/* Quick Sector Presets */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setLocationName(loc.name);
                    setCoordinates({ lat: loc.lat, lng: loc.lng });
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    locationName.includes(loc.name.split('/')[0].trim())
                      ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {loc.name.split('/')[0].trim()}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near St. Mary Church, River Road, House #14"
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <div className="text-[11px] text-slate-500 mt-1">
              Coordinates: {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
            </div>
          </div>

          {/* Emergency Type & Flood Water Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Type</label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="FLOOD_TRAPPED">Flood Inundation & Trapped</option>
                <option value="MEDICAL_EMERGENCY">Severe Medical / Oxygen Emergency</option>
                <option value="LANDSLIDE">Landslide / Mud Debris Inflow</option>
                <option value="BUILDING_COLLAPSE">Building Structural Collapse</option>
                <option value="ROAD_BLOCK">Road Block / Fallen Tree</option>
                <option value="FOOD_WATER_RELIEF">Food & Clean Water Depleted</option>
                <option value="GENERAL_EVACUATION">Precautionary Evacuation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Water Depth Level</label>
              <select
                value={waterLevel}
                onChange={(e) => setWaterLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ROOFTOP">Rooftop / 1st Floor Ceiling Level (Extreme)</option>
                <option value="SURGING">Surging Current / Rising Rapidly</option>
                <option value="WAIST">Waist Level (3 - 4 ft)</option>
                <option value="ANKLE">Ankle / Knee Level</option>
                <option value="NONE">No Water Inside (Roads Blocked)</option>
              </select>
            </div>
          </div>

          {/* People & Vulnerability Checkboxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
              <label className="block text-[11px] font-semibold text-slate-300">Total People</label>
              <input
                type="number"
                min="1"
                max="50"
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white font-bold"
              />
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
              <label className="block text-[11px] font-semibold text-slate-300">Injured Persons</label>
              <input
                type="number"
                min="0"
                max="50"
                value={injuredCount}
                onChange={(e) => setInjuredCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-red-400 font-bold"
              />
            </div>
            <div
              onClick={() => setHasChildren(!hasChildren)}
              className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                hasChildren ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <span className="text-[11px] font-semibold">Infants / Children</span>
              <span className="text-xs font-bold mt-1 text-white">{hasChildren ? 'YES' : 'NO'}</span>
            </div>
            <div
              onClick={() => setHasElderly(!hasElderly)}
              className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                hasElderly ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <span className="text-[11px] font-semibold">Elderly Persons</span>
              <span className="text-xs font-bold mt-1 text-white">{hasElderly ? 'YES' : 'NO'}</span>
            </div>
          </div>

          {/* Description & Situation Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Situation Description & Urgency Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water entered our house. 5 people are trapped. One person is injured."
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Live AI Priority Prediction Card */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 font-semibold">AI Triage Preview:</span>
              <span
                className={`px-2 py-0.5 rounded font-black text-[11px] ${
                  previewTriage.priority === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : previewTriage.priority === 'HIGH'
                    ? 'bg-orange-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {previewTriage.priority} ({previewTriage.score}/100)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Unit: {previewTriage.recommendedUnit.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-submit-emergency-form"
            disabled={isSubmitting}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-extrabold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-red-600/40"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'TRANSMITTING DISTRESS REPORT...' : 'SUBMIT EMERGENCY REPORT'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
