import React, { useState, useEffect } from 'react';
import {
  Menu,
  Smartphone,
  LayoutDashboard,
  Globe,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentMode: 'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP';
  setCurrentMode: (mode: 'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP') => void;
  selectedDistrict?: any;
  onOpenDistrictModal?: () => void;
  activeCriticalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  currentMode,
  setCurrentMode,
  activeCriticalCount,
}) => {
  const [timeString, setTimeString] = useState<string>('00:00:00 IST');

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
      setTimeString(`${istTime} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/90 shadow-2xl text-white">
      <div className="w-full px-3 sm:px-5">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Sidebar Toggle + Brand Logo + District Selector */}
          <div className="flex items-center space-x-2.5">
            {/* Sidebar Toggle Button with Open/Close status */}
            <button
              id="navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-tactical font-bold transition-all ${
                isSidebarOpen
                  ? 'bg-sky-950/80 text-sky-300 border-sky-600/60 shadow-sm'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/80'
              }`}
              title={isSidebarOpen ? 'Close / Hide Sidebar' : 'Open Sidebar Navigation'}
            >
              <Menu className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline text-[11px]">
                {isSidebarOpen ? 'MENU [HIDE]' : 'MENU [OPEN]'}
              </span>
            </button>

            {/* Brand Logo & Name */}
            <div
              onClick={() => setCurrentMode('NATIONAL_PORTAL')}
              className="flex items-center space-x-2.5 cursor-pointer select-none group"
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-900 border border-sky-500/40 shadow-lg shadow-sky-600/30 flex items-center justify-center p-0.5 group-hover:border-sky-400 transition-all flex-shrink-0">
                <img
                  src="https://i.ibb.co/0V1sbjrr/Chat-GPT-Image-Sep-21-2026-02-05-10-PM.png"
                  alt="RESQNET Logo"
                  className="w-full h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-tactical font-black text-base sm:text-lg tracking-wider text-white group-hover:text-sky-400 transition-colors leading-none">
                  RESQNET
                </span>
                <span className="text-[9px] font-mono tracking-wider text-sky-400/90 font-bold uppercase leading-tight mt-0.5 hidden xs:inline">
                  DISASTER INTEL
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Fast Home / Command Center Toggle */}
            <button
              id="navbar-btn-home"
              onClick={() => setCurrentMode('NATIONAL_PORTAL')}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentMode === 'NATIONAL_PORTAL'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>

            <button
              id="navbar-btn-command"
              onClick={() => setCurrentMode('COMMAND_CENTER')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentMode === 'COMMAND_CENTER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Command</span>
              {activeCriticalCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-tactical font-black animate-pulse">
                  {activeCriticalCount}
                </span>
              )}
            </button>

            {/* Primary Citizen SOS Button */}
            <button
              id="navbar-btn-sos"
              onClick={() => setCurrentMode('CITIZEN_APP')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-red-600/40 ring-1 ring-red-400 animate-pulse font-tactical"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>🚨 SOS</span>
            </button>

            {/* REAL INDIAN TIME (IST) */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-tactical font-bold text-xs tracking-wider text-emerald-300">
                {timeString}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
