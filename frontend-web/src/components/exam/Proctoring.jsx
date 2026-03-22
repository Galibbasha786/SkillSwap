// frontend-web/src/components/exam/Proctoring.jsx

import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';

const Proctoring = ({ examId, onViolation, enabled = true }) => {
  const [violations, setViolations] = useState(0);
  const [faceDetected, setFaceDetected] = useState(true);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load models from CDN
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('✅ Face detection models loaded');
        setModelsLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load face detection models:', error);
        toast.error('Face detection unavailable - continuing without it');
        setModelsLoaded(true); // Continue without face detection
      }
    };
    loadModels();
  }, []);

  // Initialize camera
  useEffect(() => {
    if (!enabled || !modelsLoaded) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraActive(true);
          console.log('✅ Camera started for proctoring');
        }
      } catch (error) {
        console.error('❌ Camera access denied:', error);
        toast.error('Camera access required for proctoring');
        onViolation({ type: 'camera_denied', details: 'Camera access denied' });
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, modelsLoaded]);

  // Start face detection loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoRef.current) return;

    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.videoWidth === 0) return;

      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        
        const facePresent = !!detection;
        setFaceDetected(facePresent);
        
        if (!facePresent && detectionIntervalRef.current) {
          const violation = { type: 'face_missing', details: 'Face not detected' };
          onViolation(violation);
          setViolations(prev => prev + 1);
          toast.warning('Warning: Face not detected!');
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 3000); // Check every 3 seconds

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraActive, modelsLoaded, onViolation]);

  // Proctoring event listeners
  useEffect(() => {
    if (!enabled) return;

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation = { type: 'tab_switch', details: 'Switched to another tab' };
        onViolation(violation);
        setViolations(prev => prev + 1);
        toast.error('Warning: Tab switching detected!');
      }
    };

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setFullscreenActive(isFullscreen);
      
      if (!isFullscreen && fullscreenActive) {
        const violation = { type: 'fullscreen_exit', details: 'Exited fullscreen mode' };
        onViolation(violation);
        toast.error('Warning: Fullscreen mode required!');
      }
    };

    // Mouse leave detection
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        const violation = { type: 'mouse_leave', details: 'Mouse left the window' };
        onViolation(violation);
        toast.warning('Warning: Stay within the exam window!');
      }
    };

    // Window resize detection (could indicate screenshot attempt)
    const handleResize = () => {
      // Check for suspicious window size changes
      if (window.outerWidth !== window.innerWidth || window.outerHeight !== window.innerHeight) {
        const violation = { type: 'window_resize', details: 'Window size changed' };
        onViolation(violation);
      }
    };

    // Context menu detection (right-click)
    const handleContextMenu = (e) => {
      e.preventDefault();
      const violation = { type: 'right_click', details: 'Right-click detected' };
      onViolation(violation);
      toast.warning('Right-click disabled during exam');
      return false;
    };

    // Copy/paste prevention
    const handleCopy = (e) => {
      e.preventDefault();
      const violation = { type: 'copy_attempt', details: 'Copy attempted' };
      onViolation(violation);
      toast.warning('Copying is disabled during exam');
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      const violation = { type: 'paste_attempt', details: 'Paste attempted' };
      onViolation(violation);
      toast.warning('Pasting is disabled during exam');
      return false;
    };

    // Screenshot detection (keyboard shortcuts)
    const handleKeyDown = (e) => {
      // Print Screen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        const violation = { type: 'screenshot_attempt', details: 'PrintScreen detected' };
        onViolation(violation);
        toast.warning('Screenshots are not allowed');
      }
      // Ctrl+P for print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        const violation = { type: 'print_attempt', details: 'Print attempted' };
        onViolation(violation);
        toast.warning('Printing is disabled during exam');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
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

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      {/* Hidden video element for face detection */}
      {cameraActive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ position: 'fixed', top: -1000, left: -1000, width: '1px', height: '1px' }}
        />
      )}
      
      {/* Violations counter */}
      {violations > 0 && (
        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          Violations: {violations}/5
        </div>
      )}
      
      {/* Face detection status */}
      {!faceDetected && (
        <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-pulse">
          Face Not Detected
        </div>
      )}
      
      {/* Face detected indicator */}
      {faceDetected && cameraActive && violations === 0 && (
        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          Face Detected ✓
        </div>
      )}
      
      {/* Fullscreen button */}
      {!fullscreenActive && (
        <button
          onClick={enterFullscreen}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-colors"
        >
          Enter Fullscreen
        </button>
      )}
      
      {/* Models loading indicator */}
      {!modelsLoaded && (
        <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          Loading...
        </div>
      )}
    </div>
  );
};

export default Proctoring;