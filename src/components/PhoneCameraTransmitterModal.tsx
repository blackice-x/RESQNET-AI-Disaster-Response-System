import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  QrCode,
  X,
  Copy,
  Check,
  Camera,
  RotateCcw,
  Zap,
  Radio,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Wifi,
} from 'lucide-react';

interface PhoneCameraTransmitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFrameReceived?: (frameDataUrl: string, gyro: { pitch: number; roll: number; heading: number }) => void;
}

export const PhoneCameraTransmitterModal: React.FC<PhoneCameraTransmitterModalProps> = ({
  isOpen,
  onClose,
  onFrameReceived,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pairingUrl, setPairingUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'QR_PAIR' | 'TEST_TRANSMITTER'>('QR_PAIR');

  // Test Transmitter inside modal state
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [gyroTelemetry, setGyroTelemetry] = useState<{ pitch: number; roll: number; heading: number }>({
    pitch: 0,
    roll: 0,
    heading: 142,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>('drone-live-1');
  const [isPhoneConnectedLive, setIsPhoneConnectedLive] = useState<boolean>(false);

  // Generate QR Code on mount or open
  useEffect(() => {
    if (!isOpen) return;

    const sId = `drone-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveSessionId(sId);
    const origin = window.location.origin;
    const url = `${origin}/?drone_transmitter=true&session=${sId}`;
    setPairingUrl(url);

    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0891b2',
        light: '#020617',
      },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('Error generating QR code:', err));

    // 1. Initialize BroadcastChannel for same-device frames
    try {
      const channel = new BroadcastChannel('resqnet_drone_link');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'DRONE_FRAME' && event.data.frame) {
          setIsPhoneConnectedLive(true);
          if (onFrameReceived) {
            onFrameReceived(event.data.frame, event.data.gyro || { pitch: 0, roll: 0, heading: 140 });
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // 2. Initialize Server-Sent Events (SSE) for real cross-device streaming from phone
    try {
      const es = new EventSource(`/api/drone/frame-sse?session=${sId}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.frame) {
            setIsPhoneConnectedLive(true);
            if (onFrameReceived) {
              onFrameReceived(data.frame, data.gyro || { pitch: 0, roll: 0, heading: 140 });
            }
          }
        } catch (parseErr) {
          console.warn('Error parsing SSE frame:', parseErr);
        }
      };

      es.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (err) {
      console.warn('SSE error:', err);
    }

    // 3. Fallback poll interval
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/drone/latest-frame?session=${sId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.active && data.frame) {
            setIsPhoneConnectedLive(true);
            if (onFrameReceived) {
              onFrameReceived(data.frame, data.gyro || { pitch: 0, roll: 0, heading: 140 });
            }
          }
        }
      } catch {
        // Silent fallback
      }
    }, 250);

    return () => {
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isOpen, onFrameReceived]);

  // Start internal test transmitter stream
  const startTransmitterStream = async () => {
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

      setIsTransmitting(true);

      // Start frame broadcaster loop
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
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

          // Broadcast to Drone Surveillance
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'DRONE_FRAME',
              frame: dataUri,
              gyro: gyroTelemetry,
            });
          }
          if (onFrameReceived) {
            onFrameReceived(dataUri, gyroTelemetry);
          }
        }
      }, 90);
    } catch (err: any) {
      console.warn('Could not start test transmitter camera:', err);
    }
  };

  // Stop camera when closing
  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsTransmitting(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  // Handle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorch = !torchActive;
      // @ts-expect-error torch constraint
      await track.applyConstraints({ advanced: [{ torch: newTorch }] });
      setTorchActive(newTorch);
    } catch (e) {
      console.warn('Torch constraint not supported on this device/browser:', e);
      setTorchActive(!torchActive);
    }
  };

  // Flip Camera
  const toggleCameraFacing = async () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    if (isTransmitting) {
      stopCamera();
      setTimeout(() => startTransmitterStream(), 300);
    }
  };

  const handleCopyLink = () => {
    if (!pairingUrl) return;
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <span>Pair Mobile Phone Drone Camera</span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-700 rounded-full">
                  WIRELESS LINK
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect your smartphone camera live into the SEOC Tactical Drone Feed
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/40 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('QR_PAIR');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'QR_PAIR'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code Pairing (Zero-App)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('TEST_TRANSMITTER');
              startTransmitterStream();
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'TEST_TRANSMITTER'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Test Transmitter Here</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'QR_PAIR' ? (
            <div className="space-y-4 text-center">
              {/* QR Code Canvas */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 bg-slate-950 border-2 border-cyan-500/50 rounded-2xl shadow-xl inline-block">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scan to pair mobile camera"
                      className="w-56 h-56 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-500">
                      Generating QR Matrix...
                    </div>
                  )}
                </div>
                {isPhoneConnectedLive ? (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-500/80 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-lg shadow-emerald-900/40">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-bold">SMARTPHONE CONNECTED LIVE!</span>
                    </div>
                    <button
                      onClick={onClose}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      View Live Feed &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-xs font-mono text-cyan-400 flex items-center justify-center space-x-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Scan with Phone Camera or Google Lens (Session: {activeSessionId})</span>
                  </div>
                )}
              </div>

              {/* Instructions Steps */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-left text-xs space-y-2">
                <div className="font-bold text-white flex items-center space-x-1.5 text-[11px] uppercase tracking-wider text-cyan-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>How Phone Pairing Works</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Open your smartphone camera or QR scanner.</li>
                  <li>Scan the QR code above or copy the link below.</li>
                  <li>Tap <strong>&ldquo;Allow Camera Access&rdquo;</strong> on your phone.</li>
                  <li>Your phone&apos;s back camera instantly feeds live into this tactical drone dashboard!</li>
                </ol>
              </div>

              {/* Link Copy Box */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={pairingUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Launch in new tab button */}
              <a
                href={pairingUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-cyan-700/60 hover:bg-cyan-600 border border-cyan-500/50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Transmitter in Separate Tab to Test Pairing</span>
              </a>
            </div>
          ) : (
            /* TEST TRANSMITTER VIEW */
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-cyan-500/50 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Tactical Status Overlay */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 border border-cyan-500/40 rounded text-[10px] font-mono text-cyan-300 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span>LIVE TRANSMITTER BEACON &bull; 720p 60FPS</span>
                </div>

                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  GYRO: PITCH {gyroTelemetry.pitch}° &bull; ROLL {gyroTelemetry.roll}° &bull; HDG {gyroTelemetry.heading}°
                </div>
              </div>

              {/* Transmitter Controls */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  onClick={toggleCameraFacing}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl flex items-center justify-center space-x-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Switch: {cameraFacing === 'environment' ? 'Back (Drone)' : 'Front'}</span>
                </button>
                <button
                  onClick={toggleTorch}
                  className={`py-2.5 px-3 border rounded-xl flex items-center justify-center space-x-2 transition-colors ${
                    torchActive
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${torchActive ? 'text-amber-200 fill-amber-200' : 'text-slate-400'}`} />
                  <span>Torch: {torchActive ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="p-3 bg-cyan-950/60 border border-cyan-600/40 rounded-xl text-xs text-cyan-300 flex items-center justify-between">
                <span>Broadcasting frame packets to Command Center Drone HUD...</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Encrypted WebRTC P2P + BroadcastLink Channel
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
