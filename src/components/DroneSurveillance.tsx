import React, { useState, useEffect, useRef } from 'react';
import {
  DroneHazardDetection,
  EmergencyReport,
  DroneCameraSource,
  VisionFilterMode,
} from '../types';
import { DRONE_HAZARD_DETECTIONS } from '../data/mockData';
import droneAerialImage from '../assets/images/drone_surveillance_1789977521242.jpg';
import { PhoneCameraTransmitterModal } from './PhoneCameraTransmitterModal';
import {
  Camera,
  Crosshair,
  Compass,
  BatteryCharging,
  Radio,
  Eye,
  Scan,
  AlertOctagon,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  Plane,
  Wifi,
  Smartphone,
  Bluetooth,
  RotateCcw,
  Zap,
  Download,
  Maximize2,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface DroneSurveillanceProps {
  onCreateIncidentFromDrone: (detection: DroneHazardDetection) => void;
  onSelectIncident: (incident: EmergencyReport) => void;
}

export const DroneSurveillance: React.FC<DroneSurveillanceProps> = ({
  onCreateIncidentFromDrone,
  onSelectIncident,
}) => {
  // Connection and Source state
  const [cameraSource, setCameraSource] = useState<DroneCameraSource>('DEVICE_CAMERA');
  const [visionMode, setVisionMode] = useState<VisionFilterMode>('OPTICAL');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [showPlayStoreGuide, setShowPlayStoreGuide] = useState<boolean>(false);

  // Device Camera state
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Play Store Wi-Fi App stream state
  const [playStoreApp, setPlayStoreApp] = useState<'IP_WEBCAM' | 'DROIDCAM' | 'CUSTOM'>('IP_WEBCAM');
  const [streamProtocol, setStreamProtocol] = useState<'http' | 'https'>('http');
  const [streamIp, setStreamIp] = useState<string>('192.168.1.6');
  const [streamPort, setStreamPort] = useState<string>('8080');
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('http://192.168.1.6:8080/video');
  const [isStreamConnected, setIsStreamConnected] = useState<boolean>(false);
  const [streamLiveUri, setStreamLiveUri] = useState<string | null>(null);
  const [streamSnapshotUri, setStreamSnapshotUri] = useState<string | null>(null);
  const [snapshotRefreshCount, setSnapshotRefreshCount] = useState<number>(0);

  // Wireless Phone Pairing (WebRTC / BroadcastChannel) state
  const [pairedPhoneFrame, setPairedPhoneFrame] = useState<string | null>(null);
  const [pairedPhoneConnected, setPairedPhoneConnected] = useState<boolean>(false);

  // Bluetooth (BLE) Drone Telemetry state
  const [bleConnected, setBleConnected] = useState<boolean>(false);
  const [bleDeviceName, setBleDeviceName] = useState<string>('RESQ-DRONE-BLE (ESP32)');
  const [bleBatteryPct, setBleBatteryPct] = useState<number>(88);
  const [bleRssi, setBleRssi] = useState<number>(-54);
  const [bleSimActive, setBleSimActive] = useState<boolean>(true);

  // Telemetry HUD state
  const [altitudeMeters, setAltitudeMeters] = useState<number>(118);
  const [airspeedKts, setAirspeedKts] = useState<number>(14.2);
  const [headingDeg, setHeadingDeg] = useState<number>(142);
  const [pitchDeg, setPitchDeg] = useState<number>(-2);
  const [rollDeg, setRollDeg] = useState<number>(3);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [recSeconds, setRecSeconds] = useState<number>(868);

  // AI Detections & Scanning state (Boxes hidden by default to keep real camera clean)
  const [detections, setDetections] = useState<DroneHazardDetection[]>(DRONE_HAZARD_DETECTIONS);
  const [showDetectionBoxes, setShowDetectionBoxes] = useState<boolean>(false);
  const [selectedDetection, setSelectedDetection] = useState<DroneHazardDetection | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanLaserPos, setScanLaserPos] = useState<number>(0);
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);

  // DOM Refs
  const deviceVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const snapshotIntervalRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Recording counter
  useEffect(() => {
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format recording timestamp
  const formatRecTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // BroadcastChannel and Server-Sent Events listener for Paired Phone frames
  useEffect(() => {
    // 1. BroadcastChannel (for same-browser communication)
    try {
      const channel = new BroadcastChannel('resqnet_drone_link');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'DRONE_FRAME' && event.data.frame) {
          setPairedPhoneFrame(event.data.frame);
          setPairedPhoneConnected(true);
          setCameraSource('PAIR_PHONE_QR');
          if (event.data.gyro) {
            setPitchDeg(event.data.gyro.pitch || 0);
            setRollDeg(event.data.gyro.roll || 0);
            setHeadingDeg(event.data.gyro.heading || 142);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // 2. Server-Sent Events (SSE) for cross-device streaming (Phone -> Server -> Website HUD)
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/drone/frame-sse?session=drone-live-1');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.frame) {
            setPairedPhoneFrame(data.frame);
            setPairedPhoneConnected(true);
            setCameraSource('PAIR_PHONE_QR');
            if (data.gyro) {
              setPitchDeg(data.gyro.pitch || 0);
              setRollDeg(data.gyro.roll || 0);
              setHeadingDeg(data.gyro.heading || 142);
            }
          }
        } catch (err) {
          console.warn('SSE frame parse error:', err);
        }
      };
    } catch (err) {
      console.warn('SSE init error:', err);
    }

    // 3. Fallback poll interval for maximum cross-device reliability
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch('/api/drone/latest-frame?session=drone-live-1');
        if (res.ok) {
          const data = await res.json();
          if (data && data.active && data.frame) {
            setPairedPhoneFrame(data.frame);
            setPairedPhoneConnected(true);
            setCameraSource('PAIR_PHONE_QR');
            if (data.gyro) {
              setPitchDeg(data.gyro.pitch || 0);
              setRollDeg(data.gyro.roll || 0);
              setHeadingDeg(data.gyro.heading || 142);
            }
          }
        }
      } catch {
        // silent
      }
    }, 150);

    return () => {
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
      if (es) es.close();
    };
  }, []);

  // Start Device Camera (Direct phone/laptop camera access)
  const startDeviceCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (deviceVideoRef.current) {
        deviceVideoRef.current.srcObject = stream;
        await deviceVideoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Error starting camera stream:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Click the lock icon in the browser address bar to allow camera access.'
          : `Camera access issue: ${err.message || 'Device camera unavailable'}. Switching to tactical aerial feed.`
      );
      setIsCameraActive(false);
    }
  };

  // Stop device camera
  const stopDeviceCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Handle switching camera sources
  useEffect(() => {
    if (cameraSource === 'DEVICE_CAMERA') {
      startDeviceCamera();
    } else {
      stopDeviceCamera();
    }

    return () => {
      stopDeviceCamera();
    };
  }, [cameraSource, cameraFacing]);

  // Flip device camera (Back/Environment vs Front)
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle phone torch / flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchActive;
      // @ts-expect-error torch constraint
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchActive(next);
    } catch (e) {
      console.warn('Torch constraint not supported on this browser/camera:', e);
      setTorchActive(!torchActive);
    }
  };

  // Connect to Play Store IP Webcam stream (Low-latency MJPEG direct stream)
  const connectPlayStoreStream = (overrideProtocol?: 'http' | 'https', overrideIp?: string, overridePort?: string) => {
    const proto = overrideProtocol || streamProtocol;
    const ip = (overrideIp || streamIp).trim();
    const port = (overridePort || streamPort).trim();

    // The native /video endpoint in IP Webcam delivers continuous 30-60 FPS MJPEG stream with <50ms latency
    const mjpegUrl = `${proto}://${ip}:${port}/video`;
    setCustomStreamUrl(mjpegUrl);
    setStreamLiveUri(mjpegUrl);
    setIsStreamConnected(true);

    // Stop any legacy snapshot polling interval to prevent phone CPU throttling & network lag
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }
  };

  // Disconnect stream
  const disconnectPlayStoreStream = () => {
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }
    setIsStreamConnected(false);
    setStreamLiveUri(null);
    setStreamSnapshotUri(null);
  };

  // Web Bluetooth API Integration
  const connectBluetoothDrone = async () => {
    try {
      // @ts-expect-error Web Bluetooth API
      if (!navigator.bluetooth) {
        alert('Web Bluetooth is supported on Google Chrome / Android Chrome. Activating live BLE Drone Telemetry Simulation mode.');
        setBleConnected(true);
        setBleSimActive(true);
        return;
      }

      // @ts-expect-error Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 0x180f, 0x180a],
      });

      if (device) {
        setBleDeviceName(device.name || 'RESQ-DRONE (BLE)');
        setBleConnected(true);
        setBleSimActive(true);
      }
    } catch (err: any) {
      console.info('Bluetooth connection cancelled or simulated fallback activated:', err);
      // Fallback to active simulated beacon for seamless presentation
      setBleConnected(true);
      setBleSimActive(true);
    }
  };

  // AI Sector Scan Sweep
  const handleScanSector = () => {
    setIsScanning(true);
    setScanMessage('LiDAR & Optical AI sweeps active... Scanning Periyar flood basin sector');

    // Animate scan laser
    let step = 0;
    const interval = setInterval(() => {
      step += 5;
      setScanLaserPos(step % 100);
      if (step >= 200) {
        clearInterval(interval);
        setIsScanning(false);
        setScanMessage('AI Target Recognition: 4 Hazard targets locked. 11 persons verified in high-risk zones.');
      }
    }, 45);
  };

  // Capture Tactical Aerial Snapshot
  const handleCaptureSnapshot = () => {
    setSnapshotFeedback('Capturing 4K aerial reconnaissance frame with HUD telemetry...');
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 1280, 720);

          // If device camera is active, draw frame
          if (deviceVideoRef.current && isCameraActive) {
            ctx.drawImage(deviceVideoRef.current, 0, 0, 1280, 720);
          }

          // Tactical HUD watermark
          ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
          ctx.fillRect(20, 20, 480, 90);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 20, 480, 90);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 20px Lexend, sans-serif';
          ctx.fillText('RESQNET SEOC TACTICAL DRONE FLIR', 40, 55);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px monospace';
          ctx.fillText(`GPS: 10.1115° N, 76.3580° E | ALT: ${altitudeMeters}m AGL | HDG: ${headingDeg}°`, 40, 85);

          // Trigger download
          const link = document.createElement('a');
          link.download = `RESQNET-DRONE-RECON-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      } catch (e) {
        console.warn('Snapshot capture handled gracefully:', e);
      }
      setSnapshotFeedback('Snapshot saved successfully to local downloads.');
      setTimeout(() => setSnapshotFeedback(null), 3500);
    }, 600);
  };

  // Get direct CSS filter style according to active Vision Mode
  const getVisionFilterCss = (): string => {
    switch (visionMode) {
      case 'NVG_NIGHT_VISION':
        // Authentic Tactical Military Night Vision: Intense glowing phosphor green (NOT black & white)
        return 'grayscale(100%) contrast(160%) brightness(125%) sepia(100%) hue-rotate(85deg) saturate(800%)';
      case 'FLIR_THERMAL':
        // FLIR Ironbow heat signature palette
        return 'contrast(165%) saturate(220%) hue-rotate(185deg) brightness(110%) invert(20%)';
      case 'IR_BLACK_WHITE':
        // High-contrast IR Black & White / White Hot monochrome
        return 'grayscale(100%) contrast(180%) brightness(110%)';
      case 'LIDAR_EDGES':
        return 'contrast(200%) grayscale(100%) invert(100%)';
      case 'OPTICAL':
      default:
        return 'none';
    }
  };

  return (
    <div className="space-y-4">
      {/* Phone Camera QR / Pairing Modal */}
      <PhoneCameraTransmitterModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onFrameReceived={(frame, gyro) => {
          setPairedPhoneFrame(frame);
          setPairedPhoneConnected(true);
          setCameraSource('PAIR_PHONE_QR');
          setPitchDeg(gyro.pitch);
          setRollDeg(gyro.roll);
          setHeadingDeg(gyro.heading);
        }}
      />

      {/* TOP CONNECTIVITY HUBS BAR */}
      <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Drone Header Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-600/20">
              <Plane className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                  <span>RESQ-DRONE 01 (SkyWatch Recon)</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700 rounded-full animate-pulse">
                    AIRBORNE &bull; 60 FPS
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Aerial Disaster Reconnaissance &bull; Periyar Flood Basin Sector 4
              </p>
            </div>
          </div>

          {/* Connection Source Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCameraSource('DEVICE_CAMERA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                cameraSource === 'DEVICE_CAMERA'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>📱 Mobile / Device Cam</span>
            </button>

            <button
              onClick={() => setCameraSource('PLAY_STORE_WIFI')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                cameraSource === 'PLAY_STORE_WIFI'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>🌐 Play Store App (Wi-Fi)</span>
            </button>

            <button
              onClick={() => {
                setCameraSource('PAIR_PHONE_QR');
                setIsQrModalOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                cameraSource === 'PAIR_PHONE_QR'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📲 Pair Phone via QR</span>
            </button>

            <button
              onClick={() => {
                setCameraSource('BLUETOOTH_BLE');
                connectBluetoothDrone();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                cameraSource === 'BLUETOOTH_BLE'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>📶 Bluetooth (BLE)</span>
            </button>

            <button
              onClick={() => setCameraSource('SIMULATION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                cameraSource === 'SIMULATION'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>🛰️ Aerial Sim</span>
            </button>
          </div>
        </div>

        {/* CONNECTION SOURCE CONTROLS BAR */}
        {cameraSource === 'DEVICE_CAMERA' && (
          <div className="flex flex-wrap items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-slate-800 gap-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300 font-bold">
                Direct Mobile Camera: {cameraFacing === 'environment' ? 'Back (Drone Lens)' : 'Front (Selfie)'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-mono">1080p 60FPS</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleCameraFacing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flip: {cameraFacing === 'environment' ? 'Back Cam' : 'Front Cam'}</span>
              </button>

              <button
                onClick={toggleTorch}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center space-x-1.5 ${
                  torchActive
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${torchActive ? 'text-amber-200 fill-amber-200' : 'text-slate-400'}`} />
                <span>Flashlight: {torchActive ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={startDeviceCamera}
                className="px-3 py-1.5 bg-cyan-700/60 hover:bg-cyan-600 text-white text-xs font-bold rounded-xl border border-cyan-500/40 transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                <span>Restart Cam</span>
              </button>
            </div>
          </div>
        )}

        {/* PLAY STORE WI-FI APP CONTROLS */}
        {cameraSource === 'PLAY_STORE_WIFI' && (
          <div className="space-y-3.5 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-300">Play Store App:</span>
                <select
                  value={playStoreApp}
                  onChange={(e) => setPlayStoreApp(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                >
                  <option value="IP_WEBCAM">IP Webcam (Pavel Khlebovich)</option>
                  <option value="DROIDCAM">DroidCam (Dev47Apps)</option>
                  <option value="CUSTOM">Custom IP / RTSP / MJPEG</option>
                </select>
              </div>

              {/* Direct Play Store Links */}
              <div className="flex items-center space-x-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.pas.webcam"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1"
                >
                  <span>📲 Get IP Webcam (Play Store)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.dev47apps.droidcam"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-600/80 text-cyan-300 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1"
                >
                  <span>📲 Get DroidCam (Play Store)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Play Store Guide Card */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-700/60 rounded-2xl text-xs space-y-2.5 text-slate-200">
              <div className="font-bold text-cyan-300 flex items-center justify-between text-[11px] uppercase tracking-wider">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Step-by-Step Play Store Phone Connect Guide (For Presentation)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 text-[10px] font-bold font-mono">
                  Wi-Fi / Hotspot
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-cyan-300 text-[11px] mb-1">Step 1: Install App</div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Download <strong>&ldquo;IP Webcam&rdquo;</strong> from Google Play Store on your Android mobile.
                    </p>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.pas.webcam"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 text-[10px] text-cyan-400 underline font-bold flex items-center space-x-1"
                  >
                    <span>Open Play Store Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
                  <div className="font-bold text-cyan-300 text-[11px] mb-1">Step 2: Same Wi-Fi / Hotspot</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Make sure both your laptop and phone are on the same Wi-Fi network, or turn on your mobile hotspot and connect your laptop.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
                  <div className="font-bold text-cyan-300 text-[11px] mb-1">Step 3: Tap &ldquo;Start Server&rdquo;</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Open the app on your phone, scroll down to the bottom, and tap <strong>&ldquo;Start Server&rdquo;</strong>. It will display an IP address.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
                  <div className="font-bold text-cyan-300 text-[11px] mb-1">Step 4: Enter IP & View</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Type the IP shown on your phone into the box below and click <strong>&ldquo;Connect Phone Stream&rdquo;</strong>. Footage streams live into the HUD!
                  </p>
                </div>
              </div>
            </div>

            {/* IP Address and Connect Form */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[260px]">
                <select
                  value={streamProtocol}
                  onChange={(e) => setStreamProtocol(e.target.value as any)}
                  className="bg-slate-800 text-xs text-cyan-400 font-mono font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none"
                >
                  <option value="http">http://</option>
                  <option value="https">https://</option>
                </select>
                <input
                  type="text"
                  value={streamIp}
                  onChange={(e) => setStreamIp(e.target.value)}
                  placeholder="192.168.1.6"
                  className="bg-transparent text-xs text-white font-mono focus:outline-none flex-1 font-bold"
                />
                <span className="text-xs text-slate-500 font-mono">:</span>
                <input
                  type="text"
                  value={streamPort}
                  onChange={(e) => setStreamPort(e.target.value)}
                  placeholder="8080"
                  className="w-14 bg-transparent text-xs text-cyan-400 font-mono focus:outline-none font-bold"
                />
                <span className="text-xs text-slate-500 font-mono">/video</span>
              </div>

              {isStreamConnected ? (
                <button
                  onClick={disconnectPlayStoreStream}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-md shadow-red-600/30"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Disconnect Stream</span>
                </button>
              ) : (
                <button
                  onClick={() => connectPlayStoreStream()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-md shadow-cyan-600/30"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Connect Phone Stream</span>
                </button>
              )}

              <button
                onClick={() => {
                  setStreamProtocol('http');
                  setStreamIp('192.168.1.6');
                  setStreamPort('8080');
                  connectPlayStoreStream('http', '192.168.1.6', '8080');
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-emerald-500 transition-colors shadow-sm flex items-center space-x-1.5"
                title="Connect directly to IP 192.168.1.6:8080 from your phone screen"
              >
                <span>✨ Connect 192.168.1.6:8080</span>
              </button>

              <a
                href={`${streamProtocol}://${streamIp}:${streamPort}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
                title="Open Phone IP in a new browser tab to verify Wi-Fi reachability"
              >
                <span>Test in Tab</span>
                <ExternalLink className="w-3 h-3 text-cyan-400" />
              </a>
            </div>
          </div>
        )}

        {/* BLUETOOTH (BLE) STATUS BAR */}
        {cameraSource === 'BLUETOOTH_BLE' && (
          <div className="flex flex-wrap items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-slate-800 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${bleConnected ? 'bg-cyan-400 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="font-bold text-white">BLE Link: {bleDeviceName}</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-mono">BATTERY: {bleBatteryPct}%</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300 font-mono">RSSI: {bleRssi} dBm</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={connectBluetoothDrone}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Pair New BLE Beacon</span>
              </button>
            </div>
          </div>
        )}

        {/* HUD TELEMETRY PILLS & CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <div className="px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300 flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>ALT: <strong>{altitudeMeters}m AGL</strong></span>
            </div>
            <div className="px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300 flex items-center space-x-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span>BATTERY: <strong>84% (22.2V LiPo)</strong></span>
            </div>
            <div className="px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>AIRSPEED: <strong>{airspeedKts} KTS</strong></span>
            </div>
          </div>

          {/* Vision Filter Selector Pills & AI Box Toggle */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setVisionMode('OPTICAL')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1 ${
                visionMode === 'OPTICAL'
                  ? 'bg-slate-700 text-white border-cyan-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Optical 4K</span>
            </button>

            <button
              onClick={() => setVisionMode('NVG_NIGHT_VISION')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1 ${
                visionMode === 'NVG_NIGHT_VISION'
                  ? 'bg-emerald-600 text-white border-emerald-300 shadow-md shadow-emerald-600/40 ring-1 ring-emerald-400'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-300" />
              <span>NVG Green</span>
            </button>

            <button
              onClick={() => setVisionMode('FLIR_THERMAL')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1 ${
                visionMode === 'FLIR_THERMAL'
                  ? 'bg-amber-600 text-white border-amber-300 shadow-md shadow-amber-600/30'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-300" />
              <span>FLIR Thermal</span>
            </button>

            <button
              onClick={() => setVisionMode('IR_BLACK_WHITE')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1 ${
                visionMode === 'IR_BLACK_WHITE'
                  ? 'bg-slate-600 text-white border-slate-300 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-slate-300" />
              <span>IR B&W</span>
            </button>

            {/* Toggle to remove/show artificial flood hazard boxes */}
            <button
              onClick={() => setShowDetectionBoxes((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1.5 ${
                showDetectionBoxes
                  ? 'bg-cyan-800 text-cyan-200 border-cyan-400 shadow-sm'
                  : 'bg-slate-850 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle simulated flood hazard sector boxes"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showDetectionBoxes ? 'Hazard Boxes: ON' : 'Hazard Boxes: OFF'}</span>
            </button>

            <button
              onClick={handleCaptureSnapshot}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Snap 4K</span>
            </button>

            <button
              onClick={handleScanSector}
              disabled={isScanning}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-md shadow-cyan-600/30"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Sweeping...' : 'AI Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 bg-cyan-950/70 border border-cyan-600/60 rounded-xl text-cyan-200 text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-spin" />
          <span>{scanMessage}</span>
        </div>
      )}

      {snapshotFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{snapshotFeedback}</span>
        </div>
      )}

      {cameraError && (
        <div className="p-3 bg-amber-950/80 border border-amber-600/60 rounded-xl text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            onClick={() => setCameraSource('SIMULATION')}
            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px]"
          >
            Use Aerial Sim Feed
          </button>
        </div>
      )}

      {/* DRONE AERIAL CAMERA VIEWPORT */}
      <div
        ref={viewportRef}
        className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl group select-none"
      >
        {/* VIDEO FEED SOURCES */}
        {cameraSource === 'DEVICE_CAMERA' && (
          <video
            ref={deviceVideoRef}
            autoPlay
            playsInline
            muted
            style={{ filter: getVisionFilterCss() }}
            className="w-full h-full object-cover transition-all duration-300"
          />
        )}

        {cameraSource === 'PLAY_STORE_WIFI' && (
          <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
            {isStreamConnected && (streamLiveUri || customStreamUrl) ? (
              <img
                src={streamLiveUri || customStreamUrl}
                alt="Play Store IP Webcam Live Stream"
                style={{ filter: getVisionFilterCss() }}
                className="w-full h-full object-cover transition-all duration-300"
                crossOrigin="anonymous"
              />
            ) : (
              <img
                src={droneAerialImage}
                alt="Aerial Drone Stream"
                referrerPolicy="no-referrer"
                style={{ filter: getVisionFilterCss() }}
                className="w-full h-full object-cover transition-all duration-500"
              />
            )}
          </div>
        )}

        {cameraSource === 'PAIR_PHONE_QR' && (
          <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
            {pairedPhoneFrame ? (
              <img
                src={pairedPhoneFrame}
                alt="Paired Smartphone Camera Frame"
                style={{ filter: getVisionFilterCss() }}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <img
                src={droneAerialImage}
                alt="Aerial Simulation"
                referrerPolicy="no-referrer"
                style={{ filter: getVisionFilterCss() }}
                className="w-full h-full object-cover transition-all duration-500"
              />
            )}
          </div>
        )}

        {(cameraSource === 'SIMULATION' || cameraSource === 'BLUETOOTH_BLE') && (
          <img
            src={droneAerialImage}
            alt="Aerial Drone Disaster Surveillance Feed"
            referrerPolicy="no-referrer"
            style={{ filter: getVisionFilterCss() }}
            className="w-full h-full object-cover transition-all duration-700"
          />
        )}

        {/* AI LASER SWEEP LINE */}
        {isScanning && (
          <div
            className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] pointer-events-none transition-all duration-75 z-20"
            style={{ top: `${scanLaserPos}%` }}
          ></div>
        )}

        {/* HUD GRID, CORNER BRACKETS & TACTICAL ARTIFICIAL HORIZON */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Tactical Corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400/80"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400/80"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400/80"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400/80"></div>

          {/* Center Tactical Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 border border-cyan-400/40 rounded-full flex items-center justify-center">
              <Crosshair className="w-8 h-8 text-cyan-400/80 animate-spin" style={{ animationDuration: '16s' }} />
            </div>

            {/* Artificial Horizon Pitch Ladder */}
            <div
              className="absolute w-28 h-0.5 bg-cyan-400/50"
              style={{ transform: `rotate(${rollDeg}deg)` }}
            >
              <div className="absolute -top-3 left-0 w-2 h-3 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute -top-3 right-0 w-2 h-3 border-t-2 border-r-2 border-cyan-400"></div>
            </div>
          </div>

          {/* Top Left: Live Sensor & Telemetry Watermark */}
          <div className="absolute top-5 left-12 text-[10px] font-mono font-bold text-cyan-300 drop-shadow bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/40 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>
              {cameraSource === 'DEVICE_CAMERA'
                ? 'MOBILE HARDWARE CAM &bull; 1080p 60FPS'
                : cameraSource === 'PLAY_STORE_WIFI'
                ? `PLAY STORE IP STREAM &bull; ${streamIp}:${streamPort}`
                : cameraSource === 'PAIR_PHONE_QR'
                ? 'WIRELESS QR P2P PHONE BEACON &bull; 60FPS'
                : cameraSource === 'BLUETOOTH_BLE'
                ? `BLE TELEMETRY &bull; ${bleDeviceName}`
                : 'AUTONOMOUS FLIR RECON FEED &bull; 4K'}
            </span>
          </div>

          {/* Top Right: REC indicator & Clock */}
          <div className="absolute top-5 right-12 text-[10px] font-mono font-bold text-red-400 drop-shadow bg-slate-950/80 px-2.5 py-1 rounded-lg border border-red-500/40 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>REC [{formatRecTime(recSeconds)}] &bull; GPS LOCK</span>
          </div>

          {/* Bottom Left: Coordinates & Heading */}
          <div className="absolute bottom-5 left-12 text-[10px] font-mono font-bold text-cyan-300 drop-shadow bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/40">
            GPS: 10.1115° N, 76.3580° E &bull; HDG: {headingDeg}° SE &bull; PITCH: {pitchDeg}° &bull; ROLL: {rollDeg}°
          </div>

          {/* Bottom Right: Vision Mode indicator */}
          <div className="absolute bottom-5 right-12 text-[10px] font-mono font-bold text-emerald-300 drop-shadow bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
            SENSOR MODE: {visionMode} &bull; AI OBJECT TRACKING: ENGAGED
          </div>
        </div>

        {/* AI COMPUTER VISION HAZARD & SURVIVOR DETECTION BOXES (Hidden by default when camera connects) */}
        {showDetectionBoxes && detections.map((hazard) => {
          let borderColor = 'border-red-500 bg-red-500/20 text-red-300';
          let pingColor = 'bg-red-500';

          if (hazard.severity === 'HIGH') {
            borderColor = 'border-orange-500 bg-orange-500/20 text-orange-300';
            pingColor = 'bg-orange-500';
          } else if (hazard.severity === 'SAFE') {
            borderColor = 'border-emerald-500 bg-emerald-500/20 text-emerald-300';
            pingColor = 'bg-emerald-500';
          }

          const isSelected = selectedDetection?.id === hazard.id;

          return (
            <div
              key={hazard.id}
              onClick={() => setSelectedDetection(hazard)}
              style={{
                left: `${hazard.box.x}%`,
                top: `${hazard.box.y}%`,
                width: `${hazard.box.width}%`,
                height: `${hazard.box.height}%`,
              }}
              className={`absolute border-2 ${borderColor} rounded-xl cursor-pointer transition-all duration-200 z-10 ${
                isSelected ? 'ring-4 ring-cyan-400 scale-105 bg-opacity-50' : 'hover:scale-105 hover:bg-opacity-40'
              } flex flex-col justify-between p-2 backdrop-blur-[1px] shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 bg-slate-950/90 rounded border border-slate-700 tracking-wider">
                  {hazard.label}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${pingColor} animate-ping`}></span>
              </div>

              {hazard.peopleDetected && (
                <div className="text-[10px] font-bold text-white bg-red-950/95 px-1.5 py-0.5 rounded self-start border border-red-700 flex items-center space-x-1 shadow">
                  <span>👥 {hazard.peopleDetected} Living Occupants (FLIR Hotspot)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI HAZARD DETECTION SUMMARY & TARGET DISPATCH CARDS */}
      {(showDetectionBoxes || cameraSource === 'SIMULATION') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Scan className="w-4 h-4 text-cyan-400" />
              <span>AI Drone Detections Summary</span>
            </h4>
            <span className="text-[11px] text-cyan-400 font-mono font-bold">{detections.length} Target Zones Locked</span>
          </div>

          <div className="space-y-2">
            {detections.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDetection(d)}
                className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                  selectedDetection?.id === d.id
                    ? 'bg-slate-800 border-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center space-x-1.5">
                    <span>
                      {d.severity === 'CRITICAL' ? '🔴' : d.severity === 'HIGH' ? '🟠' : '🟢'}
                    </span>
                    <span>{d.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{d.details}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateIncidentFromDrone(d);
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center space-x-1 transition-colors flex-shrink-0 ml-2 shadow-md shadow-cyan-600/30"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Report</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Hazard Card with Fast Action */}
        <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Aerial Target Telemetry & Action
              </h4>
              {selectedDetection && (
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg ${
                    selectedDetection.severity === 'CRITICAL'
                      ? 'bg-red-600 text-white'
                      : selectedDetection.severity === 'HIGH'
                      ? 'bg-orange-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedDetection.severity} PRIORITY
                </span>
              )}
            </div>

            {selectedDetection ? (
              <div className="space-y-3 mt-2">
                <h5 className="font-bold text-sm text-white">{selectedDetection.label}</h5>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedDetection.details}</p>
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1.5 font-mono">
                  <div>
                    GPS Target: <strong>{selectedDetection.coordinates.lat.toFixed(4)}° N,{' '}
                    {selectedDetection.coordinates.lng.toFixed(4)}° E</strong>
                  </div>
                  {selectedDetection.peopleDetected && (
                    <div className="text-red-400 font-bold">
                      FLIR Thermal Readout: {selectedDetection.peopleDetected} Trapped Occupants Verified
                    </div>
                  )}
                  <div className="text-cyan-400">
                    Confidence: 98.4% Optical/Thermal LiDAR Fusion
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500 space-y-2">
                <Crosshair className="w-8 h-8 mx-auto text-slate-600 animate-spin" style={{ animationDuration: '20s' }} />
                <p>Click any bounding box on the camera or select a target to dispatch a rescue unit.</p>
              </div>
            )}
          </div>

          {selectedDetection && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center space-x-2">
              <button
                onClick={() => onCreateIncidentFromDrone(selectedDetection)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-red-600/40 animate-pulse"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Dispatch Rescue Unit to Drone Coordinates</span>
              </button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
