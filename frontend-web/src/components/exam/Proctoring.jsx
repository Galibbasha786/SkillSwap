// frontend-web/src/components/exam/Proctoring.jsx

import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';

const Proctoring = ({ examId, onViolation, enabled = true, violations = 0 }) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(() => {
    // Initialize with current fullscreen state
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelLoadError, setModelLoadError] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const lastViolationTimeRef = useRef({
    face_missing: 0,
    multiple_faces: 0,
    tab_switch: 0,
    fullscreen_exit: 0,
    mouse_leave: 0
  });

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        
        const CDN_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        console.log('📥 Loading face detection models from CDN...');
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
        ]);
        
        console.log('✅ Face detection models loaded successfully');
        setModelsLoaded(true);
        setModelLoadError(false);
        setLoadingModels(false);
        
      } catch (cdnError) {
        console.error('❌ Model loading failed:', cdnError);
        setModelLoadError(true);
        setModelsLoaded(false);
        setLoadingModels(false);
        toast.error('Face detection unavailable', { duration: 3000 });
      }
    };
    
    loadModels();
  }, []);

  // Initialize camera
  useEffect(() => {
    if (!enabled) return;

    const startCamera = async () => {
      console.log('🎥 Attempting to start camera...');
      
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported in this browser');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false 
        });
        
        console.log('✅ Camera stream obtained');
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
              .then(() => {
                setCameraActive(true);
                setCameraError(false);
                setVideoDimensions({
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight
                });
                console.log(`📹 Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
              })
              .catch(err => {
                console.error('❌ Video play failed:', err);
                setCameraError(true);
              });
          };
          
          videoRef.current.onerror = (err) => {
            console.error('❌ Video error:', err);
            setCameraError(true);
          };
        }
      } catch (error) {
        console.error('❌ Camera access error:', error);
        setCameraError(true);
        setCameraActive(false);
        onViolation({ type: 'camera_denied', details: error.message });
        toast.error('Camera access required for proctoring');
      }
    };
    
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, onViolation]);

  // Face detection loop with debounced violations
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoRef.current || videoRef.current.videoWidth === 0) {
      return;
    }

    let frameCount = 0;
    let noFaceCount = 0;
    
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.videoWidth === 0 || videoRef.current.paused) {
        return;
      }
      
      try {
        frameCount++;
        if (frameCount < 30) return;
        frameCount = 0;
        
        const detection = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        
        const faceCount = detection.length;
        const facePresent = faceCount >= 1;
        setFaceDetected(facePresent);
        
        const hasMultiple = faceCount > 1;
        setMultipleFaces(hasMultiple);
        
        // Debounced violations - only trigger every 5 seconds per violation type
        const now = Date.now();
        const DEBOUNCE_INTERVAL = 5000;
        
        if (!facePresent) {
          noFaceCount++;
          if (noFaceCount >= 3 && (now - lastViolationTimeRef.current.face_missing > DEBOUNCE_INTERVAL)) {
            console.log('⚠️ No face detected violation');
            onViolation({ type: 'face_missing', details: 'Face not detected' });
            toast.warning('Warning: Face not detected!', { duration: 2000 });
            lastViolationTimeRef.current.face_missing = now;
            noFaceCount = 0;
          }
        } else {
          noFaceCount = 0;
        }
        
        if (hasMultiple && (now - lastViolationTimeRef.current.multiple_faces > DEBOUNCE_INTERVAL)) {
          console.log('⚠️ Multiple faces detected');
          onViolation({ type: 'multiple_faces', details: 'Multiple faces detected' });
          toast.error('Warning: Multiple faces detected!', { duration: 2000 });
          lastViolationTimeRef.current.multiple_faces = now;
        }
        
        // Draw detection on canvas
        if (canvasRef.current && detection.length > 0) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            detection.forEach(face => {
              const box = face.detection.box;
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
            });
          }
        } else if (canvasRef.current) {
          // Clear canvas if no face
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 2000);
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraActive, modelsLoaded, onViolation]);

  // Proctoring event listeners
  useEffect(() => {
    if (!enabled) return;

    const DEBOUNCE_INTERVAL = 5000;

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden && (now - lastViolationTimeRef.current.tab_switch > DEBOUNCE_INTERVAL)) {
        onViolation({ type: 'tab_switch', details: 'Switched to another tab' });
        toast.error('Warning: Tab switching detected!');
        lastViolationTimeRef.current.tab_switch = now;
      } else if (document.hidden) {
        toast.warning('Warning: Do not switch tabs during exam');
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const now = Date.now();
      setFullscreenActive(isFullscreen);
      
      if (!isFullscreen && fullscreenActive) {
        if (now - lastViolationTimeRef.current.fullscreen_exit > DEBOUNCE_INTERVAL) {
          onViolation({ type: 'fullscreen_exit', details: 'Exited fullscreen mode' });
          toast.error('Warning: Fullscreen mode required!');
          lastViolationTimeRef.current.fullscreen_exit = now;
        } else {
          toast.warning('Please stay in fullscreen mode');
        }
      } else if (isFullscreen) {
        lastViolationTimeRef.current.fullscreen_exit = 0;
      }
    };

    const handleMouseLeave = (e) => {
      const now = Date.now();
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        if (now - lastViolationTimeRef.current.mouse_leave > DEBOUNCE_INTERVAL) {
          onViolation({ type: 'mouse_leave', details: 'Mouse left the window' });
          toast.warning('Warning: Stay within the exam window!');
          lastViolationTimeRef.current.mouse_leave = now;
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      onViolation({ type: 'right_click', details: 'Right-click detected' });
      toast.error('Right-click is disabled during exam');
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      onViolation({ type: 'copy_attempt', details: 'Copy attempted' });
      toast.error('Copying is disabled during exam');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      onViolation({ type: 'paste_attempt', details: 'Paste attempted' });
      toast.error('Pasting is disabled during exam');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        onViolation({ type: 'screenshot_attempt', details: 'PrintScreen detected' });
        toast.error('Screenshots are not allowed');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onViolation({ type: 'print_attempt', details: 'Print attempted' });
        toast.error('Printing is disabled during exam');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        onViolation({ type: 'copy_shortcut', details: 'Copy shortcut detected' });
        toast.warning('Copying is disabled');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        onViolation({ type: 'paste_shortcut', details: 'Paste shortcut detected' });
        toast.warning('Pasting is disabled');
      }
      if (e.key === 'F12') {
        e.preventDefault();
        onViolation({ type: 'devtools_attempt', details: 'F12 pressed' });
        toast.error('Developer tools are disabled');
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

  const retryCamera = async () => {
    setCameraError(false);
    setCameraActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTimeout(() => {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: false 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraActive(true);
            setCameraError(false);
          }
        } catch (err) {
          setCameraError(true);
        }
      };
      startCamera();
    }, 100);
  };

  if (loadingModels && enabled) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-pulse">
          Loading proctoring...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Bar with Camera and Status */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left side - Camera Feed */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Camera Feed Box */}
                <div className="bg-black rounded-lg overflow-hidden shadow-lg border-2 border-blue-500" style={{ width: '160px', height: '120px' }}>
                  <div className="absolute top-1 left-1 z-10 text-white text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
                    {cameraActive ? '📷 Proctoring' : cameraError ? '❌ Camera Error' : '⏳ Starting...'}
                  </div>
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                      <button
                        onClick={retryCamera}
                        className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-600"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    style={{ display: cameraActive ? 'block' : 'none' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                </div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex gap-2">
                {cameraActive && (
                  <div className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    Live
                  </div>
                )}
                
                {modelsLoaded && cameraActive && (
                  faceDetected ? (
                    <div className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg">
                      ✓ Face Detected
                    </div>
                  ) : (
                    <div className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg animate-pulse">
                      ⚠ Face Not Detected
                    </div>
                  )
                )}
                
                {multipleFaces && (
                  <div className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg animate-pulse">
                    ⚠ Multiple Faces!
                  </div>
                )}
                
                {violations > 0 && (
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium shadow-lg ${violations >= 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}>
                    Violations: {violations}/5
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side - Fullscreen Button */}
            {!fullscreenActive && (
              <button
                onClick={enterFullscreen}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-colors flex items-center gap-1"
              >
                <span>⛶</span> Fullscreen
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Add padding to top to prevent content from being hidden under the top bar */}
      <div className="pt-16"></div>
    </>
  );
};

export default Proctoring;