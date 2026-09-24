import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RotateCcw,
  Zap,
  Radio,
  Shield,
  Plane,
  Compass,
  ArrowLeft,
  Crosshair,
} from 'lucide-react';

interface MobileDroneTransmitterScreenProps {
  onExit: () => void;
}

export const MobileDroneTransmitterScreen: React.FC<MobileDroneTransmitterScreenProps> = ({ onExit }) => {
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);
  const [gyro, setGyro] = useState<{ pitch: number; roll: number; heading: number }>({
    pitch: 0,
    roll: 0,
    heading: 142,
  });
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(true);
  const [framesSent, setFramesSent] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<'CONNECTING' | 'TRANSMITTING' | 'ERROR'>('TRANSMITTING');
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('session') || 'drone-live-1';
    } catch {
      return 'drone-live-1';
    }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isUploadingRef = useRef<boolean>(false);

  // Initialize camera and channel
  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('resqnet_drone_link');
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // Listen to real smartphone gyroscope orientation
    const handleOrientation = (e: DeviceOrientationEvent) => {
      setGyro({
        pitch: Math.round(e.beta || 0),
        roll: Math.round(e.gamma || 0),
        heading: Math.round(e.alpha || 142),
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Loop to capture frame and send to Command Center across the network
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(async () => {
        if (!isBroadcasting) return;
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUri = canvas.toDataURL('image/jpeg', 0.65);

          // 1. Broadcast locally (for same-browser testing)
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'DRONE_FRAME',
              frame: dataUri,
              gyro,
              sessionId,
            });
          }

          // 2. Upload to server for real cross-device streaming to website!
          if (!isUploadingRef.current) {
            isUploadingRef.current = true;
            try {
              const res = await fetch('/api/drone/frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  frame: dataUri,
                  gyro,
                }),
              });
              if (res.ok) {
                setFramesSent((prev) => prev + 1);
                setServerStatus('TRANSMITTING');
              } else {
                setServerStatus('ERROR');
              }
            } catch {
              setServerStatus('ERROR');
            } finally {
              isUploadingRef.current = false;
            }
          }
        }
      }, 85);
    } catch (err) {
      console.warn('Mobile camera access error:', err);
      setServerStatus('ERROR');
    }
  };

  useEffect(() => {
    startCamera();
  }, [cameraFacing]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchActive;
      // @ts-expect-error torch constraint
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchActive(next);
    } catch (e) {
      setTorchActive(!torchActive);
    }
  };

  const toggleCamera = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-mono select-none overflow-hidden">
      {/* Video Viewport */}
      <div className="relative flex-1 w-full h-full bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* HUD Crosshairs */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-24 h-24 border border-cyan-400/50 rounded-full flex items-center justify-center">
            <Crosshair className="w-8 h-8 text-cyan-400/80 animate-spin" style={{ animationDuration: '20s' }} />
          </div>

          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>
        </div>

        {/* Top Floating Status Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          <button
            onClick={onExit}
            className="px-3 py-1.5 bg-slate-900/90 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Command Center</span>
          </button>

          <div className="px-3 py-1 bg-cyan-950/90 border border-cyan-500/80 rounded-full text-[10px] font-bold text-cyan-300 flex items-center space-x-1.5 shadow-lg shadow-cyan-600/30">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span>LIVE AIR TO SEOC &bull; PKTS: {framesSent} &bull; #{sessionId}</span>
          </div>
        </div>

        {/* Bottom Floating Telemetry */}
        <div className="absolute bottom-20 left-3 right-3 flex items-center justify-between text-[10px] pointer-events-none">
          <div className="px-2.5 py-1 bg-slate-950/80 rounded border border-cyan-500/40 text-cyan-300">
            GYRO: P {gyro.pitch}° &bull; R {gyro.roll}° &bull; HDG {gyro.heading}°
          </div>
          <div className="px-2.5 py-1 bg-slate-950/80 rounded border border-emerald-500/40 text-emerald-300">
            SENSOR: 1080p 60FPS &bull; ENCRYPTED LINK
          </div>
        </div>
      </div>

      {/* Bottom Tactical Action Controls Bar */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-around z-20">
        <button
          onClick={toggleCamera}
          className="flex flex-col items-center space-y-1 text-slate-300 hover:text-white"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-[10px] font-sans font-bold">
            {cameraFacing === 'environment' ? 'Back Drone Cam' : 'Front Cam'}
          </span>
        </button>

        <button
          onClick={toggleTorch}
          className="flex flex-col items-center space-y-1 text-slate-300 hover:text-white"
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
              torchActive
                ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/40'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Zap className={`w-5 h-5 ${torchActive ? 'text-amber-200 fill-amber-200' : 'text-slate-400'}`} />
          </div>
          <span className="text-[10px] font-sans font-bold">
            {torchActive ? 'Torch ON' : 'Torch OFF'}
          </span>
        </button>

        <button
          onClick={() => setIsBroadcasting(!isBroadcasting)}
          className="flex flex-col items-center space-y-1 text-slate-300 hover:text-white"
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
              isBroadcasting
                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-[10px] font-sans font-bold">
            {isBroadcasting ? 'Live On Air' : 'Paused'}
          </span>
        </button>
      </div>
    </div>
  );
};
