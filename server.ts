import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  EmergencyReport,
  RescueTeam,
  ResourceInventory,
  PriorityLevel,
  TeamType,
} from './src/types';
import {
  KERALA_FLOOD_10_REPORTS,
  INITIAL_RESCUE_TEAMS,
  INITIAL_RESOURCES,
} from './src/data/mockData';
import { calculateRuleBasedPriority } from './src/utils/triage';

let incidents: EmergencyReport[] = JSON.parse(JSON.stringify(KERALA_FLOOD_10_REPORTS));
let rescueTeams: RescueTeam[] = JSON.parse(JSON.stringify(INITIAL_RESCUE_TEAMS));
let resources: ResourceInventory = JSON.parse(JSON.stringify(INITIAL_RESOURCES));

// Lazy-initialized Gemini client with telemetry header
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'RESQNET Emergency Command Backend',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      incidentsCount: incidents.length,
      timestamp: Date.now(),
    });
  });

  // Get all incidents
  app.get('/api/incidents', (req: Request, res: Response) => {
    // Sort critical first, then high, medium, low
    const priorityWeight: Record<PriorityLevel, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    const sorted = [...incidents].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return b.timestamp - a.timestamp;
    });
    res.json(sorted);
  });

  // Create new emergency incident (Citizen SOS or detailed form)
  app.post('/api/incidents', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const peopleCount = Number(body.peopleCount) || 1;
      const injuredCount = Number(body.injuredCount) || 0;
      const hasChildren = Boolean(body.hasChildren);
      const hasElderly = Boolean(body.hasElderly);
      const isTrapped = Boolean(body.isTrapped);
      const emergencyType = body.emergencyType || 'FLOOD_TRAPPED';
      const floodWaterLevel = body.floodWaterLevel || 'WAIST';
      const description = body.description || 'Emergency SOS signal received. Rapid assistance required.';

      // Default rule-based assessment
      let triageResult = calculateRuleBasedPriority({
        description,
        peopleCount,
        injuredCount,
        hasChildren,
        hasElderly,
        isTrapped,
        emergencyType,
        floodWaterLevel,
      });

      // Try Gemini AI classification if key is available
      const ai = getGeminiClient();
      if (ai) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are RESQNET's Emergency Command AI Classifier. Analyze this disaster incident report:
Title: ${body.title || 'Emergency Request'}
Description: "${description}"
People Count: ${peopleCount}
Injured Count: ${injuredCount}
Has Children: ${hasChildren}
Has Elderly: ${hasElderly}
Is Trapped: ${isTrapped}
Emergency Type: ${emergencyType}
Water Level: ${floodWaterLevel}

Evaluate the human threat level. Return a strict JSON response.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  priority: {
                    type: Type.STRING,
                    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                  },
                  score: {
                    type: Type.INTEGER,
                    description: '0 to 100 severity rating',
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: 'Concise explanation of the priority and risk factors',
                  },
                  recommendedUnit: {
                    type: Type.STRING,
                    enum: ['BOAT_RESCUE', 'AMBULANCE_MEDICAL', 'SEARCH_AND_RESCUE', 'AIRLIFT_DRONE'],
                  },
                },
                required: ['priority', 'score', 'reasoning', 'recommendedUnit'],
              },
            },
          });

          if (aiResponse.text) {
            const parsed = JSON.parse(aiResponse.text);
            triageResult = {
              priority: parsed.priority as PriorityLevel,
              score: Math.min(100, Math.max(10, parsed.score)),
              reasoning: `AI Evaluated: ${parsed.reasoning}`,
              confidence: 0.97,
              recommendedUnit: parsed.recommendedUnit as TeamType,
              recommendedSupplies: triageResult.recommendedSupplies,
            };
          }
        } catch (aiErr) {
          console.warn('Gemini triage fallback triggered:', aiErr);
        }
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newIncident: EmergencyReport = {
        id: `rep-${Date.now()}-${randomSuffix}`,
        incidentCode: body.incidentCode || `RESQ-${randomSuffix}`,
        title: body.title || `${emergencyType.replace(/_/g, ' ')} at ${body.locationName || 'GPS Location'}`,
        description,
        locationName: body.locationName || 'Kerala Flood Sector (Auto GPS)',
        coordinates: body.coordinates || { lat: 10.108 + (Math.random() - 0.5) * 0.04, lng: 76.355 + (Math.random() - 0.5) * 0.04 },
        peopleCount,
        injuredCount,
        hasChildren,
        hasElderly,
        isTrapped,
        emergencyType,
        floodWaterLevel,
        priority: triageResult.priority,
        priorityScore: triageResult.score,
        aiAssessment: {
          reasoning: triageResult.reasoning,
          confidence: triageResult.confidence,
          recommendedUnit: triageResult.recommendedUnit,
          recommendedSupplies: triageResult.recommendedSupplies,
        },
        status: 'TRIAGED',
        timestamp: Date.now(),
        isOfflineSynced: Boolean(body.isOfflineSynced),
        victimName: body.victimName || 'Citizen Report',
        contactNumber: body.contactNumber || '+91 98460 00000',
        photoUrl: body.photoUrl,
      };

      incidents.unshift(newIncident);
      res.status(201).json(newIncident);
    } catch (err: any) {
      console.error('Error creating incident:', err);
      res.status(500).json({ error: err.message || 'Failed to process incident' });
    }
  });

  // Assign rescue team to incident and dispatch
  app.post('/api/incidents/:id/assign', (req: Request, res: Response) => {
    const { id } = req.params;
    const { teamId, etaMinutes, allocatedSupplies } = req.body;

    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const team = rescueTeams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ error: 'Rescue team not found' });
    }

    // Update team status
    team.status = 'DISPATCHED';
    team.assignedIncidentId = incident.id;

    // Update incident status
    incident.status = 'DISPATCHED';
    incident.assignedTeamId = team.id;
    incident.assignedTeamName = team.name;
    incident.dispatchEtaMinutes = etaMinutes || 8;
    incident.dispatchedAt = Date.now();

    // Deduct resources if applicable
    if (team.type === 'BOAT_RESCUE' && resources.rescueBoats.available > 0) {
      resources.rescueBoats.available -= 1;
    } else if (team.type === 'AMBULANCE_MEDICAL' && resources.ambulances.available > 0) {
      resources.ambulances.available -= 1;
    } else if (team.type === 'AIRLIFT_DRONE' && resources.surveillanceDrones.available > 0) {
      resources.surveillanceDrones.available -= 1;
    }

    if (allocatedSupplies && Array.isArray(allocatedSupplies)) {
      for (const s of allocatedSupplies) {
        if (/water/i.test(s.item) && resources.waterPacks.available >= s.qty) {
          resources.waterPacks.available -= s.qty;
        } else if (/food|ration/i.test(s.item) && resources.foodPacks.available >= s.qty) {
          resources.foodPacks.available -= s.qty;
        } else if (/medical|trauma/i.test(s.item) && resources.medicalKits.available >= s.qty) {
          resources.medicalKits.available -= s.qty;
        } else if (/jacket|life/i.test(s.item) && resources.lifeJackets.available >= s.qty) {
          resources.lifeJackets.available -= s.qty;
        }
      }
    }

    res.json({
      success: true,
      message: `${team.name} successfully dispatched to ${incident.incidentCode}! ETA: ${incident.dispatchEtaMinutes} min`,
      incident,
      team,
      resources,
    });
  });

  // Update incident status
  app.patch('/api/incidents/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    incident.status = status;

    // If marked rescued/resolved, free up the assigned team
    if ((status === 'RESCUED' || status === 'RESOLVED') && incident.assignedTeamId) {
      const team = rescueTeams.find((t) => t.id === incident.assignedTeamId);
      if (team) {
        team.status = 'AVAILABLE';
        team.assignedIncidentId = undefined;
      }
    }

    res.json(incident);
  });

  // Get rescue teams
  app.get('/api/rescue-teams', (req: Request, res: Response) => {
    res.json(rescueTeams);
  });

  // Get resource inventory
  app.get('/api/resources', (req: Request, res: Response) => {
    res.json(resources);
  });

  // Reset scenario to default 10 Kerala Flood Reports
  app.post('/api/reset-kerala', (req: Request, res: Response) => {
    incidents = JSON.parse(JSON.stringify(KERALA_FLOOD_10_REPORTS));
    rescueTeams = JSON.parse(JSON.stringify(INITIAL_RESCUE_TEAMS));
    resources = JSON.parse(JSON.stringify(INITIAL_RESOURCES));
    res.json({
      success: true,
      message: 'Demo Kerala Flood Scenario loaded with 10 prioritized emergency reports, 4 rescue units & full resource depot.',
      incidents,
      rescueTeams,
      resources,
    });
  });

  // AI Triage standalone endpoint
  app.post('/api/ai-triage', async (req: Request, res: Response) => {
    try {
      const { text, peopleCount, injuredCount, hasChildren, hasElderly, isTrapped, waterLevel } = req.body;
      const ruleResult = calculateRuleBasedPriority({
        description: text || '',
        peopleCount: Number(peopleCount) || 1,
        injuredCount: Number(injuredCount) || 0,
        hasChildren: Boolean(hasChildren),
        hasElderly: Boolean(hasElderly),
        isTrapped: Boolean(isTrapped),
        emergencyType: 'FLOOD_TRAPPED',
        floodWaterLevel: waterLevel || 'WAIST',
      });

      const ai = getGeminiClient();
      if (!ai) {
        return res.json(ruleResult);
      }

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze emergency text: "${text}".
Parameters: people=${peopleCount}, injured=${injuredCount}, trapped=${isTrapped}, children=${hasChildren}, elderly=${hasElderly}, water=${waterLevel}.
Provide disaster triage JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
              score: { type: Type.INTEGER },
              reasoning: { type: Type.STRING },
              recommendedUnit: { type: Type.STRING, enum: ['BOAT_RESCUE', 'AMBULANCE_MEDICAL', 'SEARCH_AND_RESCUE', 'AIRLIFT_DRONE'] },
            },
            required: ['priority', 'score', 'reasoning', 'recommendedUnit'],
          },
        },
      });

      if (aiResponse.text) {
        const parsed = JSON.parse(aiResponse.text);
        return res.json({
          priority: parsed.priority,
          score: parsed.score,
          reasoning: parsed.reasoning,
          confidence: 0.98,
          recommendedUnit: parsed.recommendedUnit,
          recommendedSupplies: ruleResult.recommendedSupplies,
        });
      }

      res.json(ruleResult);
    } catch (err: any) {
      console.warn('AI Triage error:', err);
      res.json(calculateRuleBasedPriority({
        description: req.body.text || '',
        peopleCount: 1,
        injuredCount: 0,
        hasChildren: false,
        hasElderly: false,
        isTrapped: false,
        emergencyType: 'FLOOD_TRAPPED',
        floodWaterLevel: 'WAIST',
      }));
    }
  });

  // In-memory active drone sessions for cross-device QR camera streaming
  interface DroneSession {
    sessionId: string;
    latestFrame: string | null;
    gyro: { pitch: number; roll: number; heading: number };
    lastUpdated: number;
    sseClients: Response[];
  }
  const droneSessions = new Map<string, DroneSession>();

  // Push frame from phone transmitter (QR scanned phone)
  app.post('/api/drone/frame', (req: Request, res: Response) => {
    const { sessionId = 'default', frame, gyro } = req.body;
    if (!frame) {
      return res.status(400).json({ error: 'Missing frame' });
    }

    let session = droneSessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        latestFrame: frame,
        gyro: gyro || { pitch: 0, roll: 0, heading: 140 },
        lastUpdated: Date.now(),
        sseClients: [],
      };
      droneSessions.set(sessionId, session);
    } else {
      session.latestFrame = frame;
      if (gyro) session.gyro = gyro;
      session.lastUpdated = Date.now();
    }

    // Push to SSE listeners
    const payload = JSON.stringify({
      type: 'FRAME',
      frame: session.latestFrame,
      gyro: session.gyro,
      timestamp: session.lastUpdated,
    });

    session.sseClients = session.sseClients.filter((client) => {
      try {
        client.write(`data: ${payload}\n\n`);
        return true;
      } catch {
        return false;
      }
    });

    res.json({ ok: true, timestamp: session.lastUpdated });
  });

  // Server-Sent Events stream for website HUD to receive live frames
  app.get('/api/drone/frame-sse', (req: Request, res: Response) => {
    const sessionId = (req.query.session as string) || 'default';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    let session = droneSessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        latestFrame: null,
        gyro: { pitch: 0, roll: 0, heading: 140 },
        lastUpdated: Date.now(),
        sseClients: [],
      };
      droneSessions.set(sessionId, session);
    }

    session.sseClients.push(res);

    // If frame is already available and fresh (< 15s), send immediately
    if (session.latestFrame && Date.now() - session.lastUpdated < 15000) {
      res.write(`data: ${JSON.stringify({
        type: 'FRAME',
        frame: session.latestFrame,
        gyro: session.gyro,
        timestamp: session.lastUpdated,
      })}\n\n`);
    }

    req.on('close', () => {
      if (session) {
        session.sseClients = session.sseClients.filter((c) => c !== res);
      }
    });
  });

  // Poll fallback for latest frame
  app.get('/api/drone/latest-frame', (req: Request, res: Response) => {
    const sessionId = (req.query.session as string) || 'default';
    const session = droneSessions.get(sessionId);
    if (!session || !session.latestFrame || Date.now() - session.lastUpdated > 15000) {
      return res.json({ active: false });
    }
    res.json({
      active: true,
      frame: session.latestFrame,
      gyro: session.gyro,
      timestamp: session.lastUpdated,
    });
  });

  // Drone Camera Proxy for local Play Store apps (IP Webcam, DroidCam, etc.)
  app.get('/api/drone/camera-proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }
    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'RESQNET-Drone-Streamer/1.0' },
      });
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch stream');
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (response.body) {
        const stream = response.body as any;
        if (typeof stream.pipe === 'function') {
          stream.pipe(res);
        } else {
          const buffer = await response.arrayBuffer();
          res.send(Buffer.from(buffer));
        }
      } else {
        res.status(500).send('Empty body');
      }
    } catch (err: any) {
      res.status(502).json({ error: `Cannot reach phone stream at ${targetUrl}: ${err.message}` });
    }
  });

  // ==========================================
  // AccuWeather Core Weather API Gateway & Proxy
  // ==========================================
  const ACCUWEATHER_BASE_URL = 'https://dataservice.accuweather.com';
  const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY || 'zpka_589df2013c2f4a4ab8650ded0c4057eb_9709fdea';

  interface WeatherCacheItem<T = any> {
    data: T;
    timestamp: number;
  }
  const weatherMemoryCache = new Map<string, WeatherCacheItem>();
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to preserve quota

  const getCachedOrFetch = async <T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> => {
    const cached = weatherMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const fresh = await fetcher();
    weatherMemoryCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
    return fresh;
  };

  // Status & Configuration Check
  app.get('/api/weather/config', (req: Request, res: Response) => {
    res.json({
      configured: !!ACCUWEATHER_API_KEY,
      provider: 'AccuWeather Core Weather API (Zuplo Gateway)',
      keyPrefix: ACCUWEATHER_API_KEY ? `${ACCUWEATHER_API_KEY.slice(0, 8)}...` : 'none',
      defaultDemoLocation: {
        key: '349727',
        name: 'New York City',
        state: 'New York',
        country: 'United States',
      },
      keralaDemoLocation: {
        key: '204289',
        name: 'Kochi (Aluva Sector)',
        state: 'Kerala',
        country: 'India',
      },
    });
  });

  // City Search (/locations/v1/cities/search)
  app.get('/api/weather/search', async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      return res.status(400).json({ error: 'Search query "q" parameter is required' });
    }
    try {
      const cacheKey = `search:${q.trim().toLowerCase()}`;
      const results = await getCachedOrFetch(cacheKey, async () => {
        const url = `${ACCUWEATHER_BASE_URL}/locations/v1/cities/search?apikey=${ACCUWEATHER_API_KEY}&q=${encodeURIComponent(q.trim())}`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'RESQNET-Weather/1.0' } });
        if (!resp.ok) {
          throw new Error(`AccuWeather search error (${resp.status}): ${resp.statusText}`);
        }
        return await resp.json();
      });
      res.json(results);
    } catch (err: any) {
      console.error('AccuWeather City Search Failed:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Geoposition Search (/locations/v1/cities/geoposition/search)
  app.get('/api/weather/geoposition', async (req: Request, res: Response) => {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }
    try {
      const cacheKey = `geo:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`;
      const result = await getCachedOrFetch(cacheKey, async () => {
        const url = `${ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${lat},${lng}`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'RESQNET-Weather/1.0' } });
        if (!resp.ok) {
          throw new Error(`AccuWeather geoposition error (${resp.status}): ${resp.statusText}`);
        }
        return await resp.json();
      });
      res.json(result);
    } catch (err: any) {
      console.error('AccuWeather Geoposition Search Failed:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // 5-Day Daily Forecast (/forecasts/v1/daily/5day/:locationKey)
  app.get('/api/weather/forecasts/5day/:locationKey', async (req: Request, res: Response) => {
    const locationKey = req.params.locationKey || '349727';
    try {
      const cacheKey = `5day:${locationKey}`;
      const forecast = await getCachedOrFetch(cacheKey, async () => {
        const url = `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&metric=true&details=true`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'RESQNET-Weather/1.0' } });
        if (!resp.ok) {
          throw new Error(`AccuWeather 5-day forecast error (${resp.status}): ${resp.statusText}`);
        }
        return await resp.json();
      });
      res.json(forecast);
    } catch (err: any) {
      console.error('AccuWeather 5-day forecast Failed:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Current Conditions (/currentconditions/v1/:locationKey)
  app.get('/api/weather/current/:locationKey', async (req: Request, res: Response) => {
    const locationKey = req.params.locationKey || '349727';
    try {
      const cacheKey = `curr:${locationKey}`;
      const current = await getCachedOrFetch(cacheKey, async () => {
        const url = `${ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'RESQNET-Weather/1.0' } });
        if (!resp.ok) {
          throw new Error(`AccuWeather current conditions error (${resp.status}): ${resp.statusText}`);
        }
        return await resp.json();
      });
      res.json(current);
    } catch (err: any) {
      console.error('AccuWeather Current Conditions Failed:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Comprehensive Weather Overview (Combines Location + Current + 5-Day Forecast into LiveWeatherReport)
  app.get('/api/weather/overview', async (req: Request, res: Response) => {
    try {
      let locationKey = (req.query.key as string) || '';
      let locationName = '';
      let stateName = '';
      let countryName = '';
      let latitude = 0;
      let longitude = 0;

      // 1. Resolve Location Key if missing
      if (!locationKey) {
        const q = (req.query.q as string) || '';
        const lat = req.query.lat as string;
        const lng = req.query.lng as string;

        if (lat && lng) {
          const geoUrl = `${ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${lat},${lng}`;
          const geoResp = await fetch(geoUrl);
          if (geoResp.ok) {
            const geoData = await geoResp.json();
            locationKey = geoData.Key;
            locationName = geoData.LocalizedName;
            stateName = geoData.AdministrativeArea?.LocalizedName || '';
            countryName = geoData.Country?.LocalizedName || '';
            latitude = geoData.GeoPosition?.Latitude || parseFloat(lat);
            longitude = geoData.GeoPosition?.Longitude || parseFloat(lng);
          }
        } else if (q) {
          const searchUrl = `${ACCUWEATHER_BASE_URL}/locations/v1/cities/search?apikey=${ACCUWEATHER_API_KEY}&q=${encodeURIComponent(q)}`;
          const sResp = await fetch(searchUrl);
          if (sResp.ok) {
            const sData = await sResp.json();
            if (sData && sData.length > 0) {
              const first = sData[0];
              locationKey = first.Key;
              locationName = first.LocalizedName;
              stateName = first.AdministrativeArea?.LocalizedName || '';
              countryName = first.Country?.LocalizedName || '';
              latitude = first.GeoPosition?.Latitude || 0;
              longitude = first.GeoPosition?.Longitude || 0;
            }
          }
        }
      }

      // Default fallback location key: 349727 (New York City) as highlighted in quickstart, or 204289 (Kochi)
      if (!locationKey) {
        locationKey = '349727';
        locationName = 'New York City';
        stateName = 'New York';
        countryName = 'United States';
        latitude = 40.7128;
        longitude = -74.006;
      }

      if (!locationName) {
        const knownLocations: Record<string, { name: string; state: string; country: string; lat: number; lng: number }> = {
          '349727': { name: 'New York City', state: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
          '204289': { name: 'Kochi (Aluva Sector)', state: 'Kerala', country: 'India', lat: 10.088, lng: 76.354 },
          '315201': { name: 'Mussoorie', state: 'Uttarakhand', country: 'India', lat: 30.46, lng: 78.064 },
          '3615367': { name: 'Meppadi / Wayanad', state: 'Kerala', country: 'India', lat: 11.554, lng: 76.126 },
          '202396': { name: 'National Capital Region', state: 'Delhi', country: 'India', lat: 28.614, lng: 77.209 },
          '2875398': { name: 'Aluva / Kadungalloor', state: 'Kerala', country: 'India', lat: 10.108, lng: 76.352 },
        };
        if (knownLocations[locationKey]) {
          locationName = knownLocations[locationKey].name;
          stateName = knownLocations[locationKey].state;
          countryName = knownLocations[locationKey].country;
          latitude = knownLocations[locationKey].lat;
          longitude = knownLocations[locationKey].lng;
        } else {
          try {
            const locUrl = `${ACCUWEATHER_BASE_URL}/locations/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}`;
            const lResp = await fetch(locUrl);
            if (lResp.ok) {
              const lData = await lResp.json();
              locationName = lData.LocalizedName || '';
              stateName = lData.AdministrativeArea?.LocalizedName || '';
              countryName = lData.Country?.LocalizedName || '';
              latitude = lData.GeoPosition?.Latitude || 0;
              longitude = lData.GeoPosition?.Longitude || 0;
            }
          } catch (e) {
            console.warn('Location lookup fallback warning:', e);
          }
        }
      }

      // 2. Fetch 5-Day Forecast & Current Conditions in parallel
      const [forecastData, currentData] = await Promise.all([
        getCachedOrFetch(`5day:${locationKey}`, async () => {
          const fResp = await fetch(
            `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&metric=true&details=true`
          );
          if (!fResp.ok) throw new Error(`Forecast fetch failed: ${fResp.status}`);
          return await fResp.json();
        }),
        getCachedOrFetch(`curr:${locationKey}`, async () => {
          const cResp = await fetch(
            `${ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`
          );
          if (!cResp.ok) throw new Error(`Current conditions fetch failed: ${cResp.status}`);
          return await cResp.json();
        }).catch((e) => {
          console.warn('Optional current conditions fetch warning:', e.message);
          return null;
        }),
      ]);

      const curr = Array.isArray(currentData) && currentData.length > 0 ? currentData[0] : null;
      const dailyForecasts = forecastData.DailyForecasts || [];
      const firstDay = dailyForecasts[0];

      const currentTemp = curr?.Temperature?.Metric?.Value ?? (firstDay?.Temperature?.Maximum?.Value ? Math.round(firstDay.Temperature.Maximum.Value - 1) : 24);
      const feelsLike = curr?.RealFeelTemperature?.Metric?.Value ?? Math.round(currentTemp + 1);
      const humidity = curr?.RelativeHumidity ?? 72;
      const windSpeed = curr?.Wind?.Speed?.Metric?.Value ?? (firstDay?.Day?.Wind?.Speed?.Value || 12);
      const precipitation = curr?.PrecipitationSummary?.PastHour?.Metric?.Value ?? (curr?.HasPrecipitation ? 1.5 : 0);
      const condition = curr?.WeatherText || firstDay?.Day?.IconPhrase || 'Variable Skies';
      const rainProbability = firstDay?.Day?.PrecipitationProbability ?? (curr?.HasPrecipitation ? 80 : 25);

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const formattedForecast = dailyForecasts.map((d: any) => {
        const dateObj = new Date(d.Date || d.EpochDate * 1000);
        const dayStr = daysOfWeek[dateObj.getDay()] || 'Day';
        return {
          day: dayStr,
          condition: d.Day?.IconPhrase || 'Fair',
          maxTemp: Math.round(d.Temperature?.Maximum?.Value ?? 25),
          minTemp: Math.round(d.Temperature?.Minimum?.Value ?? 18),
          rainProb: d.Day?.PrecipitationProbability ?? (d.Day?.HasPrecipitation ? 75 : 15),
          iconPhrase: d.Day?.IconPhrase,
          nightCondition: d.Night?.IconPhrase,
        };
      });

      res.json({
        latitude,
        longitude,
        locationName: locationName || `Sector ${locationKey}`,
        state: stateName,
        country: countryName,
        locationKey,
        temperature: currentTemp,
        humidity,
        precipitation,
        windSpeed,
        condition,
        feelsLike,
        rainProbability,
        updatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        accuHeadline: forecastData.Headline?.Text || '',
        accuSeverity: forecastData.Headline?.Severity || 0,
        accuMobileLink: forecastData.Headline?.MobileLink || curr?.MobileLink || `https://www.accuweather.com`,
        uvIndex: curr?.UVIndex ?? 5,
        forecast: formattedForecast,
        source: 'AccuWeather Core Weather API via Zuplo Gateway',
      });
    } catch (err: any) {
      console.error('Error generating weather overview:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch weather overview' });
    }
  });

  // AccuWeather Quick-Start Playground Console (Directly executes user-specified endpoints)
  app.post('/api/weather/test-console', async (req: Request, res: Response) => {
    const { endpoint = '/forecasts/v1/daily/5day/349727', method = 'GET', queryParams = {} } = req.body;

    const startTime = Date.now();
    try {
      // Clean endpoint path
      let cleanEndpoint = endpoint.trim();
      if (!cleanEndpoint.startsWith('/')) {
        cleanEndpoint = `/${cleanEndpoint}`;
      }

      // Security check: Only allow AccuWeather endpoints
      const allowedPrefixes = ['/forecasts/', '/locations/', '/currentconditions/', '/indices/', '/alarms/'];
      const isAllowed = allowedPrefixes.some((prefix) => cleanEndpoint.startsWith(prefix));
      if (!isAllowed) {
        return res.status(400).json({
          error: `Endpoint must start with one of: ${allowedPrefixes.join(', ')}`,
        });
      }

      // Build target URL
      const urlObj = new URL(`${ACCUWEATHER_BASE_URL}${cleanEndpoint}`);
      urlObj.searchParams.set('apikey', ACCUWEATHER_API_KEY);

      // Add queryParams (e.g. q="New York City", metric=true, etc.)
      if (queryParams && typeof queryParams === 'object') {
        for (const [k, v] of Object.entries(queryParams)) {
          if (v !== undefined && v !== null && k !== 'apikey') {
            urlObj.searchParams.set(k, String(v));
          }
        }
      }

      if (!urlObj.searchParams.has('metric') && cleanEndpoint.includes('/forecasts/')) {
        urlObj.searchParams.set('metric', 'true');
      }

      const response = await fetch(urlObj.toString(), {
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'RESQNET-AccuWeather-Playground/1.0',
          Accept: 'application/json',
        },
      });

      const durationMs = Date.now() - startTime;
      const status = response.status;
      const statusText = response.statusText;
      const rawText = await response.text();

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      // Safe representation of masked URL for display
      const safeDisplayUrl = urlObj.toString().replace(ACCUWEATHER_API_KEY, `${ACCUWEATHER_API_KEY.slice(0, 8)}...`);

      res.json({
        endpoint: cleanEndpoint,
        url: safeDisplayUrl,
        method: method.toUpperCase(),
        status,
        statusText,
        durationMs,
        data,
        headline: data?.Headline?.Text,
        dailyForecastsCount: Array.isArray(data?.DailyForecasts) ? data.DailyForecasts.length : undefined,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      res.status(500).json({
        endpoint,
        error: err.message || 'Execution error in test console',
        durationMs,
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RESQNET Command Center Server running on http://localhost:${PORT}`);
  });
}

startServer();
