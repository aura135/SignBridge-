import { useState, useRef, useEffect, useCallback } from 'react';

export function useCamera({ onFrameCaptured, fps = 2 } = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [hasPermission, setHasPermission] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setIsLoading(false);
  }, []);

  // Start / restart camera
  const startCamera = useCallback(async (preferredFacingMode = facingMode) => {
    stopCamera();
    setIsLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Camera unavailable. Your browser or environment does not support mediaDevices API.';
      setError(msg);
      setIsLoading(false);
      setHasPermission(false);
      return false;
    }

    try {
      const constraints = {
        video: {
          facingMode: preferredFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Camera initialization error:', err);
      let errorMsg = 'Camera unavailable. Please allow camera permission or connect a camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found. Please connect a webcam.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application.';
      }
      setError(errorMsg);
      setHasPermission(false);
      setIsLoading(false);
      setIsActive(false);
      return false;
    }
  }, [facingMode, stopCamera]);

  // Capture a single frame from video to base64 JPEG
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !isActive || videoRef.current.readyState < 2) {
      return null;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Downscale slightly for optimal neural vision transmission
    const width = 360;
    const height = Math.round((video.videoHeight / (video.videoWidth || 1)) * 360) || 270;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, [isActive]);

  // Toggle front/rear camera
  const switchFacingMode = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isActive) {
      startCamera(nextMode);
    }
  }, [facingMode, isActive, startCamera]);

  // Set up periodic frame capture callback if provided
  useEffect(() => {
    if (isActive && onFrameCaptured) {
      const intervalMs = Math.max(250, Math.round(1000 / fps));
      intervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) {
          onFrameCaptured(frame);
        }
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onFrameCaptured, fps, captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isActive,
    isLoading,
    error,
    hasPermission,
    facingMode,
    startCamera,
    stopCamera,
    captureFrame,
    switchFacingMode,
  };
}
