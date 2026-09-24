import React, { useState, useEffect, useCallback } from 'react';
import {
  EmergencyReport,
  RescueTeam,
  ResourceInventory,
  LandmarkFacility,
  DroneHazardDetection,
  IncidentStatus,
} from './types';
import {
  KERALA_FLOOD_10_REPORTS,
  INITIAL_RESCUE_TEAMS,
  INITIAL_RESOURCES,
  INITIAL_LANDMARKS,
} from './data/mockData';
import { calculateRuleBasedPriority } from './utils/triage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DistrictPlaceModal, DISASTER_DISTRICTS, DisasterDistrict } from './components/DistrictPlaceModal';
import { NationalHomeView } from './components/NationalHomeView';
import { LiveDisasterMap } from './components/LiveDisasterMap';
import { IncidentDispatchModal } from './components/IncidentDispatchModal';
import { DroneSurveillance } from './components/DroneSurveillance';
import { CitizenPortal } from './components/CitizenPortal';
import { ResourceManagement } from './components/ResourceManagement';
import { EmergencyQueue } from './components/EmergencyQueue';
import { MobileDroneTransmitterScreen } from './components/MobileDroneTransmitterScreen';

import {
  MapPin,
  Flame,
  Radio,
  Package,
  Plane,
  ListOrdered,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Main Navigation Modes
  const [currentMode, setCurrentMode] = useState<'NATIONAL_PORTAL' | 'COMMAND_CENTER' | 'CITIZEN_APP'>('NATIONAL_PORTAL');

  // Command Center Sub-tabs
  const [activeCommandTab, setActiveCommandTab] = useState<'MAP' | 'QUEUE' | 'DRONE' | 'RESOURCES'>('MAP');

  // Core Data State
  const [incidents, setIncidents] = useState<EmergencyReport[]>(KERALA_FLOOD_10_REPORTS);
  const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>(INITIAL_RESCUE_TEAMS);
  const [resources, setResources] = useState<ResourceInventory>(INITIAL_RESOURCES);
  const [landmarks, setLandmarks] = useState<LandmarkFacility[]>(INITIAL_LANDMARKS);

  // Selection & Modals
  const [selectedIncident, setSelectedIncident] = useState<EmergencyReport | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DisasterDistrict>(DISASTER_DISTRICTS[0]);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState<boolean>(false);

  // Mobile Drone Camera Transmitter View check (from QR scan on phone)
  const [isDroneTransmitterActive, setIsDroneTransmitterActive] = useState<boolean>(() => {
    return window.location.search.includes('drone_transmitter=true');
  });

  // Network Simulation & Offline Queue
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<Partial<EmergencyReport>[]>(() => {
    try {
      const saved = localStorage.getItem('resqnet_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save offline queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('resqnet_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [offlineQueue]);

  // Fetch initial data from server if online
  const fetchData = useCallback(async () => {
    if (isSimulatedOffline) return;
    try {
      const [incRes, teamsRes, resRes, landRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/rescue-teams'),
        fetch('/api/resources'),
        fetch('/api/landmarks'),
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(data);
      }
      if (teamsRes.ok) {
        const data = await teamsRes.json();
        setRescueTeams(data);
      }
      if (resRes.ok) {
        const data = await resRes.json();
        setResources(data);
      }
      if (landRes.ok) {
        const data = await landRes.json();
        setLandmarks(data);
      }
    } catch (err) {
      console.warn('Using local fallback state:', err);
    }
  }, [isSimulatedOffline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit new emergency incident (Citizen or Drone)
  const handleSubmitIncident = async (newIncidentData: Partial<EmergencyReport>): Promise<EmergencyReport> => {
    // If offline, store locally in queue
    if (isSimulatedOffline) {
      const fallbackTriage = calculateRuleBasedPriority({
        description: newIncidentData.description || 'Emergency SOS Distress Alert',
        peopleCount: newIncidentData.peopleCount,
        injuredCount: newIncidentData.injuredCount,
        hasChildren: newIncidentData.hasChildren,
        hasElderly: newIncidentData.hasElderly,
        isTrapped: newIncidentData.isTrapped,
        emergencyType: newIncidentData.emergencyType,
        floodWaterLevel: newIncidentData.floodWaterLevel,
      });
      const offlineItem: EmergencyReport = {
        id: `offline-${Date.now()}`,
        incidentCode: `SOS-${Math.floor(1000 + Math.random() * 9000)}`,
        title: newIncidentData.title || 'Offline Emergency Report',
        description: newIncidentData.description || 'Distress signal queued in offline mesh buffer.',
        locationName: newIncidentData.locationName || 'Kerala Flood Basin (GPS)',
        coordinates: newIncidentData.coordinates || { lat: 10.1118, lng: 76.3575 },
        peopleCount: newIncidentData.peopleCount || 1,
        injuredCount: newIncidentData.injuredCount || 0,
        hasChildren: Boolean(newIncidentData.hasChildren),
        hasElderly: Boolean(newIncidentData.hasElderly),
        isTrapped: Boolean(newIncidentData.isTrapped),
        emergencyType: newIncidentData.emergencyType || 'FLOOD_TRAPPED',
        floodWaterLevel: newIncidentData.floodWaterLevel || 'ROOFTOP',
        priority: fallbackTriage.priority,
        priorityScore: fallbackTriage.score,
        status: 'REPORTED',
        timestamp: Date.now(),
        aiAssessment: {
          confidence: 0.9,
          reasoning: fallbackTriage.reasoning,
          recommendedUnit: fallbackTriage.recommendedUnit,
          recommendedSupplies: fallbackTriage.recommendedSupplies,
        },
        victimName: newIncidentData.victimName,
        contactNumber: newIncidentData.contactNumber,
        isOfflineSynced: true,
      };

      setOfflineQueue((prev) => [offlineItem, ...prev]);
      setIncidents((prev) => [offlineItem, ...prev]);
      return offlineItem;
    }

    // If online, POST to backend with AI classification
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIncidentData),
      });
      if (res.ok) {
        const created: EmergencyReport = await res.json();
        setIncidents((prev) => [created, ...prev]);
        return created;
      }
    } catch (e) {
      console.warn('Network call failed, falling back to local creation:', e);
    }

    // Local fallback creation
    const fallbackTriage = calculateRuleBasedPriority({
      description: newIncidentData.description || 'Emergency alert received.',
      peopleCount: newIncidentData.peopleCount,
      injuredCount: newIncidentData.injuredCount,
      hasChildren: newIncidentData.hasChildren,
      hasElderly: newIncidentData.hasElderly,
      isTrapped: newIncidentData.isTrapped,
      emergencyType: newIncidentData.emergencyType,
      floodWaterLevel: newIncidentData.floodWaterLevel,
    });
    const localItem: EmergencyReport = {
      id: `inc-${Date.now()}`,
      incidentCode: `SOS-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newIncidentData.title || 'Emergency Report',
      description: newIncidentData.description || 'Emergency alert received.',
      locationName: newIncidentData.locationName || 'Kerala Flood Basin',
      coordinates: newIncidentData.coordinates || { lat: 10.1118, lng: 76.3575 },
      peopleCount: newIncidentData.peopleCount || 1,
      injuredCount: newIncidentData.injuredCount || 0,
      hasChildren: Boolean(newIncidentData.hasChildren),
      hasElderly: Boolean(newIncidentData.hasElderly),
      isTrapped: Boolean(newIncidentData.isTrapped),
      emergencyType: newIncidentData.emergencyType || 'FLOOD_TRAPPED',
      floodWaterLevel: newIncidentData.floodWaterLevel || 'ROOFTOP',
      priority: fallbackTriage.priority,
      priorityScore: fallbackTriage.score,
      status: 'REPORTED',
      timestamp: Date.now(),
      aiAssessment: {
        confidence: 0.92,
        reasoning: fallbackTriage.reasoning,
        recommendedUnit: fallbackTriage.recommendedUnit,
        recommendedSupplies: fallbackTriage.recommendedSupplies,
      },
      victimName: newIncidentData.victimName,
      contactNumber: newIncidentData.contactNumber,
    };
    setIncidents((prev) => [localItem, ...prev]);
    return localItem;
  };

  // Sync Offline Queue
  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setIsSimulatedOffline(false);

    for (const item of offlineQueue) {
      try {
        await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch (e) {
        console.error('Failed to sync item:', item, e);
      }
    }

    setOfflineQueue([]);
    localStorage.removeItem('resqnet_offline_queue');
    await fetchData();
  };

  // Dispatch Team to Incident
  const handleDispatchTeam = async (
    incidentId: string,
    teamId: string,
    etaMinutes: number,
    supplies: { item: string; qty: number }[]
  ) => {
    try {
      if (!isSimulatedOffline) {
        await fetch(`/api/incidents/${incidentId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, etaMinutes, supplies }),
        });
      }
    } catch (e) {
      console.warn('Dispatch API fallback:', e);
    }

    // Update state locally
    const team = rescueTeams.find((t) => t.id === teamId);
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'DISPATCHED',
              assignedTeamId: teamId,
              assignedTeamName: team ? team.name : 'NDRF Unit',
              dispatchEtaMinutes: etaMinutes,
            }
          : inc
      )
    );

    setRescueTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              status: 'DISPATCHED',
              currentAssignment: {
                incidentId,
                incidentCode: incidents.find((i) => i.id === incidentId)?.incidentCode || 'INCIDENT',
                destinationName: incidents.find((i) => i.id === incidentId)?.locationName || 'Emergency Site',
                etaMinutes,
              },
            }
          : t
      )
    );

    // Deduct supplies if available
    setResources((prev) => {
      const next = { ...prev };
      supplies.forEach((supp) => {
        if (supp.item.toLowerCase().includes('boat') && next.rescueBoats.available > 0) {
          next.rescueBoats.available -= supp.qty;
        } else if (supp.item.toLowerCase().includes('kit') && next.medicalKits.available > 0) {
          next.medicalKits.available -= supp.qty;
        } else if (supp.item.toLowerCase().includes('water') && next.waterPacks.available > 0) {
          next.waterPacks.available -= supp.qty;
        } else if (supp.item.toLowerCase().includes('food') && next.foodPacks.available > 0) {
          next.foodPacks.available -= supp.qty;
        } else if (supp.item.toLowerCase().includes('jacket') && next.lifeJackets.available > 0) {
          next.lifeJackets.available -= supp.qty;
        }
      });
      return next;
    });

    // Update selected incident state if open
    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident((prev) =>
        prev
          ? {
              ...prev,
              status: 'DISPATCHED',
              assignedTeamId: teamId,
              assignedTeamName: team ? team.name : 'NDRF Unit',
              dispatchEtaMinutes: etaMinutes,
            }
          : null
      );
    }
  };

  // Update Incident Status (e.g. Rescued, Resolved)
  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: IncidentStatus) => {
    try {
      if (!isSimulatedOffline) {
        await fetch(`/api/incidents/${incidentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch (e) {
      console.warn('Status API fallback:', e);
    }

    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
    );

    // Free up assigned team if resolved/rescued
    const currentInc = incidents.find((i) => i.id === incidentId);
    if (currentInc && currentInc.assignedTeamId && (newStatus === 'RESCUED' || newStatus === 'RESOLVED')) {
      setRescueTeams((prev) =>
        prev.map((t) =>
          t.id === currentInc.assignedTeamId
            ? { ...t, status: 'AVAILABLE', currentAssignment: undefined }
            : t
        )
      );
    }

    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Restock Logistics Supplies
  const handleRestock = async (key: keyof ResourceInventory, amount: number) => {
    try {
      if (!isSimulatedOffline) {
        await fetch('/api/resources/restock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceKey: key, amount }),
        });
      }
    } catch (e) {
      console.warn('Restock API fallback:', e);
    }

    setResources((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        available: prev[key].available + amount,
        total: prev[key].total + amount,
      },
    }));
  };

  // Reset to default 10 Kerala Flood Reports scenario
  const handleResetKeralaDemo = async () => {
    try {
      await fetch('/api/reset-kerala-scenario', { method: 'POST' });
    } catch (e) {
      console.warn('Reset API fallback');
    }
    setIncidents(KERALA_FLOOD_10_REPORTS);
    setRescueTeams(INITIAL_RESCUE_TEAMS);
    setResources(INITIAL_RESOURCES);
    setLandmarks(INITIAL_LANDMARKS);
    setSelectedIncident(null);
    setSelectedTeam(null);
    setIsDispatchModalOpen(false);
  };

  // Create Incident from Drone Detection
  const handleCreateIncidentFromDrone = (detection: DroneHazardDetection) => {
    handleSubmitIncident({
      title: `Drone Target: ${detection.label}`,
      description: `Aerial optical/thermal detection by RESQ-DRONE 01: ${detection.details}. Detected occupants: ${detection.peopleDetected || 0}`,
      locationName: `Aluva Aerial Sector (${detection.coordinates.lat.toFixed(4)}, ${detection.coordinates.lng.toFixed(4)})`,
      coordinates: detection.coordinates,
      peopleCount: detection.peopleDetected || 2,
      injuredCount: detection.severity === 'CRITICAL' ? 1 : 0,
      isTrapped: detection.severity === 'CRITICAL',
      emergencyType: detection.severity === 'CRITICAL' ? 'FLOOD_TRAPPED' : 'ROAD_BLOCK',
      floodWaterLevel: detection.severity === 'CRITICAL' ? 'SURGING' : 'NONE',
    }).then((created) => {
      setSelectedIncident(created);
      setIsDispatchModalOpen(true);
      setActiveCommandTab('MAP');
    });
  };

  // Quick statistics for Priority Dashboard Banner
  const criticalCount = incidents.filter((i) => i.priority === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const highCount = incidents.filter((i) => i.priority === 'HIGH' && i.status !== 'RESOLVED').length;
  const mediumCount = incidents.filter((i) => i.priority === 'MEDIUM' && i.status !== 'RESOLVED').length;
  const lowCount = incidents.filter((i) => i.priority === 'LOW' && i.status !== 'RESOLVED').length;
  const dispatchedCount = incidents.filter((i) => i.status === 'DISPATCHED' || i.status === 'IN_PROGRESS').length;
  const rescuedCount = incidents.filter((i) => i.status === 'RESCUED').length;

  // House A incident for Demo walkthrough
  const houseA = incidents.find((i) => i.id === 'inc-1042') || incidents[0];

  // If in Mobile Phone Camera Transmitter mode (e.g. phone scanned QR code)
  if (isDroneTransmitterActive) {
    return (
      <MobileDroneTransmitterScreen
        onExit={() => {
          setIsDroneTransmitterActive(false);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Navigation Drawer Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        activeCommandTab={activeCommandTab}
        setActiveCommandTab={setActiveCommandTab}
        selectedDistrict={selectedDistrict}
        onOpenDistrictModal={() => setIsDistrictModalOpen(true)}
        isSimulatedOffline={isSimulatedOffline}
        setIsSimulatedOffline={setIsSimulatedOffline}
        offlineQueueCount={offlineQueue.length}
        criticalCount={criticalCount}
      />

      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        selectedDistrict={selectedDistrict}
        onOpenDistrictModal={() => setIsDistrictModalOpen(true)}
        activeCriticalCount={criticalCount}
      />

      {/* Main App Canvas */}
      <main className={`flex-1 w-full flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        {/* NATIONAL DISASTER PORTAL VIEW */}
        {currentMode === 'NATIONAL_PORTAL' ? (
          <NationalHomeView
            onNavigateToMap={() => {
              setCurrentMode('COMMAND_CENTER');
              setActiveCommandTab('MAP');
            }}
            onNavigateToCommandCenter={() => setCurrentMode('COMMAND_CENTER')}
            onNavigateToCitizenSOS={() => setCurrentMode('CITIZEN_APP')}
          />
        ) : currentMode === 'CITIZEN_APP' ? (
          /* CITIZEN PORTAL VIEW */
          <div className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1">
            <CitizenPortal
              isSimulatedOffline={isSimulatedOffline}
              setIsSimulatedOffline={setIsSimulatedOffline}
              onSubmitIncident={handleSubmitIncident}
              offlineQueue={offlineQueue}
              onSyncOfflineQueue={handleSyncOfflineQueue}
              onSwitchToCommandCenter={() => setCurrentMode('COMMAND_CENTER')}
            />
          </div>
        ) : (
          /* COMMAND CENTER VIEW */
          <div className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col space-y-4 flex-1">
            {/* Priority Triage Metrics Banner (Matching prompt: 🔴 CRITICAL 7, 🟠 HIGH 14, 🟡 MEDIUM 23, 🟢 LOW 31) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              <div
                onClick={() => {
                  setActiveCommandTab('QUEUE');
                }}
                className="p-3 bg-red-950/70 border border-red-800/80 rounded-2xl cursor-pointer hover:bg-red-900/60 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-red-400 font-bold uppercase tracking-wider text-[10px]">Critical Priority</div>
                  <div className="text-xl font-black text-white mt-0.5">{criticalCount}</div>
                </div>
                <span className="text-xl">🔴</span>
              </div>

              <div
                onClick={() => {
                  setActiveCommandTab('QUEUE');
                }}
                className="p-3 bg-orange-950/70 border border-orange-800/80 rounded-2xl cursor-pointer hover:bg-orange-900/60 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-orange-400 font-bold uppercase tracking-wider text-[10px]">High Priority</div>
                  <div className="text-xl font-black text-white mt-0.5">{highCount}</div>
                </div>
                <span className="text-xl">🟠</span>
              </div>

              <div
                onClick={() => {
                  setActiveCommandTab('QUEUE');
                }}
                className="p-3 bg-amber-950/70 border border-amber-800/80 rounded-2xl cursor-pointer hover:bg-amber-900/60 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">Medium Priority</div>
                  <div className="text-xl font-black text-white mt-0.5">{mediumCount}</div>
                </div>
                <span className="text-xl">🟡</span>
              </div>

              <div
                onClick={() => {
                  setActiveCommandTab('QUEUE');
                }}
                className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-2xl cursor-pointer hover:bg-emerald-900/60 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Low / Safe Zone</div>
                  <div className="text-xl font-black text-white mt-0.5">{lowCount}</div>
                </div>
                <span className="text-xl">🟢</span>
              </div>

              <div className="p-3 bg-blue-950/70 border border-blue-800/80 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-blue-400 font-bold uppercase tracking-wider text-[10px]">Teams En Route</div>
                  <div className="text-xl font-black text-white mt-0.5">{dispatchedCount}</div>
                </div>
                <span className="text-xl">🚑</span>
              </div>

              <div className="p-3 bg-indigo-950/70 border border-indigo-800/80 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Evacuated / Rescued</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{rescuedCount}</div>
                </div>
                <span className="text-xl">❤️</span>
              </div>
            </div>

            {/* Command Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  id="tab-command-map"
                  onClick={() => setActiveCommandTab('MAP')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeCommandTab === 'MAP'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>Live Disaster Map</span>
                </button>

                <button
                  id="tab-command-queue"
                  onClick={() => setActiveCommandTab('QUEUE')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeCommandTab === 'QUEUE'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 text-amber-500" />
                  <span>Emergency Queue ({incidents.length})</span>
                </button>

                <button
                  id="tab-command-drone"
                  onClick={() => setActiveCommandTab('DRONE')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeCommandTab === 'DRONE'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <span>Drone Surveillance</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                </button>

                <button
                  id="tab-command-resources"
                  onClick={() => setActiveCommandTab('RESOURCES')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeCommandTab === 'RESOURCES'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Logistics & Depots</span>
                </button>
              </div>

              {/* Quick Action: Open Selected Incident Drawer if one is picked */}
              {selectedIncident && (
                <button
                  onClick={() => setIsDispatchModalOpen(true)}
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-600/30 animate-pulse"
                >
                  <span>Assign {selectedIncident.incidentCode}</span>
                </button>
              )}
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 min-h-[500px]">
              {activeCommandTab === 'MAP' && (
                <div className="w-full h-[620px]">
                  <LiveDisasterMap
                    incidents={incidents}
                    rescueTeams={rescueTeams}
                    landmarks={landmarks}
                    selectedIncident={selectedIncident}
                    onSelectIncident={(inc) => {
                      setSelectedIncident(inc);
                      if (inc) {
                        setIsDispatchModalOpen(true);
                      }
                    }}
                    selectedTeam={selectedTeam}
                    onSelectTeam={(team) => setSelectedTeam(team)}
                    showHeatmap={showHeatmap}
                    setShowHeatmap={setShowHeatmap}
                    selectedDistrict={selectedDistrict}
                  />
                </div>
              )}

              {activeCommandTab === 'QUEUE' && (
                <EmergencyQueue
                  incidents={incidents}
                  selectedIncidentId={selectedIncident?.id}
                  onSelectIncident={(inc) => {
                    setSelectedIncident(inc);
                    setIsDispatchModalOpen(true);
                  }}
                />
              )}

              {activeCommandTab === 'DRONE' && (
                <DroneSurveillance
                  onCreateIncidentFromDrone={handleCreateIncidentFromDrone}
                  onSelectIncident={(inc) => {
                    setSelectedIncident(inc);
                    setIsDispatchModalOpen(true);
                  }}
                />
              )}

              {activeCommandTab === 'RESOURCES' && (
                <ResourceManagement
                  resources={resources}
                  rescueTeams={rescueTeams}
                  incidents={incidents}
                  onRestock={handleRestock}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Incident Dispatch & Smart Route Modal */}
      {isDispatchModalOpen && selectedIncident && (
        <IncidentDispatchModal
          incident={selectedIncident}
          rescueTeams={rescueTeams}
          resources={resources}
          onClose={() => setIsDispatchModalOpen(false)}
          onDispatchTeam={handleDispatchTeam}
          onUpdateStatus={handleUpdateIncidentStatus}
        />
      )}

      {/* Operational Sector & District Place Selection Modal */}
      {isDistrictModalOpen && (
        <DistrictPlaceModal
          isOpen={isDistrictModalOpen}
          onClose={() => setIsDistrictModalOpen(false)}
          selectedDistrictId={selectedDistrict.id}
          onSelectDistrict={(dist) => setSelectedDistrict(dist)}
        />
      )}
    </div>
  );
}
