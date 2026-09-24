import React, { useState } from 'react';
import {
  EmergencyReport,
  PriorityLevel,
  IncidentStatus,
} from '../types';
import {
  Search,
  Filter,
  Users,
  HeartPulse,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface EmergencyQueueProps {
  incidents: EmergencyReport[];
  onSelectIncident: (incident: EmergencyReport) => void;
  selectedIncidentId?: string;
}

export const EmergencyQueue: React.FC<EmergencyQueueProps> = ({
  incidents,
  onSelectIncident,
  selectedIncidentId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.incidentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'ALL' || inc.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports, house code, location, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-semibold focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Only</option>
            <option value="MEDIUM">🟡 Medium Only</option>
            <option value="LOW">🟢 Low Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="TRIAGED">Triaged</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="RESCUED">Rescued</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-2.5">
        {filteredIncidents.length > 0 ? (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-400/20'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                {/* Left block: Priority badge & Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        inc.priority === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : inc.priority === 'HIGH'
                          ? 'bg-orange-500 text-white'
                          : inc.priority === 'MEDIUM'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {inc.priority} &bull; {inc.priorityScore}/100
                    </span>

                    <span className="font-extrabold text-xs text-white">{inc.incidentCode}</span>

                    <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>

                    {inc.isOfflineSynced && (
                      <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-700 rounded text-[9px] font-bold">
                        Mesh Synced
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-100">{inc.title}</h4>

                  <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span className="text-slate-300 font-medium">{inc.locationName}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-blue-400" />
                      <span>{inc.peopleCount} People</span>
                    </span>
                    {inc.injuredCount > 0 && (
                      <span className="flex items-center space-x-1 text-red-400 font-bold">
                        <HeartPulse className="w-3 h-3 text-red-400" />
                        <span>{inc.injuredCount} Injured</span>
                      </span>
                    )}
                    {inc.isTrapped && (
                      <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/80">
                        🚨 Trapped on Roof/Inside
                      </span>
                    )}
                  </div>
                </div>

                {/* Right block: Status, Assigned Team, Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                        inc.status === 'DISPATCHED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-600'
                          : inc.status === 'RESCUED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : 'bg-slate-800 text-amber-400 border border-slate-700'
                      }`}
                    >
                      {inc.status}
                    </span>
                    {inc.assignedTeamName && (
                      <div className="text-[11px] text-blue-300 font-semibold mt-1">
                        🚑 {inc.assignedTeamName}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIncident(inc);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1 transition-colors"
                  >
                    <span>{inc.assignedTeamName ? 'Details' : 'Assign Team'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-500">
            No incident reports found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
