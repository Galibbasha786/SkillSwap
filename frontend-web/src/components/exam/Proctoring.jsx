// frontend-web/src/components/exam/Proctoring.jsx

import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';

const Proctoring = ({ examId, onViolation, enabled = true, violations = 0 }) => {
  const [faceDetected, setFaceDetected] = useState(true);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        
        // Try to load from CDN
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        console.log('📥 Loading face detection models...');
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('✅ Face detection models loaded successfully');
        setModelsLoaded(true);
        setLoadingModels(false);
      } catch (error) {
        console.error('❌ Failed to load face detection models from CDN:', error);
        
        // Try fallback - if models fail to load, still continue without face detection
        toast.error('Face detection unavailable - continuing without it');
        setModelsLoaded(false);
        setLoadingModels(false);
      }
    };
    
    loadModels();
  }, []);

  // Initialize camera
  useEffect(() => {
    if (!enabled) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraActive(true);
            console.log('✅ Camera started successfully');
          };
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        onViolation({ type: 'camera_denied', details: 'Camera access denied' });
        setCameraActive(false);
      }
    };
    
    if (!cameraActive) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, cameraActive, onViolation]);

  // Face detection loop - only if models loaded
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoRef.current) return;

    let frameCount = 0;
    
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.videoWidth === 0) return;
      
      try {
        // Only detect every 3 seconds to save CPU
        frameCount++;
        if (frameCount < 30) return; // ~30 frames = 1 second
        frameCount = 0;
        
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        
        const facePresent = !!detection;
        setFaceDetected(facePresent);
        
        if (!facePresent) {
          onViolation({ type: 'face_missing', details: 'Face not detected' });
          toast.warning('Warning: Face not detected!', { duration: 2000 });
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 3000);
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraActive, modelsLoaded, onViolation]);

  // Proctoring event listeners
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation({ type: 'tab_switch', details: 'Switched to another tab' });
        toast.error('Warning: Tab switching detected!');
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setFullscreenActive(isFullscreen);
      
      if (!isFullscreen && fullscreenActive) {
        onViolation({ type: 'fullscreen_exit', details: 'Exited fullscreen mode' });
        toast.error('Warning: Fullscreen mode required!');
      }
    };

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        onViolation({ type: 'mouse_leave', details: 'Mouse left the window' });
        toast.warning('Warning: Stay within the exam window!');
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      onViolation({ type: 'right_click', details: 'Right-click detected' });
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      onViolation({ type: 'copy_attempt', details: 'Copy attempted' });
      toast.warning('Copying is disabled during exam');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      onViolation({ type: 'paste_attempt', details: 'Paste attempted' });
      toast.warning('Pasting is disabled during exam');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        onViolation({ type: 'screenshot_attempt', details: 'PrintScreen detected' });
        toast.warning('Screenshots are not allowed');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        onViolation({ type: 'print_attempt', details: 'Print attempted' });
        toast.warning('Printing is disabled during exam');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onViolation, fullscreenActive]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  // Show loading state while models are loading
  if (loadingModels && enabled) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          Loading face detection...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      {/* Hidden video for face detection */}
      {cameraActive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ position: 'fixed', top: -1000, left: -1000, width: '1px', height: '1px' }}
        />
      )}
      
      {/* Face detection status - only show if models loaded */}
      {modelsLoaded && cameraActive && (
        faceDetected ? (
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            ✓ Face Detected
          </div>
        ) : (
          <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-pulse">
            ⚠ Face Not Detected
          </div>
        )
      )}
      
      {/* Camera active indicator */}
      {cameraActive && !modelsLoaded && (
        <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          📷 Camera Active
        </div>
      )}
      
      {/* Violations counter */}
      {violations > 0 && (
        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          Violations: {violations}/5
        </div>
      )}
      
      {/* Fullscreen button */}
      {!fullscreenActive && (
        <button
          onClick={enterFullscreen}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-colors"
        >
          ⛶ Fullscreen
        </button>
      )}
    </div>
  );
};

export default Proctoring;