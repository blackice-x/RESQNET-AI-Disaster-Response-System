import React, { useState } from 'react';
import {
  X,
  Play,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Sparkles,
  CloudSun,
  MapPin,
  RefreshCw,
  Layers,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
} from 'lucide-react';
import { AccuWeatherPlaygroundResult } from '../types';

interface AccuWeatherPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLocation?: (locationKey: string, locationName: string) => void;
}

interface PresetOption {
  id: string;
  title: string;
  description: string;
  method: 'GET';
  endpoint: string;
  queryParams?: Record<string, string>;
  category: 'forecast' | 'search' | 'current';
}

const PRESET_QUICKSTARTS: PresetOption[] = [
  {
    id: 'nyc-5day',
    title: '5-Day Daily Forecast (NYC: 349727)',
    description: 'AccuWeather Quick-Start step 1: 5-Day forecast for New York City (Key 349727)',
    method: 'GET',
    endpoint: '/forecasts/v1/daily/5day/349727',
    queryParams: { metric: 'true' },
    category: 'forecast',
  },
  {
    id: 'city-search-nyc',
    title: 'City Search ("New York City")',
    description: 'AccuWeather Quick-Start step 2: City search endpoint to find location codes',
    method: 'GET',
    endpoint: '/locations/v1/cities/search/',
    queryParams: { q: 'New York City' },
    category: 'search',
  },
  {
    id: 'kochi-5day',
    title: '5-Day Daily Forecast (Kochi / Kerala: 204289)',
    description: 'Operational disaster sector: 5-Day forecast for Kochi / Periyar basin',
    method: 'GET',
    endpoint: '/forecasts/v1/daily/5day/204289',
    queryParams: { metric: 'true' },
    category: 'forecast',
  },
  {
    id: 'city-search-kerala',
    title: 'City Search ("Kochi")',
    description: 'Find Kerala rescue sector location codes and GPS coordinates',
    method: 'GET',
    endpoint: '/locations/v1/cities/search/',
    queryParams: { q: 'Kochi' },
    category: 'search',
  },
  {
    id: 'current-nyc',
    title: 'Current Conditions (NYC: 349727)',
    description: 'Real-time observation: temperature, RealFeel, humidity, and weather phrase',
    method: 'GET',
    endpoint: '/currentconditions/v1/349727',
    queryParams: { details: 'true' },
    category: 'current',
  },
];

export const AccuWeatherPlaygroundModal: React.FC<AccuWeatherPlaygroundModalProps> = ({
  isOpen,
  onClose,
  onApplyLocation,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('nyc-5day');
  const [endpoint, setEndpoint] = useState<string>('/forecasts/v1/daily/5day/349727');
  const [method, setMethod] = useState<string>('GET');
  const [queryParamsText, setQueryParamsText] = useState<string>('{\n  "metric": "true"\n}');
  const [searchCityQuery, setSearchCityQuery] = useState<string>('New York City');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AccuWeatherPlaygroundResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'docs'>('visual');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetOption) => {
    setSelectedPresetId(preset.id);
    setEndpoint(preset.endpoint);
    setMethod(preset.method);
    if (preset.queryParams) {
      setQueryParamsText(JSON.stringify(preset.queryParams, null, 2));
      if (preset.queryParams.q) {
        setSearchCityQuery(preset.queryParams.q);
      }
    } else {
      setQueryParamsText('{}');
    }
  };

  const handleExecuteRequest = async (overrideEndpoint?: string, overrideParams?: Record<string, string>) => {
    setIsLoading(true);
    setErrorText(null);

    let parsedParams: Record<string, string> = {};
    if (overrideParams) {
      parsedParams = overrideParams;
    } else {
      try {
        parsedParams = JSON.parse(queryParamsText || '{}');
      } catch {
        setErrorText('Invalid JSON in query parameters field');
        setIsLoading(false);
        return;
      }
    }

    const targetEndpoint = overrideEndpoint || endpoint;

    try {
      const resp = await fetch('/api/weather/test-console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          method,
          queryParams: parsedParams,
        }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || `HTTP ${resp.status}`);
      }
      setResult(json);
      setActiveTab('visual');
    } catch (err: any) {
      setErrorText(err.message || 'Failed to execute AccuWeather API call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result?.data) return;
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xl font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  AccuWeather Core Weather API Console
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Zuplo Gateway
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Key Active: zpka_589...
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Execute live calls to 5-Day Daily Forecast and City Search endpoints with real server authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader: Preset Selectors (matching documentation quickstart) */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick-Start Presets:
          </span>
          {PRESET_QUICKSTARTS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{p.category === 'forecast' ? '📅' : p.category === 'search' ? '🔍' : '🌡️'}</span>
                <span>{p.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick-Start OpenPlaygroundButton Component Representation */}
          <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-sky-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-sky-700 text-white font-bold uppercase tracking-wider">
                  {method}
                </span>
                <span className="font-semibold text-slate-800 break-all">{endpoint}</span>
              </div>
              <p className="text-xs text-slate-600">
                Server: <code className="bg-white/80 px-1 py-0.5 rounded text-sky-900 font-mono">dataservice.accuweather.com</code> &bull; Auth: Bearer / query apikey
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExecuteRequest()}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-sky-600/20 flex items-center space-x-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                <span>{isLoading ? 'Calling Zuplo API...' : 'Run in Playground'}</span>
              </button>
            </div>
          </div>

          {/* Request Customization Accordion */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                API Endpoint Path
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-sky-500">
                <span className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-mono border-r border-slate-200 flex items-center font-bold">
                  GET
                </span>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/forecasts/v1/daily/5day/349727"
                  className="w-full px-3 py-2 text-xs font-mono outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Quick City Lookup
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  value={searchCityQuery}
                  onChange={(e) => setSearchCityQuery(e.target.value)}
                  placeholder="e.g. New York City, Kochi"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={() => {
                    setEndpoint('/locations/v1/cities/search/');
                    setQueryParamsText(JSON.stringify({ q: searchCityQuery }, null, 2));
                    handleExecuteRequest('/locations/v1/cities/search/', { q: searchCityQuery });
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {errorText && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Results Console */}
          {result && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md">
              {/* Result Meta Bar */}
              <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                      result.status === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {result.status} {result.statusText || 'OK'}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Latency: {result.durationMs}ms
                  </span>
                  {result.headline && (
                    <span className="text-xs text-amber-300 font-medium truncate max-w-md hidden sm:inline">
                      📢 {result.headline}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-800 rounded-xl p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setActiveTab('visual')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        activeTab === 'visual' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Visual Cards
                    </button>
                    <button
                      onClick={() => setActiveTab('json')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        activeTab === 'json' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Raw JSON
                    </button>
                  </div>

                  <button
                    onClick={handleCopyJson}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center space-x-1"
                    title="Copy JSON Response"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Visual Render Tab */}
              {activeTab === 'visual' && (
                <div className="p-5 space-y-4 bg-slate-50/50">
                  {/* Headline Notice */}
                  {result.headline && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <span className="font-bold uppercase tracking-wider block text-amber-800 mb-0.5">
                        AccuWeather Headline Advisory:
                      </span>
                      <p className="text-amber-950 font-medium">{result.headline}</p>
                    </div>
                  )}

                  {/* 1. 5-Day Daily Forecast Display */}
                  {Array.isArray(result.data?.DailyForecasts) && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          AccuWeather 5-Day Daily Forecast Cards (metric °C)
                        </span>
                        {onApplyLocation && (
                          <button
                            onClick={() => onApplyLocation(endpoint.split('/').pop() || '349727', 'Selected Location')}
                            className="text-xs text-sky-600 font-bold hover:underline"
                          >
                            Apply this Forecast to Disaster Dashboard →
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {result.data.DailyForecasts.map((day: any, idx: number) => {
                          const date = new Date(day.Date || day.EpochDate * 1000);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          const maxT = Math.round(day.Temperature?.Maximum?.Value ?? 0);
                          const minT = Math.round(day.Temperature?.Minimum?.Value ?? 0);
                          const phrase = day.Day?.IconPhrase || 'Fair';
                          const rain = day.Day?.PrecipitationProbability ?? (day.Day?.HasPrecipitation ? 75 : 15);

                          return (
                            <div
                              key={idx}
                              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{dayName}</span>
                                <div className="my-2 text-center">
                                  <span className="text-3xl">
                                    {phrase.toLowerCase().includes('rain') ? '🌧️' : phrase.toLowerCase().includes('cloud') ? '⛅' : '☀️'}
                                  </span>
                                  <p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-2">
                                    {phrase}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-900 font-black">{maxT}°</span>
                                <span className="text-slate-400">{minT}°C</span>
                                <span className="text-sky-600 font-bold">{rain}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. City Search List Display */}
                  {Array.isArray(result.data) && result.data[0]?.Key && result.data[0]?.LocalizedName && (
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                        Matching AccuWeather Locations ({result.data.length} found)
                      </span>

                      <div className="space-y-2">
                        {result.data.map((city: any) => (
                          <div
                            key={city.Key}
                            className="bg-white rounded-xl p-3.5 border border-slate-200 flex flex-wrap items-center justify-between gap-3 hover:border-sky-300 transition-colors shadow-sm"
                          >
                            <div className="flex items-center space-x-3">
                              <MapPin className="w-5 h-5 text-sky-600 shrink-0" />
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {city.LocalizedName},{' '}
                                  <span className="text-slate-600 font-medium">
                                    {city.AdministrativeArea?.LocalizedName}, {city.Country?.LocalizedName}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  Location Key: <span className="font-bold text-slate-700">{city.Key}</span> &bull; Type: {city.Type}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const newEndpoint = `/forecasts/v1/daily/5day/${city.Key}`;
                                  setEndpoint(newEndpoint);
                                  handleExecuteRequest(newEndpoint, { metric: 'true' });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors"
                              >
                                View 5-Day Forecast
                              </button>

                              {onApplyLocation && (
                                <button
                                  onClick={() => onApplyLocation(city.Key, city.LocalizedName)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors"
                                >
                                  Select City
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Current Conditions Display */}
                  {Array.isArray(result.data) && result.data[0]?.WeatherText && result.data[0]?.Temperature && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Live Observation
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 mt-1">
                            {result.data[0].WeatherText}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-black text-slate-900">
                            {result.data[0].Temperature?.Metric?.Value}°C
                          </span>
                          <p className="text-xs text-slate-500 font-medium">
                            RealFeel: {result.data[0].RealFeelTemperature?.Metric?.Value ?? '--'}°C
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold">Relative Humidity:</span>
                          <p className="font-bold text-slate-800">{result.data[0].RelativeHumidity}%</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">UV Index:</span>
                          <p className="font-bold text-slate-800">{result.data[0].UVIndex} ({result.data[0].UVIndexText})</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">Has Precipitation:</span>
                          <p className="font-bold text-slate-800">{result.data[0].HasPrecipitation ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Raw JSON Tab */}
              {activeTab === 'json' && (
                <div className="p-4 bg-slate-950 font-mono text-xs text-emerald-400 max-h-96 overflow-y-auto">
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>Core Weather API Powered by Zuplo Edge</span>
            <span>&bull;</span>
            <span>AccuWeather Data Services</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
