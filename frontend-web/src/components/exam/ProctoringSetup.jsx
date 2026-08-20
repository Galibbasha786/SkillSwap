// frontend-web/src/components/exam/ProctoringSetup.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiMic, FiMonitor, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const buildCombinedStream = (cameraStream, screenStream) => {
  const combined = new MediaStream();
  cameraStream.getVideoTracks().forEach((t) => combined.addTrack(t));
  if (screenStream) {
    screenStream.getVideoTracks().forEach((t) => combined.addTrack(t));
  }
  cameraStream.getAudioTracks().forEach((t) => combined.addTrack(t));
  return combined;
};

const PREP_SECONDS = 4 * 60; // 4-minute prep window after permissions

const ProctoringSetup = ({ onReady, onCancel, onProctoringLive }) => {
  const [cameraStatus, setCameraStatus] = useState('pending');
  const [screenStatus, setScreenStatus] = useState('pending');
  const [checking, setChecking] = useState(false);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(null);

  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const previewRef = useRef(null);
  const mountedRef = useRef(true);
  const handedOffRef = useRef(false);
  const setupStartedRef = useRef(false);

  const stopStreams = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  const requestCameraMic = useCallback(async () => {
    setChecking(true);
    setCameraStatus('pending');
    try {
      stopStreams();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      cameraStreamRef.current = stream;
      setCameraStatus('granted');
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => {});
      }
      return true;
    } catch (err) {
      console.error('Camera/mic denied:', err);
      setCameraStatus('denied');
      toast.error('Camera and microphone access is required to start the exam.');
      return false;
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, [stopStreams]);

  const requestScreenShare = useCallback(async () => {
    if (!cameraStreamRef.current) {
      toast.error('Allow camera and microphone first.');
      return false;
    }
    setChecking(true);
    setScreenStatus('pending');
    try {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } },
        audio: false,
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        systemAudio: 'exclude'
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      screenStreamRef.current = stream;
      setScreenStatus('granted');

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          if (!mountedRef.current) return;
          setScreenStatus('denied');
          screenStreamRef.current = null;
          toast.error('Screen sharing stopped. Please share your screen again to continue.');
        };
      }
      return true;
    } catch (err) {
      console.error('Screen share denied:', err);
      setScreenStatus('denied');
      toast.error('Screen sharing is required before the exam can begin.');
      return false;
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  const runSetup = useCallback(async () => {
    const camOk = await requestCameraMic();
    if (!camOk) return;
    await requestScreenShare();
  }, [requestCameraMic, requestScreenShare]);

  useEffect(() => {
    mountedRef.current = true;
    if (setupStartedRef.current) return;
    setupStartedRef.current = true;
    runSetup();
    return () => {
      mountedRef.current = false;
      if (!handedOffRef.current) {
        stopStreams();
      }
    };
  }, [runSetup, stopStreams]);

  useEffect(() => {
    if (cameraStatus !== 'granted' || screenStatus !== 'granted') {
      setPrepSecondsLeft(null);
      return;
    }
    setPrepSecondsLeft(PREP_SECONDS);
    const interval = setInterval(() => {
      setPrepSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cameraStatus, screenStatus]);

  const allGranted = cameraStatus === 'granted' && screenStatus === 'granted';
  const prepComplete = prepSecondsLeft === 0;
  const prepMinutes = prepSecondsLeft != null ? Math.floor(prepSecondsLeft / 60) : 0;
  const prepSecs = prepSecondsLeft != null ? prepSecondsLeft % 60 : 0;

  const handleBegin = () => {
    if (!allGranted || !cameraStreamRef.current) return;

    const combined = buildCombinedStream(cameraStreamRef.current, screenStreamRef.current);
    handedOffRef.current = true;
    onReady({
      cameraStream: cameraStreamRef.current,
      screenStream: screenStreamRef.current,
      combinedStream: combined
    });
  };

  // Notify parent as soon as permissions are granted so teacher can see the student during prep countdown
  const proctoringLiveSentRef = useRef(false);
  useEffect(() => {
    if (!allGranted || !cameraStreamRef.current || !onProctoringLive) return;
    if (proctoringLiveSentRef.current) return;
    proctoringLiveSentRef.current = true;
    const combined = buildCombinedStream(cameraStreamRef.current, screenStreamRef.current);
    onProctoringLive({
      cameraStream: cameraStreamRef.current,
      screenStream: screenStreamRef.current,
      combinedStream: combined
    });
  }, [allGranted, onProctoringLive]);

  const StatusRow = ({ icon: Icon, label, status, onRetry }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-blue-500" />
        <span className="font-medium text-gray-800">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === 'granted' && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <FiCheckCircle className="w-4 h-4" /> Granted
          </span>
        )}
        {status === 'denied' && (
          <>
            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
              <FiXCircle className="w-4 h-4" /> Required
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={checking}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                title="Retry"
              >
                <FiRefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              </button>
            )}
          </>
        )}
        {status === 'pending' && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Waiting...
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Proctoring Setup</h1>
            <p className="text-indigo-100 mt-1">
              Allow camera, microphone, and screen sharing before the exam questions appear.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-center">
              <div className="relative bg-black rounded-xl overflow-hidden border-2 border-blue-400 shadow-lg" style={{ width: 240, height: 180 }}>
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {!cameraStreamRef.current && cameraStatus !== 'granted' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-sm">
                    Camera preview
                  </div>
                )}
              </div>
            </div>

            <StatusRow
              icon={FiCamera}
              label="Camera & Microphone"
              status={cameraStatus}
              onRetry={requestCameraMic}
            />
            <StatusRow
              icon={FiMonitor}
              label="Screen Sharing"
              status={screenStatus}
              onRetry={requestScreenShare}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <p className="font-medium mb-1">Before you continue:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Choose your entire screen or the window where you will take the exam</li>
                <li>Keep camera, mic, and screen share on for the full exam duration</li>
                <li>All permissions will stop automatically when you submit the exam</li>
              </ul>
            </div>

            {allGranted && prepSecondsLeft > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800 font-medium">Pre-exam connection window</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {prepMinutes}:{prepSecs.toString().padStart(2, '0')}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Your teacher can see your camera and screen during this wait. Stay on this screen.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopStreams();
                  onCancel?.();
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBegin}
                disabled={!allGranted || !prepComplete || checking}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!allGranted
                  ? 'Waiting for permissions...'
                  : !prepComplete
                    ? `Begin in ${prepMinutes}:${prepSecs.toString().padStart(2, '0')}`
                    : 'Begin Exam'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProctoringSetup;
