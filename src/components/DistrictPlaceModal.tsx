import React, { useState } from 'react';
import {
  MapPin,
  AlertTriangle,
  Waves,
  Mountain,
  Wind,
  CheckCircle2,
  X,
  Search,
  Navigation,
  ExternalLink,
} from 'lucide-react';

export interface DisasterDistrict {
  id: string;
  name: string;
  subDistrict: string;
  state: string;
  alertLevel: 'RED_CRITICAL' | 'ORANGE_WARNING' | 'YELLOW_WATCH' | 'NORMAL';
  alertTitle: string;
  coordinates: { lat: number; lng: number };
  weatherSummary: string;
  temperature: number;
  waterGaugeLevel?: string;
  activeIncidentsCount: number;
  sheltersCount: number;
  ndrfBattalions: string;
}

export const DISASTER_DISTRICTS: DisasterDistrict[] = [
  {
    id: 'aluva-ernakulam',
    name: 'Aluva / Ernakulam',
    subDistrict: 'Periyar River Basin & Marthanda Varma Sector',
    state: 'Kerala',
    alertLevel: 'RED_CRITICAL',
    alertTitle: 'Severe Flood Inundation & Dam Gate Surge',
    coordinates: { lat: 10.087873, lng: 76.35408 },
    weatherSummary: '28.1°C • 82% Humidity • 0.20 mm Rain',
    temperature: 28.1,
    waterGaugeLevel: 'Periyar: 8.4m (+1.2m above Danger)',
    activeIncidentsCount: 7,
    sheltersCount: 14,
    ndrfBattalions: '4th & 10th NDRF Boat Battalions',
  },
  {
    id: 'meppadi-wayanad',
    name: 'Meppadi / Wayanad',
    subDistrict: 'Chooralmala & Mundakkai Hill Range',
    state: 'Kerala',
    alertLevel: 'RED_CRITICAL',
    alertTitle: 'Active Landslide & Slope Instability Warning',
    coordinates: { lat: 11.5541, lng: 76.1264 },
    weatherSummary: '22.4°C • Heavy Downpour 34mm/hr',
    temperature: 22.4,
    waterGaugeLevel: 'Chaliyar Upstream: High Runoff',
    activeIncidentsCount: 5,
    sheltersCount: 9,
    ndrfBattalions: 'Indian Army Madras Regt & NDRF 12 Bn',
  },
  {
    id: 'cheruthoni-idukki',
    name: 'Cheruthoni / Idukki',
    subDistrict: 'Idukki Dam Catchment & High Ranges',
    state: 'Kerala',
    alertLevel: 'ORANGE_WARNING',
    alertTitle: '3 Dam Spillway Shutters Raised (25,000 cusecs)',
    coordinates: { lat: 9.851, lng: 76.974 },
    weatherSummary: '19.8°C • Mountain Fog & Rain',
    temperature: 19.8,
    waterGaugeLevel: 'Reservoir: 732.4m (Full: 730m)',
    activeIncidentsCount: 3,
    sheltersCount: 6,
    ndrfBattalions: 'Kerala Fire & Rescue Disaster Wing',
  },
  {
    id: 'chalakudy-thrissur',
    name: 'Chalakudy / Thrissur',
    subDistrict: 'Chalakudy River Lowland Floodplain',
    state: 'Kerala',
    alertLevel: 'ORANGE_WARNING',
    alertTitle: 'River Rising Near Marathakkara Embankment',
    coordinates: { lat: 10.302, lng: 76.331 },
    weatherSummary: '27.5°C • Thunderstorms Expected • 14.2 mm Rain',
    temperature: 27.5,
    waterGaugeLevel: 'Gauge: 5.2m (Danger: 5.0m)',
    activeIncidentsCount: 4,
    sheltersCount: 8,
    ndrfBattalions: 'State Police SDRF Unit & Coastal Police',
  },
  {
    id: 'kuttanad-alappuzha',
    name: 'Kuttanad / Alappuzha',
    subDistrict: 'Below Sea-Level Polders & Vembanad Lake',
    state: 'Kerala',
    alertLevel: 'ORANGE_WARNING',
    alertTitle: 'Backwater Inundation & Polder Breaching Risk',
    coordinates: { lat: 9.4215, lng: 76.4682 },
    weatherSummary: '26.8°C • 91% Humidity • Continuous Drizzle',
    temperature: 26.8,
    waterGaugeLevel: 'Vembanad Inundation: +0.65m MSL',
    activeIncidentsCount: 6,
    sheltersCount: 16,
    ndrfBattalions: '4th NDRF Water Rescue Detachment',
  },
  {
    id: 'ranni-pathanamthitta',
    name: 'Ranni / Pathanamthitta',
    subDistrict: 'Pamba River Basin & Sabarimala Foothills',
    state: 'Kerala',
    alertLevel: 'ORANGE_WARNING',
    alertTitle: 'Pamba River Flood Watch & Dam Water Discharge',
    coordinates: { lat: 9.3812, lng: 76.7865 },
    weatherSummary: '25.0°C • 88% Humidity • Rain Bands Moving In',
    temperature: 25.0,
    waterGaugeLevel: 'Pamba River: 6.8m (Warning: 6.5m)',
    activeIncidentsCount: 3,
    sheltersCount: 7,
    ndrfBattalions: 'Kerala Fire & Rescue Disaster Wing',
  },
  {
    id: 'mussoorie-dehradun',
    name: 'Mussoorie / Dehradun',
    subDistrict: 'Garhwal Foothills & Kempty Catchment',
    state: 'Uttarakhand',
    alertLevel: 'YELLOW_WATCH',
    alertTitle: 'Flash Flood & Cloudburst Advisory',
    coordinates: { lat: 30.4598, lng: 78.0644 },
    weatherSummary: '20.0°C • Light Drizzle & Mountain Mist',
    temperature: 20.0,
    waterGaugeLevel: 'Mountain Streams: Rapid Flow',
    activeIncidentsCount: 1,
    sheltersCount: 4,
    ndrfBattalions: 'SDRF Uttarakhand Quick Reaction Team',
  },
  {
    id: 'kaziranga-assam',
    name: 'Kaziranga & Guwahati',
    subDistrict: 'Brahmaputra Major Floodplain & Lowland Sector',
    state: 'Assam',
    alertLevel: 'ORANGE_WARNING',
    alertTitle: 'Brahmaputra Flowing Above Danger Mark at Neamatighat',
    coordinates: { lat: 26.5775, lng: 93.1711 },
    weatherSummary: '29.2°C • 86% Humidity • Tropical Downpour',
    temperature: 29.2,
    waterGaugeLevel: 'Brahmaputra: 85.2m (+0.8m Above Danger)',
    activeIncidentsCount: 4,
    sheltersCount: 11,
    ndrfBattalions: '1st Battalion NDRF Patgaon Guwahati',
  },
  {
    id: 'delhi-ncr',
    name: 'National Capital Region',
    subDistrict: 'Yamuna Floodplain & Central Delhi',
    state: 'Delhi NCR',
    alertLevel: 'NORMAL',
    alertTitle: 'Yamuna Water Level Normal • AQI Monitoring',
    coordinates: { lat: 28.6139, lng: 77.209 },
    weatherSummary: '32.0°C • Overcast • AQI 168',
    temperature: 32.0,
    waterGaugeLevel: 'Old Railway Bridge: 204.2m (Normal)',
    activeIncidentsCount: 0,
    sheltersCount: 12,
    ndrfBattalions: '8th NDRF Ghaziabad Command Base',
  },
];

interface DistrictPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDistrictId: string;
  onSelectDistrict: (district: DisasterDistrict) => void;
  onCustomGpsRequest?: () => void;
}

export const DistrictPlaceModal: React.FC<DistrictPlaceModalProps> = ({
  isOpen,
  onClose,
  selectedDistrictId,
  onSelectDistrict,
  onCustomGpsRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredDistricts = DISASTER_DISTRICTS.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.subDistrict.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Select Disaster Operational Sector & District
              </h2>
              <p className="text-xs text-slate-400">
                Choose your active region to load localized alerts, water gauges, and dispatch units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & GPS Detect Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search district, town, or river basin (e.g. Aluva, Wayanad, Idukki)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {onCustomGpsRequest && (
            <button
              onClick={() => {
                onCustomGpsRequest();
                onClose();
              }}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Detect My GPS</span>
            </button>
          )}
        </div>

        {/* District Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {filteredDistricts.map((district) => {
            const isSelected = district.id === selectedDistrictId;
            const isRed = district.alertLevel === 'RED_CRITICAL';
            const isOrange = district.alertLevel === 'ORANGE_WARNING';

            return (
              <div
                key={district.id}
                onClick={() => {
                  onSelectDistrict(district);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{district.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                      {district.state}
                    </span>
                    {isRed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse">
                        RED ALERT
                      </span>
                    )}
                    {isOrange && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-600/30 text-amber-400 border border-amber-500/50">
                        ORANGE ALERT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{district.subDistrict}</p>
                  <p className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>{district.alertTitle}</span>
                    {district.waterGaugeLevel && (
                      <span className="text-sky-400 font-mono">• {district.waterGaugeLevel}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-3 text-right">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-mono font-bold text-slate-200">
                      {district.weatherSummary}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {district.sheltersCount} Relief Camps &bull; {district.activeIncidentsCount} Active SOS
                    </div>
                  </div>

                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Active Sector' : 'Switch Here'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Click any sector to synchronize telemetry, map coordinates, and early warnings.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-300 hover:text-white font-medium hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
