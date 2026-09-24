import React from 'react';
import {
  Globe,
  LayoutDashboard,
  Smartphone,
  MapPin,
  ListOrdered,
  Plane,
  Package,
  Waves,
  PhoneCall,
  Wifi,
  WifiOff,
  ChevronRight,
  X,
  Radio,
  AlertTriangle,
  Shield,
  Layers,
} from 'lucide-react';
import { DisasterDistrict } from './DistrictPlaceModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP';
  setCurrentMode: (mode: 'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP') => void;
  activeCommandTab: 'MAP' | 'QUEUE' | 'DRONE' | 'RESOURCES';
  setActiveCommandTab: (tab: 'MAP' | 'QUEUE' | 'DRONE' | 'RESOURCES') => void;
  selectedDistrict?: any;
  onOpenDistrictModal?: () => void;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (offline: boolean) => void;
  offlineQueueCount: number;
  criticalCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentMode,
  setCurrentMode,
  activeCommandTab,
  setActiveCommandTab,
  isSimulatedOffline,
  setIsSimulatedOffline,
  offlineQueueCount,
  criticalCount,
}) => {
  const handleModeSelect = (mode: 'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP') => {
    setCurrentMode(mode);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleTabSelect = (tab: 'MAP' | 'QUEUE' | 'DRONE' | 'RESOURCES') => {
    setCurrentMode('COMMAND_CENTER');
    setActiveCommandTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950/95 border-r border-slate-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out backdrop-blur-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Close / Collapse Button */}
        <div className="h-16 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div
            onClick={() => handleModeSelect('NATIONAL_PORTAL')}
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-sky-500/40 shadow-lg shadow-sky-600/30 flex items-center justify-center p-0.5 group-hover:border-sky-400 transition-all flex-shrink-0">
              <img
                src="https://i.ibb.co/0V1sbjrr/Chat-GPT-Image-Sep-21-2026-02-05-10-PM.png"
                alt="RESQNET Logo"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-tactical font-black text-lg tracking-wider text-white group-hover:text-sky-400 transition-colors leading-none">
                  RESQNET
                </span>
                <span className="text-[9px] font-tactical px-1.5 py-0.2 rounded font-black bg-red-950/80 text-red-400 border border-red-800/80">
                  SEOC INDIA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5">
                Disaster Ops &bull; Kerala Basin
              </p>
            </div>
          </div>

          <button
            id="sidebar-btn-collapse"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors"
            title="Collapse Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Modes (Home, Command Center, Citizen SOS) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              MAIN SYSTEMS
            </div>
            <div className="space-y-1">
              {/* 1. HOME PORTAL */}
              <button
                id="sidebar-btn-home"
                onClick={() => handleModeSelect('NATIONAL_PORTAL')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentMode === 'NATIONAL_PORTAL'
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Globe className="w-4 h-4 text-sky-300" />
                  <span>National Home Portal</span>
                </div>
                {currentMode === 'NATIONAL_PORTAL' && (
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                )}
              </button>

              {/* 2. COMMAND CENTER */}
              <button
                id="sidebar-btn-command"
                onClick={() => handleModeSelect('COMMAND_CENTER')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  currentMode === 'COMMAND_CENTER'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <LayoutDashboard className="w-4 h-4 text-blue-300" />
                  <span>Command Center</span>
                </div>
                {criticalCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black animate-pulse">
                    {criticalCount} RED
                  </span>
                )}
              </button>

              {/* 3. CITIZEN SOS */}
              <button
                id="sidebar-btn-sos"
                onClick={() => handleModeSelect('CITIZEN_APP')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                  currentMode === 'CITIZEN_APP'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400'
                    : 'bg-red-950/40 text-red-300 border border-red-900/60 hover:bg-red-900/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Smartphone className="w-4 h-4 text-red-400 animate-bounce" />
                  <span>🚨 CITIZEN SOS (I Need Help)</span>
                </div>
                {offlineQueueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                    {offlineQueueCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sub-tools of Command Center */}
          <div>
            <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              DISASTER GEOSPATIAL TOOLS
            </div>
            <div className="space-y-1">
              <button
                id="sidebar-btn-tab-map"
                onClick={() => handleTabSelect('MAP')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentMode === 'COMMAND_CENTER' && activeCommandTab === 'MAP'
                    ? 'bg-slate-800 text-sky-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Live Google Map & Satellite</span>
              </button>

              <button
                id="sidebar-btn-tab-queue"
                onClick={() => handleTabSelect('QUEUE')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentMode === 'COMMAND_CENTER' && activeCommandTab === 'QUEUE'
                    ? 'bg-slate-800 text-amber-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <ListOrdered className="w-4 h-4 text-amber-400" />
                <span>Priority Triage Queue</span>
              </button>

              <button
                id="sidebar-btn-tab-drone"
                onClick={() => handleTabSelect('DRONE')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentMode === 'COMMAND_CENTER' && activeCommandTab === 'DRONE'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Plane className="w-4 h-4 text-cyan-400" />
                <span>Drone Aerial Surveillance</span>
              </button>

              <button
                id="sidebar-btn-tab-resources"
                onClick={() => handleTabSelect('RESOURCES')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentMode === 'COMMAND_CENTER' && activeCommandTab === 'RESOURCES'
                    ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Depots, Boats & Logistics</span>
              </button>
            </div>
          </div>

          {/* Quick Helplines */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center space-x-1">
              <PhoneCall className="w-3 h-3 text-red-400" />
              <span>EMERGENCY HELPLINES</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <a
                href="tel:112"
                className="p-1.5 bg-slate-900 hover:bg-red-900/40 border border-slate-700/60 rounded-lg text-white font-bold text-center block transition-colors"
              >
                112 <span className="text-[9px] text-slate-400 block font-sans">National SOS</span>
              </a>
              <a
                href="tel:1077"
                className="p-1.5 bg-slate-900 hover:bg-sky-900/40 border border-slate-700/60 rounded-lg text-white font-bold text-center block transition-colors"
              >
                1077 <span className="text-[9px] text-slate-400 block font-sans">District Control</span>
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Offline Simulator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Connectivity:</span>
            <button
              id="sidebar-toggle-offline"
              onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                isSimulatedOffline
                  ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Online Connected</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
