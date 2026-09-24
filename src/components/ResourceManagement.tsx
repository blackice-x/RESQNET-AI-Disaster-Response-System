import React, { useState } from 'react';
import {
  ResourceInventory,
  RescueTeam,
  EmergencyReport,
} from '../types';
import {
  Package,
  Plus,
  Truck,
  Droplets,
  HeartPulse,
  Utensils,
  LifeBuoy,
  Plane,
  Shield,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';

interface ResourceManagementProps {
  resources: ResourceInventory;
  rescueTeams: RescueTeam[];
  incidents: EmergencyReport[];
  onRestock: (key: keyof ResourceInventory, amount: number) => void;
}

export const ResourceManagement: React.FC<ResourceManagementProps> = ({
  resources,
  rescueTeams,
  incidents,
  onRestock,
}) => {
  const [restockItem, setRestockItem] = useState<keyof ResourceInventory | null>(null);

  const resourceConfig: {
    key: keyof ResourceInventory;
    name: string;
    icon: any;
    unit: string;
    color: string;
  }[] = [
    { key: 'rescueBoats', name: 'Rescue Boats', icon: LifeBuoy, unit: 'Boats', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' },
    { key: 'ambulances', name: 'Ambulances (ALS)', icon: Truck, unit: 'Vehicles', color: 'text-red-400 bg-red-950/60 border-red-800' },
    { key: 'surveillanceDrones', name: 'Tactical Drones', icon: Plane, unit: 'Airframes', color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800' },
    { key: 'medicalKits', name: 'Trauma Medical Kits', icon: HeartPulse, unit: 'Kits', color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
    { key: 'waterPacks', name: 'Clean Water Packs (10L)', icon: Droplets, unit: 'Packs', color: 'text-blue-400 bg-blue-950/60 border-blue-800' },
    { key: 'foodPacks', name: 'Emergency Rations', icon: Utensils, unit: 'Meals', color: 'text-amber-400 bg-amber-950/60 border-amber-800' },
    { key: 'lifeJackets', name: 'Life Jackets & Vests', icon: Shield, unit: 'Vests', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
  ];

  // Recently dispatched incidents that consumed supplies
  const dispatchedIncidents = incidents.filter((i) => i.status === 'DISPATCHED' || i.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 gap-3">
        <div>
          <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Disaster Resource & Logistics Command</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time rescue asset depots, medical supplies, and automated team provisioning
          </p>
        </div>
        <div className="text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          CENTRAL DEPOT: <strong>Ernakulam Flood Logistics Center</strong>
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {resourceConfig.map((item) => {
          const res = resources[item.key];
          const IconComponent = item.icon;
          const percentage = Math.round((res.available / Math.max(1, res.total)) * 100);

          return (
            <div
              key={item.key}
              className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl border ${item.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <button
                  onClick={() => onRestock(item.key, 10)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-colors flex items-center space-x-0.5"
                  title="Restock +10 units"
                >
                  <Plus className="w-3 h-3" />
                  <span>+10</span>
                </button>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-300">{item.name}</div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-black text-white">{res.available}</span>
                  <span className="text-xs text-slate-400">/ {res.total} {item.unit}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      percentage < 30 ? 'bg-red-500' : percentage < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployment Flow Visualizer matching prompt specification */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>Active Resource Allocation Pipeline</span>
          </h4>
          <span className="text-[11px] text-slate-400">Automated Dispatch Linkages</span>
        </div>

        {dispatchedIncidents.length > 0 ? (
          <div className="space-y-3">
            {dispatchedIncidents.slice(0, 3).map((inc) => (
              <div
                key={inc.id}
                className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
              >
                {/* Team Block */}
                <div className="flex items-center space-x-2.5 min-w-[180px]">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    🔵
                  </div>
                  <div>
                    <div className="font-extrabold text-white">{inc.assignedTeamName || 'Assigned Team'}</div>
                    <div className="text-[10px] text-slate-400">Unit In Motion</div>
                  </div>
                </div>

                <ArrowDown className="w-4 h-4 text-slate-500 md:-rotate-90 flex-shrink-0" />

                {/* Supplies Block */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {inc.aiAssessment.recommendedSupplies.map((supp, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-semibold text-[11px]"
                    >
                      📦 {supp.qty}x {supp.item}
                    </span>
                  ))}
                </div>

                <ArrowDown className="w-4 h-4 text-slate-500 md:-rotate-90 flex-shrink-0" />

                {/* Destination Block */}
                <div className="flex items-center space-x-2 min-w-[200px]">
                  <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center font-bold">
                    📍
                  </div>
                  <div>
                    <div className="font-bold text-white line-clamp-1">{inc.incidentCode}: {inc.locationName}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">ETA: ~{inc.dispatchEtaMinutes || 8} min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Default Demonstration Flow matching prompt */
          <div className="p-4 bg-slate-800/60 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-around gap-4 text-center">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="font-extrabold text-white">NDRF Unit Alpha</div>
              <div className="text-[10px] text-slate-400">Rapid Inflatable Boat</div>
            </div>
            <ArrowDown className="w-4 h-4 text-cyan-400 md:-rotate-90" />
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="font-extrabold text-amber-400">10 Medical Kits &bull; 20 Food Packs</div>
              <div className="text-[10px] text-slate-400">Loaded onto Transport</div>
            </div>
            <ArrowDown className="w-4 h-4 text-cyan-400 md:-rotate-90" />
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="font-extrabold text-red-400">Emergency #1042 (House A)</div>
              <div className="text-[10px] text-slate-400">Riverside Colony &bull; ETA 8m</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
