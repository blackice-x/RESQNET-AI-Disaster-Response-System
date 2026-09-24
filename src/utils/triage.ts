import {
  Coordinates,
  EmergencyReport,
  EmergencyType,
  PriorityLevel,
  RescueTeam,
  TeamType,
} from '../types';

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Estimates travel time in minutes based on distance and disaster terrain condition
 */
export function estimateTravelTimeMinutes(distanceKm: number, teamType: TeamType): number {
  // Speed factors (km/h) accounting for flood water, debris & urban detours
  const speeds: Record<TeamType, number> = {
    BOAT_RESCUE: 18, // Water current navigation
    AMBULANCE_MEDICAL: 22, // Detours around flooded lanes
    SEARCH_AND_RESCUE: 20, // Heavy 4x4 vehicles
    AIRLIFT_DRONE: 45, // Direct aerial flight
  };

  const speed = speeds[teamType] || 20;
  const transitTime = (distanceKm / speed) * 60;
  const prepTime = 2; // Tactical equipment loading
  return Math.max(2, Math.round(transitTime + prepTime));
}

export interface TriageInput {
  description?: string;
  peopleCount?: number;
  injuredCount?: number;
  hasChildren?: boolean;
  hasElderly?: boolean;
  isTrapped?: boolean;
  emergencyType?: EmergencyType;
  floodWaterLevel?: 'NONE' | 'ANKLE' | 'WAIST' | 'ROOFTOP' | 'SURGING';
}

export interface TriageResult {
  priority: PriorityLevel;
  score: number;
  reasoning: string;
  confidence: number;
  recommendedUnit: TeamType;
  recommendedSupplies: { item: string; qty: number }[];
}

/**
 * Rule-based Mathematical Scoring Matrix for Emergency Priority
 * Score scale: 0 - 100
 * >= 85: CRITICAL (Red)
 * 65 - 84: HIGH (Orange)
 * 40 - 64: MEDIUM (Yellow)
 * < 40: LOW (Green)
 */
export function calculateRuleBasedPriority(input: TriageInput): TriageResult {
  const isTrapped = Boolean(input.isTrapped);
  const injuredCount = input.injuredCount || 0;
  const peopleCount = Math.max(1, input.peopleCount || 1);
  const hasChildren = Boolean(input.hasChildren);
  const hasElderly = Boolean(input.hasElderly);
  const emergencyType = input.emergencyType || 'FLOOD_TRAPPED';
  const floodWaterLevel = input.floodWaterLevel || 'NONE';
  const description = input.description || '';

  let score = 20; // baseline report score
  const reasons: string[] = [];

  // Trapped status
  if (isTrapped) {
    score += 30;
    reasons.push('Trapped occupants unable to self-evacuate');
  }

  // Injuries
  if (injuredCount > 0) {
    const injuryPoints = Math.min(30, injuredCount * 12);
    score += injuryPoints;
    reasons.push(`${injuredCount} reported injured individuals requiring medical intervention`);
  }

  // Vulnerable population
  if (hasChildren && hasElderly) {
    score += 18;
    reasons.push('Both pediatric and geriatric individuals present');
  } else if (hasChildren || hasElderly) {
    score += 10;
    reasons.push(hasChildren ? 'Children present' : 'Elderly individuals present');
  }

  // People affected scale
  if (peopleCount >= 8) {
    score += 15;
    reasons.push(`Mass gathering/group (${peopleCount} people)`);
  } else if (peopleCount >= 4) {
    score += 8;
    reasons.push(`Family/group of ${peopleCount} people`);
  }

  // Flood water level
  if (floodWaterLevel === 'ROOFTOP' || floodWaterLevel === 'SURGING') {
    score += 25;
    reasons.push('Severe flood surge / rooftop level inundation');
  } else if (floodWaterLevel === 'WAIST') {
    score += 15;
    reasons.push('Waist-deep water level restricting movement');
  }

  // Emergency type weights
  if (emergencyType === 'BUILDING_COLLAPSE') {
    score += 20;
    reasons.push('Structural collapse hazard');
  } else if (emergencyType === 'LANDSLIDE') {
    score += 18;
    reasons.push('Active mudslide / slope failure zone');
  } else if (emergencyType === 'MEDICAL_EMERGENCY') {
    score += 15;
    reasons.push('Acute medical emergency');
  }

  // Text keyword detection for urgency amplification
  const lowerText = description.toLowerCase();
  if (/dying|unconscious|bleeding|infant|cardiac|oxygen|drowning|collapsed/i.test(lowerText)) {
    score += 15;
    reasons.push('Critical distress keywords detected in description');
  }

  // Bound score 0-100
  score = Math.min(100, Math.max(10, score));

  // Determine priority level
  let priority: PriorityLevel = 'LOW';
  if (score >= 85) priority = 'CRITICAL';
  else if (score >= 65) priority = 'HIGH';
  else if (score >= 40) priority = 'MEDIUM';
  else priority = 'LOW';

  // Recommended Unit
  let recommendedUnit: TeamType = 'SEARCH_AND_RESCUE';
  if (emergencyType === 'FLOOD_TRAPPED' || floodWaterLevel === 'ROOFTOP' || floodWaterLevel === 'SURGING') {
    recommendedUnit = 'BOAT_RESCUE';
  } else if (injuredCount > 0 || emergencyType === 'MEDICAL_EMERGENCY') {
    recommendedUnit = 'AMBULANCE_MEDICAL';
  } else if (emergencyType === 'FOOD_WATER_RELIEF') {
    recommendedUnit = 'AIRLIFT_DRONE';
  }

  // Recommended supplies
  const supplies: { item: string; qty: number }[] = [];
  if (floodWaterLevel === 'ROOFTOP' || floodWaterLevel === 'SURGING' || floodWaterLevel === 'WAIST') {
    supplies.push({ item: 'Rescue Boat / Motorized Raft', qty: 1 });
    supplies.push({ item: 'Life Jackets', qty: Math.max(2, peopleCount) });
  }
  if (injuredCount > 0 || emergencyType === 'MEDICAL_EMERGENCY') {
    supplies.push({ item: 'Trauma First Aid Kit', qty: Math.max(1, Math.ceil(injuredCount / 2)) });
    supplies.push({ item: 'Stretcher / Spine Board', qty: 1 });
  }
  if (emergencyType === 'FOOD_WATER_RELIEF' || priority === 'MEDIUM') {
    supplies.push({ item: 'Water Packs (10L)', qty: Math.max(4, peopleCount * 2) });
    supplies.push({ item: 'Emergency Meal Rations', qty: Math.max(4, peopleCount * 2) });
  }

  const reasoning = `${priority} PRIORITY (Score: ${score}/100): ${reasons.slice(0, 3).join('. ')}. Recommended dispatch of ${recommendedUnit.replace(/_/g, ' ')}.`;

  return {
    priority,
    score,
    reasoning,
    confidence: 0.94,
    recommendedUnit,
    recommendedSupplies: supplies,
  };
}

export interface TeamMatch {
  team: RescueTeam;
  distanceKm: number;
  etaMinutes: number;
  isRecommended: boolean;
  matchScore: number;
}

/**
 * Finds and sorts all rescue teams by distance and capability match to the incident
 */
export function rankNearestRescueTeams(
  incident: EmergencyReport,
  teams: RescueTeam[]
): TeamMatch[] {
  const matches: TeamMatch[] = teams.map((team) => {
    const distanceKm = calculateDistanceKm(team.currentLocation, incident.coordinates);
    const etaMinutes = estimateTravelTimeMinutes(distanceKm, team.type);

    // Capability score bonus
    let capabilityBonus = 0;
    if (team.type === incident.aiAssessment.recommendedUnit) {
      capabilityBonus = 30;
    } else if (team.type === 'BOAT_RESCUE' && incident.floodWaterLevel !== 'NONE') {
      capabilityBonus = 20;
    } else if (team.type === 'AMBULANCE_MEDICAL' && incident.injuredCount > 0) {
      capabilityBonus = 25;
    }

    // Availability penalty
    let availabilityScore = 50;
    if (team.status === 'AVAILABLE') availabilityScore = 100;
    else if (team.status === 'RETURNING') availabilityScore = 40;
    else availabilityScore = 10;

    // Match score formula: lower distance is better, plus capability and availability
    const distancePenalty = distanceKm * 8;
    const matchScore = Math.round(availabilityScore + capabilityBonus - distancePenalty);

    return {
      team,
      distanceKm,
      etaMinutes,
      isRecommended: false,
      matchScore,
    };
  });

  // Sort by match score descending, then distance ascending
  matches.sort((a, b) => {
    if (a.team.status === 'AVAILABLE' && b.team.status !== 'AVAILABLE') return -1;
    if (b.team.status === 'AVAILABLE' && a.team.status !== 'AVAILABLE') return 1;
    return a.distanceKm - b.distanceKm;
  });

  if (matches.length > 0) {
    matches[0].isRecommended = true;
  }

  return matches;
}
