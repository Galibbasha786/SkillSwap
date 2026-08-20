// frontend-web/src/components/exam/Proctoring.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';
import examProctoringService from '../../services/examProctoringService';

const Proctoring = ({
  examId,
  studentId,
  studentName,
  onViolation,
  enabled = true,
  violations = 0,
  initialCameraStream = null,
  initialScreenStream = null,
  initialCombinedStream = null,
  onRegisterCleanup,
  onForceEnded
}) => {
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
  const screenStreamRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const teacherAudioRef = useRef(null);
  const onViolationRef = useRef(onViolation);
  const mountedRef = useRef(true);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [teacherSpeaking, setTeacherSpeaking] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [screenSharing, setScreenSharing] = useState(!!initialScreenStream);

  const stopAllMedia = useCallback(() => {
    examProctoringService.stopStudentStream();
    combinedStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenStreamRef.current = null;
    combinedStreamRef.current = null;
    if (teacherAudioRef.current) {
      teacherAudioRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScreenSharing(false);
    setStreamConnected(false);
  }, []);

  const attachPreview = useCallback(async () => {
    const cam = streamRef.current || initialCameraStream;
    if (!cam || !videoRef.current) return false;

    if (videoRef.current.srcObject !== cam) {
      videoRef.current.srcObject = cam;
    }

    try {
      await videoRef.current.play();
      setCameraActive(true);
      setCameraError(false);
      setScreenSharing(!!(screenStreamRef.current || initialScreenStream));
      if (videoRef.current.videoWidth > 0) {
        setVideoDimensions({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });
      }
      return true;
    } catch (err) {
      console.warn('Preview play failed:', err);
      return false;
    }
  }, [initialCameraStream, initialScreenStream]);

  const mergeProctoringCallbacks = useCallback(() => ({
    onTeacherAudio: (remoteStream) => {
      if (teacherAudioRef.current) {
        teacherAudioRef.current.srcObject = remoteStream;
        teacherAudioRef.current.play().catch(() => {});
        setTeacherSpeaking(true);
      }
    },
    onConnected: () => setStreamConnected(true),
    onMicControl: ({ muted }) => {
      setMicEnabled(!muted);
      if (muted) toast('Your microphone was muted by the teacher', { icon: '🔇' });
    },
    onForceEnded: (payload) => {
      stopAllMedia();
      onForceEnded?.(payload);
    }
  }), [onForceEnded, stopAllMedia]);

  useEffect(() => {
    onRegisterCleanup?.(stopAllMedia);
    return () => onRegisterCleanup?.(null);
  }, [onRegisterCleanup, stopAllMedia]);

  const lastViolationTimeRef = useRef({
    face_missing: 0,
    multiple_faces: 0,
    tab_switch: 0,
    fullscreen_exit: 0,
    mouse_leave: 0
  });

  // Load only tiny face detector first — faster startup; landmarks load in background
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const CDN_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

        await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL);
        setModelsLoaded(true);
        setModelLoadError(false);
        setLoadingModels(false);

        Promise.all([
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
        ]).catch(() => {});
      } catch (cdnError) {
        console.error('❌ Model loading failed:', cdnError);
        setModelLoadError(true);
        setModelsLoaded(false);
        setLoadingModels(false);
      }
    };

    loadModels();
  }, []);

  // Initialize camera + mic (+ screen if not pre-acquired) once
  useEffect(() => {
    if (!enabled || !examId || !studentId) return;

    mountedRef.current = true;
    let cameraStream = initialCameraStream;
    let screenStream = initialScreenStream;

    const buildCombinedStream = (cam, scr) => {
      const combined = new MediaStream();
      cam.getVideoTracks().forEach((t) => combined.addTrack(t));
      if (scr) {
        scr.getVideoTracks().forEach((t) => combined.addTrack(t));
      }
      cam.getAudioTracks().forEach((t) => combined.addTrack(t));
      return combined;
    };

    const attachScreenEndedHandler = (scr) => {
      const track = scr?.getVideoTracks()[0];
      if (!track) return;
      track.onended = () => {
        if (!mountedRef.current) return;
        setScreenSharing(false);
        screenStreamRef.current = null;
        if (streamRef.current) {
          const combined = buildCombinedStream(streamRef.current, null);
          combinedStreamRef.current = combined;
          examProctoringService.updateStudentStream(combined);
          toast.warning('Screen sharing stopped — please share again', { duration: 4000 });
          onViolationRef.current?.({ type: 'screen_denied', details: 'Screen share stopped during exam' });
        }
      };
    };

    const startWithStreams = async (cam, scr, combined, { skipWebRtcRestart = false } = {}) => {
      streamRef.current = cam;
      screenStreamRef.current = scr;
      combinedStreamRef.current = combined;

      await attachPreview();

      if (scr) attachScreenEndedHandler(scr);

      if (skipWebRtcRestart) {
        examProctoringService.mergeStudentCallbacks(mergeProctoringCallbacks());
        if (examProctoringService.isStudentActiveFor(examId, studentId)) {
          setStreamConnected(true);
        }
        return;
      }

      examProctoringService.startStudentStream({
        userId: String(studentId),
        examId,
        studentName: studentName || 'Student',
        stream: combined,
        callbacks: mergeProctoringCallbacks()
      });
    };

      const initProctoring = async () => {
      try {
        if (initialCombinedStream && initialCameraStream) {
          const alreadyLive = examProctoringService.isStudentActiveFor(examId, studentId);
          await startWithStreams(
            initialCameraStream,
            initialScreenStream,
            initialCombinedStream,
            { skipWebRtcRestart: alreadyLive }
          );
          return;
        }

        console.warn('Proctoring streams missing — waiting for setup');
        setCameraError(true);
        toast.error('Camera/screen setup incomplete. Please refresh and try again.');
      } catch (error) {
        console.error('❌ Camera/mic access error:', error);
        if (!mountedRef.current) return;
        setCameraError(true);
        setCameraActive(false);
        onViolationRef.current?.({ type: 'camera_denied', details: error.message });
        toast.error('Camera and microphone access required for proctoring');
      }
    };

    initProctoring();

    return () => {
      mountedRef.current = false;
      if (teacherAudioRef.current) {
        teacherAudioRef.current.srcObject = null;
      }
    };
  }, [enabled, examId, studentId, initialCameraStream, initialScreenStream, initialCombinedStream, studentName, attachPreview, mergeProctoringCallbacks]);

  // Re-attach preview when video element mounts (face models load must not block camera)
  useEffect(() => {
    if (!enabled || !initialCameraStream) return;
    streamRef.current = initialCameraStream;
    screenStreamRef.current = initialScreenStream;
    combinedStreamRef.current = initialCombinedStream;
    attachPreview();
  }, [enabled, initialCameraStream, initialScreenStream, initialCombinedStream, attachPreview, loadingModels]);

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    examProctoringService.setStudentMicEnabled(next);
  };

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
    stopAllMedia();

    try {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      let scr = null;
      try {
        scr = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 10, max: 15 } },
          audio: false
        });
        setScreenSharing(true);
      } catch {
        setScreenSharing(false);
        toast.error('Screen sharing is required. Please allow screen share.');
      }

      streamRef.current = cam;
      screenStreamRef.current = scr;
      const combined = new MediaStream();
      cam.getVideoTracks().forEach((t) => combined.addTrack(t));
      scr?.getVideoTracks().forEach((t) => combined.addTrack(t));
      cam.getAudioTracks().forEach((t) => combined.addTrack(t));
      combinedStreamRef.current = combined;

      if (videoRef.current) {
        videoRef.current.srcObject = cam;
        await videoRef.current.play();
        setCameraActive(true);
        setCameraError(false);
      }

      examProctoringService.startStudentStream({
        userId: String(studentId),
        examId,
        studentName: studentName || 'Student',
        stream: combined,
        callbacks: {
          onTeacherAudio: (remoteStream) => {
            if (teacherAudioRef.current) {
              teacherAudioRef.current.srcObject = remoteStream;
              teacherAudioRef.current.play().catch(() => {});
            }
          },
          onConnected: () => setStreamConnected(true)
        }
      });
    } catch (err) {
      setCameraError(true);
    }
  };

  return (
    <>
      {/* Hidden audio element for teacher voice during live exam */}
      <audio ref={teacherAudioRef} autoPlay playsInline className="hidden" />

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
                    {cameraActive ? '📷 Live' : cameraError ? '❌ Camera Error' : '⏳ Starting...'}
                  </div>
                  {loadingModels && (
                    <div className="absolute top-1 right-1 z-10 text-white text-[9px] bg-blue-600/80 px-1 py-0.5 rounded">
                      AI loading
                    </div>
                  )}
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
                    {streamConnected ? 'Live to teacher' : 'Connecting...'}
                  </div>
                )}

                {screenSharing && (
                  <div className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg">
                    🖥 Screen shared
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleMic}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium shadow-lg ${
                    micEnabled ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                  }`}
                  title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micEnabled ? '🎤 Mic On' : '🔇 Mic Off'}
                </button>

                {teacherSpeaking && (
                  <div className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg animate-pulse">
                    Teacher speaking
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