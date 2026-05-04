// frontend-web/src/components/calls/VideoCallModal.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiX, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiPhone, FiPhoneOff, FiVolume2, FiVolumeX, FiSmile
} from 'react-icons/fi';
import webrtcService from '../../services/webrtcService';

const REACTION_OPTIONS = ['👍', '❤️', '😂', '👏', '🔥', '🎉'];

const VideoCallModal = ({ isOpen, onClose, callType, remoteUser, isIncoming, onAccept, onReject }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'connecting');
  const [duration, setDuration] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const reactionTimersRef = useRef([]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const addFloatingReaction = useCallback((emoji, isOwn = false) => {
    const id = `${Date.now()}-${Math.random()}`;
    const reaction = {
      id,
      emoji,
      isOwn,
      left: 20 + Math.floor(Math.random() * 55)
    };

    setFloatingReactions(prev => [...prev, reaction]);

    const timeoutId = setTimeout(() => {
      setFloatingReactions(prev => prev.filter(item => item.id !== id));
      reactionTimersRef.current = reactionTimersRef.current.filter(timer => timer !== timeoutId);
    }, 2200);

    reactionTimersRef.current.push(timeoutId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    webrtcService.onRemoteStream = (stream, isLocal = false) => {
      if (isLocal && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else if (!isLocal && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setCallStatus('connected');
        startTimer();
      }
    };

    const unsubscribeFromReactions = webrtcService.subscribeToCallReactions(({ emoji }) => {
      addFloatingReaction(emoji, false);
    });

    // Set up local stream
    if (localVideoRef.current && webrtcService.localStream) {
      localVideoRef.current.srcObject = webrtcService.localStream;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      reactionTimersRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      reactionTimersRef.current = [];
      unsubscribeFromReactions();
    };
  }, [addFloatingReaction, isIncoming, isOpen, startTimer]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleVideo = () => {
    const off = webrtcService.toggleVideo();
    setIsVideoOff(off);
  };

  const handleEndCall = () => {
    webrtcService.endCall();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  };

  const handleSendReaction = (emoji) => {
    const sent = webrtcService.sendReaction(emoji);

    if (sent) {
      addFloatingReaction(emoji, true);
      setShowReactionPicker(false);
    }
  };

  const handleAcceptCall = async () => {
    setCallStatus('connecting');
    await onAccept();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-4xl mx-4">
          {/* Remote Video */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden" style={{ height: '70vh' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            </div>

            {/* Call Info Overlay */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <p className="text-white text-sm">
                {callStatus === 'connected' ? (
                  <>{callType === 'video' ? 'Video' : 'Audio'} call with {remoteUser?.name} • {formatDuration(duration)}</>
                ) : callStatus === 'ringing' ? (
                  <>Calling {remoteUser?.name}...</>
                ) : (
                  <>Connecting...</>
                )}
              </p>
            </div>

            {/* Incoming Call Overlay */}
            {isIncoming && callStatus === 'ringing' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <FiPhone className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Incoming Call</h3>
                  <p className="text-gray-300 mb-6">{remoteUser?.name} is calling you...</p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleAcceptCall}
                      className="px-6 py-3 bg-green-500 text-white rounded-full flex items-center gap-2 hover:bg-green-600"
                    >
                      <FiPhone className="w-5 h-5" />
                      Accept
                    </button>
                    <button
                      onClick={onReject}
                      className="px-6 py-3 bg-red-500 text-white rounded-full flex items-center gap-2 hover:bg-red-600"
                    >
                      <FiPhoneOff className="w-5 h-5" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Reactions */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {floatingReactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className={`absolute bottom-24 text-5xl drop-shadow-lg animate-[reaction-float_2.2s_ease-out_forwards] ${
                    reaction.isOwn ? 'opacity-90' : 'opacity-100'
                  }`}
                  style={{ left: `${reaction.left}%` }}
                >
                  {reaction.emoji}
                </div>
              ))}
            </div>

            {/* Control Buttons */}
            {callStatus === 'connected' && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <button
                  onClick={handleToggleMute}
                  className={`p-4 rounded-full ${
                    isMuted ? 'bg-red-500' : 'bg-gray-700'
                  } hover:opacity-80 transition`}
                >
                  {isMuted ? <FiMicOff className="w-6 h-6 text-white" /> : <FiMic className="w-6 h-6 text-white" />}
                </button>
                <button
                  onClick={handleToggleVideo}
                  className={`p-4 rounded-full ${
                    isVideoOff ? 'bg-red-500' : 'bg-gray-700'
                  } hover:opacity-80 transition`}
                >
                  {isVideoOff ? <FiVideoOff className="w-6 h-6 text-white" /> : <FiVideo className="w-6 h-6 text-white" />}
                </button>
                <div className="relative">
                  {showReactionPicker && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-black/70 px-3 py-2 shadow-xl backdrop-blur">
                      {REACTION_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSendReaction(emoji)}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition hover:bg-white/15"
                          title={`Send ${emoji} reaction`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowReactionPicker(prev => !prev)}
                    className="p-4 rounded-full bg-gray-700 hover:opacity-80 transition"
                    title="Send reaction"
                  >
                    <FiSmile className="w-6 h-6 text-white" />
                  </button>
                </div>
                <button
                  onClick={handleEndCall}
                  className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition"
                >
                  <FiPhoneOff className="w-6 h-6 text-white" />
                </button>
              </div>
            )}
          </div>
          <style>{`
            @keyframes reaction-float {
              0% {
                opacity: 0;
                transform: translateY(24px) scale(0.82);
              }
              15% {
                opacity: 1;
              }
              100% {
                opacity: 0;
                transform: translateY(-190px) scale(1.28);
              }
            }
          `}</style>
      </div>
    </div>
  );
};

export default VideoCallModal;
