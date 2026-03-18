// src/components/video/VideoCall.jsx

import React, { useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiVideo, FiMic, FiMicOff, FiVideoOff, FiUsers } from 'react-icons/fi';

const VideoCall = ({ session, onClose }) => {
  const navigate = useNavigate();
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const roomName = `SkillSwap-${session._id}-${Date.now()}`;

  const handleApiReady = (api) => {
    console.log('Jitsi API ready', api);
    
    // Store API reference for later use
    window.jitsiApi = api;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{session?.title || 'Video Session'}</h2>
            <span className="text-sm bg-blue-500 px-2 py-1 rounded">
              {session?.skillName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Jitsi Meeting */}
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
          enableEmailInStats: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup',
            'profile', 'chat', 'recording', 'livestreaming',
            'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'stats'
          ],
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100vh';
          iframeRef.style.width = '100%';
        }}
        onApiReady={handleApiReady}
      />
    </div>
  );
};

export default VideoCall;