import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  VideoOff, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ScanLine 
} from 'lucide-react';

interface QrCameraScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScanSuccess,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanLoopIdRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  // Play a brief high-pitched audio beep on successful scan
  const playScanBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio playback can be silenced by browser policy
    }
  }, []);

  // Parse code from QR text (which may be a full URL, JSON, or plain ID)
  const extractCode = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        const queryCode = url.searchParams.get('verify') || url.searchParams.get('code') || url.searchParams.get('id');
        if (queryCode) return queryCode.trim();

        const segments = url.pathname.split('/').filter(Boolean);
        const verifyIdx = segments.findIndex(s => s.toLowerCase() === 'verify');
        if (verifyIdx !== -1 && segments[verifyIdx + 1]) {
          return segments[verifyIdx + 1].trim();
        }
        if (segments.length > 0) {
          return segments[segments.length - 1].trim();
        }
      } catch {
        // Not a standard URL, continue
      }
    }
    return trimmed;
  }, []);

  const handleDetectedCode = useCallback((rawText: string) => {
    if (!rawText || !isScanning) return;
    setIsScanning(false);
    setLastScannedText(rawText);
    playScanBeep();

    if (navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Ignore
      }
    }

    const code = extractCode(rawText);
    setTimeout(() => {
      onScanSuccess(code);
    }, 450);
  }, [extractCode, isScanning, onScanSuccess, playScanBeep]);

  // Stop current active media stream
  const stopStream = useCallback(() => {
    if (scanLoopIdRef.current) {
      cancelAnimationFrame(scanLoopIdRef.current);
      scanLoopIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Frame processing loop with dual engine (BarcodeDetector + jsQR fallback)
  const startScanLoop = useCallback(() => {
    let lastCheckTime = 0;
    const barcodeDetectorSupported = 'BarcodeDetector' in window;
    let detector: any = null;

    if (barcodeDetectorSupported) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const tick = async (currentTime: number) => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Throttle to every ~120ms to keep CPU low
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && currentTime - lastCheckTime > 120) {
        lastCheckTime = currentTime;

        // Try BarcodeDetector first if supported
        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetectedCode(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Fall back to jsQR
          }
        }

        // Use jsQR on canvas
        if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const width = Math.min(video.videoWidth, 640);
            const height = Math.min(video.videoHeight, 480);
            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
            }

            ctx.drawImage(video, 0, 0, width, height);
            try {
              const imageData = ctx.getImageData(0, 0, width, height);
              const qr = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });
              if (qr && qr.data) {
                handleDetectedCode(qr.data);
                return;
              }
            } catch {
              // Canvas security or format issue
            }
          }
        }
      }

      scanLoopIdRef.current = requestAnimationFrame(tick);
    };

    scanLoopIdRef.current = requestAnimationFrame(tick);
  }, [handleDetectedCode, isScanning]);

  // Start Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream();
    setErrorMessage(null);
    setIsScanning(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setErrorMessage('Camera access is not supported in this browser or device.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play was delayed or auto-play prevented:', playErr);
        }
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setTorchAvailable(!!capabilities.torch);
      }

      // Enumerate other camera devices if not yet done
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (!selectedDeviceId && videoInputs.length > 0) {
          const activeTrack = stream.getVideoTracks()[0];
          const activeSettings = activeTrack ? activeTrack.getSettings() : null;
          if (activeSettings?.deviceId) {
            setSelectedDeviceId(activeSettings.deviceId);
          }
        }
      } catch {
        // Enumerate not critical
      }

      startScanLoop();
    } catch (err: any) {
      console.warn('Camera access unavailable or dismissed:', err?.name, err?.message);
      setHasCameraPermission(false);
      setIsScanning(false);
      
      const isDismissed = (err?.message && /dismiss/i.test(err.message)) || false;
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || isDismissed;
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      
      if (isDismissed) {
        setErrorMessage('Camera permission was dismissed. Tap "Allow Camera" to re-request access, or upload a photo of the QR code.');
      } else if (isDenied) {
        setErrorMessage('Camera access was not granted by your browser. Please allow camera permissions or upload an image.');
      } else if (isNotFound) {
        setErrorMessage('No camera device detected on your system. You can upload an image of the certificate QR code instead.');
      } else {
        setErrorMessage(err?.message || 'Unable to access camera.');
      }
    }
  }, [selectedDeviceId, startScanLoop, stopStream]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle not supported or failed:', err);
      }
    }
  };

  // Flip Camera
  const switchCamera = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  // Handle uploaded QR image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const qr = jsQR(imageData.data, imageData.width, imageData.height);
            if (qr && qr.data) {
              handleDetectedCode(qr.data);
            } else {
              setErrorMessage('No valid QR code could be detected in the uploaded image. Please try another photo.');
            }
          } catch (err: any) {
            setErrorMessage('Failed to decode image: ' + err.message);
          } finally {
            setIsProcessingImage(false);
          }
        }
      };
      img.onerror = () => {
        setErrorMessage('Could not load the selected image file.');
        setIsProcessingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  return (
    <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative flex flex-col">
      {/* Top Header Bar inside Scanner */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
            Live QR Code Scanner
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                torchOn 
                  ? 'bg-amber-400 text-slate-950 border-amber-300' 
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            >
              {torchOn ? <Zap className="w-3.5 h-3.5 fill-current" /> : <ZapOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {availableDevices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 text-xs transition-colors cursor-pointer"
              title="Switch camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="relative aspect-video sm:aspect-[4/3] max-h-[360px] w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Hidden canvas element for frame decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Ambient Full-Stream Vertical Scanning Sweep Overlay */}
        {hasCameraPermission && !errorMessage && isScanning && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none animate-scan-stream-sweep shadow-[0_0_16px_rgba(56,189,248,0.4)]" />
        )}

        {/* Scanner Viewfinder Overlay */}
        {hasCameraPermission && !errorMessage && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            {/* Dark vignette backdrop around central scanning window */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-sky-400/80 shadow-[0_0_0_9999px_rgba(3,7,18,0.65)] flex items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-sky-400 rounded-tl-sm" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-sky-400 rounded-tr-sm" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-sky-400 rounded-bl-sm" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-sky-400 rounded-br-sm" />

              {/* Subtle Scanning Laser Line Overlay with Trail */}
              {isScanning && !lastScannedText && (
                <>
                  {/* Glowing vertical trail moving with scan */}
                  <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-sky-400/25 via-sky-400/5 to-transparent pointer-events-none animate-scanline-trail" />

                  {/* Primary Scanning Line with glow & alignment crosshairs */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-300 to-transparent pointer-events-none animate-scanline-vertical shadow-[0_0_12px_#38bdf8,0_0_24px_rgba(56,189,248,0.6)] flex items-center justify-between px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_6px_#67e8f9]" />
                    <div className="w-2.5 h-0.5 bg-white shadow-[0_0_8px_#ffffff]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_6px_#67e8f9]" />
                  </div>
                </>
              )}

              {/* Detected state check */}
              {lastScannedText && (
                <div className="bg-emerald-600/90 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-lg backdrop-blur-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">QR Detected!</span>
                </div>
              )}
            </div>

            {/* Live scanning feedback indicator pill */}
            <div className="mt-4 flex items-center space-x-2 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-sky-400/30 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider font-mono">
                {isScanning ? 'Live Scanner Active · Sweeping Frame' : 'Processing Scan'}
              </span>
            </div>
          </div>
        )}

        {/* Camera Permission / Error State */}
        {errorMessage && (
          <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <VideoOff className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => startCamera(selectedDeviceId)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Allow Camera / Retry</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload QR Image</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                <span>Enter Code Manually</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingImage}
          className="text-slate-300 hover:text-white flex items-center space-x-1.5 py-1 px-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>{isProcessingImage ? 'Scanning Image...' : 'Upload Image Instead'}</span>
        </button>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer font-medium"
        >
          Cancel & Enter Manually
        </button>
      </div>
    </div>
  );
};
