export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EmergencyType =
  | 'FLOOD_TRAPPED'
  | 'MEDICAL_EMERGENCY'
  | 'LANDSLIDE'
  | 'BUILDING_COLLAPSE'
  | 'ROAD_BLOCK'
  | 'FOOD_WATER_RELIEF'
  | 'GENERAL_EVACUATION';

export type IncidentStatus =
  | 'REPORTED'
  | 'TRIAGED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'RESCUED'
  | 'RESOLVED';

export type TeamType =
  | 'BOAT_RESCUE'
  | 'AMBULANCE_MEDICAL'
  | 'SEARCH_AND_RESCUE'
  | 'AIRLIFT_DRONE';

export type TeamStatus = 'AVAILABLE' | 'DISPATCHED' | 'ON_SCENE' | 'RETURNING';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface EmergencyReport {
  id: string;
  incidentCode: string;
  title: string;
  description: string;
  locationName: string;
  coordinates: Coordinates;
  peopleCount: number;
  injuredCount: number;
  hasChildren: boolean;
  hasElderly: boolean;
  isTrapped: boolean;
  emergencyType: EmergencyType;
  floodWaterLevel: 'NONE' | 'ANKLE' | 'WAIST' | 'ROOFTOP' | 'SURGING';
  priority: PriorityLevel;
  priorityScore: number;
  aiAssessment: {
    reasoning: string;
    confidence: number;
    recommendedUnit: TeamType;
    recommendedSupplies: { item: string; qty: number }[];
  };
  status: IncidentStatus;
  assignedTeamId?: string;
  assignedTeamName?: string;
  dispatchEtaMinutes?: number;
  dispatchedAt?: number;
  timestamp: number;
  isOfflineSynced?: boolean;
  contactNumber?: string;
  victimName?: string;
  photoUrl?: string;
}

export interface RescueTeam {
  id: string;
  name: string;
  callsign: string;
  type: TeamType;
  status: TeamStatus;
  currentLocation: Coordinates;
  locationName: string;
  personnelCount: number;
  assignedIncidentId?: string;
  vehicle: string;
  phone: string;
}

export interface ResourceInventory {
  ambulances: { total: number; available: number };
  rescueBoats: { total: number; available: number };
  surveillanceDrones: { total: number; available: number };
  medicalKits: { total: number; available: number };
  waterPacks: { total: number; available: number };
  foodPacks: { total: number; available: number };
  lifeJackets: { total: number; available: number };
}

export interface DroneHazardDetection {
  id: string;
  type: 'FLOOD_SURGE' | 'DAMAGED_BUILDING' | 'BLOCKED_ROAD' | 'STRANDED_GROUP' | 'SAFE_CORRIDOR';
  severity: PriorityLevel | 'SAFE';
  label: string;
  details: string;
  box: { x: number; y: number; width: number; height: number }; // percentage positions
  coordinates: Coordinates;
  peopleDetected?: number;
}

export type DroneCameraSource =
  | 'DEVICE_CAMERA'
  | 'PLAY_STORE_WIFI'
  | 'PAIR_PHONE_QR'
  | 'BLUETOOTH_BLE'
  | 'SIMULATION';

export type VisionFilterMode = 'OPTICAL' | 'FLIR_THERMAL' | 'NVG_NIGHT_VISION' | 'LIDAR_EDGES';

export interface DroneConnectionState {
  source: DroneCameraSource;
  visionMode: VisionFilterMode;
  playStoreApp: 'IP_WEBCAM' | 'DROIDCAM' | 'IRIUN' | 'CUSTOM';
  ipWebcamUrl: string;
  facingMode: 'environment' | 'user';
  torchOn: boolean;
  isConnected: boolean;
  bleConnected: boolean;
  bleDeviceName?: string;
  bleBatteryPct: number;
  bleRssi: number;
  altitudeMeters: number;
  pitchDeg: number;
  rollDeg: number;
  headingDeg: number;
  airspeedKts: number;
  isRecording: boolean;
}

export interface LandmarkFacility {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'SHELTER' | 'ROAD_BLOCK' | 'SAFE_ZONE';
  coordinates: Coordinates;
  capacity?: string;
  status: string;
  details?: string;
}

export interface LiveWeatherReport {
  latitude: number;
  longitude: number;
  locationName: string;
  state: string;
  country?: string;
  locationKey?: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  feelsLike: number;
  rainProbability: number;
  updatedAt: string;
  accuHeadline?: string;
  accuSeverity?: number;
  accuMobileLink?: string;
  uvIndex?: number;
  forecast: {
    day: string;
    condition: string;
    maxTemp: number;
    minTemp: number;
    rainProb: number;
    iconPhrase?: string;
    nightCondition?: string;
  }[];
}

export interface AccuWeatherLocationSearchResult {
  Key: string;
  LocalizedName: string;
  EnglishName: string;
  AdministrativeArea: {
    ID: string;
    LocalizedName: string;
  };
  Country: {
    ID: string;
    LocalizedName: string;
  };
  GeoPosition?: {
    Latitude: number;
    Longitude: number;
  };
}

export interface AccuWeatherPlaygroundResult {
  endpoint: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  durationMs: number;
  data: any;
  headline?: string;
  dailyForecastsCount?: number;
}

export interface AirQualityReport {
  aqi: number;
  status: 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2?: number;
  co?: number;
}

export type AlertSeverityLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';

export interface NationalAlert {
  id: string;
  title: string;
  hazardType: string;
  severity: AlertSeverityLevel;
  source: 'NDMA SACHET' | 'IMD' | 'CWC' | 'INCOIS';
  issuedAt: string;
  affectedRegions: string[];
  description: string;
  instructions: string[];
  capIdentifier?: string;
}

export interface HazardModuleInfo {
  id: string;
  name: string;
  tagline: string;
  iconName: string;
  color: string;
  activeWarningsCount: number;
  highRiskZones: string[];
  dos: string[];
  donts: string[];
  keyHelpline: string;
}

export interface LiveDisasterNewsItem {
  id: string;
  title: string;
  source: 'NDRF' | 'PIB' | 'NDMA' | 'IMD' | 'ISRO';
  timestamp: string;
  summary: string;
  verified: boolean;
  category: string;
}
