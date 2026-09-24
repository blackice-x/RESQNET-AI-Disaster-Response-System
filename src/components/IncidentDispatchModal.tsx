import React, { useState } from 'react';
import {
  EmergencyReport,
  RescueTeam,
  ResourceInventory,
} from '../types';
import { rankNearestRescueTeams } from '../utils/triage';
import {
  AlertTriangle,
  Users,
  HeartPulse,
  Baby,
  Navigation,
  Clock,
  Send,
  CheckCircle2,
  X,
  Package,
  Sparkles,
  PhoneCall,
  MapPin,
} from 'lucide-react';

interface IncidentDispatchModalProps {
  incident: EmergencyReport | null;
  rescueTeams: RescueTeam[];
  resources: ResourceInventory;
  onClose: () => void;
  onDispatchTeam: (incidentId: string, teamId: string, etaMinutes: number, supplies: { item: string; qty: number }[]) => Promise<void>;
  onUpdateStatus: (incidentId: string, newStatus: any) => Promise<void>;
}

export const IncidentDispatchModal: React.FC<IncidentDispatchModalProps> = ({
  incident,
  rescueTeams,
  resources,
  onClose,
  onDispatchTeam,
  onUpdateStatus,
}) => {
  if (!incident) return null;

  const rankedTeams = rankNearestRescueTeams(incident, rescueTeams);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    incident.assignedTeamId || (rankedTeams.length > 0 ? rankedTeams[0].team.id : '')
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const currentSelectedMatch = rankedTeams.find((m) => m.team.id === selectedTeamId) || rankedTeams[0];

  const handleDispatch = async () => {
    if (!currentSelectedMatch) return;
    setIsDispatching(true);
    try {
      await onDispatchTeam(
        incident.id,
        currentSelectedMatch.team.id,
        currentSelectedMatch.etaMinutes,
        incident.aiAssessment.recommendedSupplies
      );
      setDispatchSuccessMsg(
        `🚑 ${currentSelectedMatch.team.name} DISPATCHED! Destination: ${incident.incidentCode} (ETA: ${currentSelectedMatch.etaMinutes} min)`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispatching(false);
    }
  };

  const priorityColorMap = {
    CRITICAL: 'bg-red-600 text-white border-red-500 shadow-red-600/30',
    HIGH: 'bg-orange-600 text-white border-orange-500 shadow-orange-600/30',
    MEDIUM: 'bg-amber-600 text-white border-amber-500 shadow-amber-600/30',
    LOW: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-md border ${
                priorityColorMap[incident.priority]
              }`}
            >
              {incident.priority} PRIORITY
            </span>
            <span className="font-extrabold text-lg text-white">{incident.incidentCode}</span>
            <span className="text-xs text-slate-400">Score: {incident.priorityScore}/100</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Dispatch Success Alert Banner */}
          {dispatchSuccessMsg && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-200 flex items-center space-x-3 animate-bounce">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-sm text-emerald-300">DISPATCH CONFIRMED</div>
                <div className="text-xs">{dispatchSuccessMsg}</div>
              </div>
            </div>
          )}

          {/* Incident Title & Description */}
          <div>
            <h3 className="text-lg font-bold text-slate-100">{incident.title}</h3>
            <p className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>{incident.locationName}</span>
            </p>
            <div className="mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 leading-relaxed italic">
              "{incident.description}"
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium">People Affected</div>
              <div className="text-base font-extrabold text-white mt-0.5 flex items-center justify-center space-x-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{incident.peopleCount}</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium">Injured</div>
              <div className="text-base font-extrabold text-red-400 mt-0.5 flex items-center justify-center space-x-1">
                <HeartPulse className="w-4 h-4 text-red-400" />
                <span>{incident.injuredCount}</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium">Water Level</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">
                {incident.floodWaterLevel}
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium">Trapped Status</div>
              <div className={`text-sm font-bold mt-0.5 ${incident.isTrapped ? 'text-red-400' : 'text-emerald-400'}`}>
                {incident.isTrapped ? '🚨 TRAPPED' : 'SAFE ON HIGHLAND'}
              </div>
            </div>
          </div>

          {/* AI Priority Assessment Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 rounded-xl border border-indigo-700/60 shadow-inner">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>AI Priority Reasoning & Assessment</span>
              <span className="text-[10px] bg-indigo-900/80 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-600">
                {(incident.aiAssessment.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {incident.aiAssessment.reasoning}
            </p>

            {/* Recommended Supplies */}
            <div className="mt-3 pt-2.5 border-t border-indigo-900/60 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-indigo-300 font-semibold flex items-center space-x-1">
                <Package className="w-3.5 h-3.5" />
                <span>Recommended Package:</span>
              </span>
              {incident.aiAssessment.recommendedSupplies.map((supp, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-indigo-800/80 text-indigo-200 text-[11px] font-semibold"
                >
                  {supp.qty}x {supp.item}
                </span>
              ))}
            </div>
          </div>

          {/* Smart Rescue Route & Closest Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span>Smart Rescue Route — Closest Teams</span>
              </h4>
              <span className="text-[11px] text-slate-400">Sorted by Proximity & Capability</span>
            </div>

            <div className="space-y-2">
              {rankedTeams.map((match) => {
                const isSelected = selectedTeamId === match.team.id;
                const isDispatched = match.team.status === 'DISPATCHED';

                return (
                  <div
                    key={match.team.id}
                    onClick={() => setSelectedTeamId(match.team.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/70 border-blue-500 shadow-md shadow-blue-950'
                        : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500 flex items-center justify-center text-base">
                        {match.team.type === 'BOAT_RESCUE' ? '🚤' : match.team.type === 'AMBULANCE_MEDICAL' ? '🚑' : '🚁'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">{match.team.name}</span>
                          <span className="text-[10px] text-slate-400">({match.team.callsign})</span>
                          {match.isRecommended && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-600 rounded">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {match.team.vehicle} &bull; {match.team.locationName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-amber-400">{match.distanceKm} km</div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-end space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>ETA: ~{match.etaMinutes} min</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Status & Action Bar */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <span className="font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-700/60">
                {incident.status}
              </span>
              {incident.assignedTeamName && (
                <span className="text-slate-300">
                  &bull; Unit: <strong>{incident.assignedTeamName}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {incident.status === 'DISPATCHED' || incident.status === 'IN_PROGRESS' ? (
                <>
                  <button
                    onClick={() => onUpdateStatus(incident.id, 'RESCUED')}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Rescued</span>
                  </button>
                  <button
                    onClick={() => onUpdateStatus(incident.id, 'RESOLVED')}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Resolve Incident
                  </button>
                </>
              ) : (
                <button
                  id="modal-btn-assign-team"
                  disabled={isDispatching || !currentSelectedMatch}
                  onClick={handleDispatch}
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-red-600/40"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isDispatching ? 'DISPATCHING...' : `ASSIGN & DISPATCH ${currentSelectedMatch?.team.name.toUpperCase() || 'TEAM'}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
