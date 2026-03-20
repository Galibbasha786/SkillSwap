// src/components/video/VideoCall.jsx

import React, { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { FiX, FiLoader } from 'react-icons/fi';
import { sessionAPI } from '../../services/api';
import toast from 'react-hot-toast';

const VideoCall = ({ session, onClose }) => {
  const [loading, setLoading] = useState(true);
  const roomName = `SkillSwap-${session._id}`;
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const initializeCall = async () => {
      try {
        await sessionAPI.updateStatus(session._id, 'ongoing');
        console.log('Session status updated');
      } catch (error) {
        console.error('Failed to update session status:', error);
      }
    };
    initializeCall();
  }, [session._id]);

  const handleApiReady = () => {
    console.log('Jitsi API ready');
    setLoading(false);
    toast.success('Connected to video call');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center text-white">
            <FiLoader className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-xl">Starting video call...</p>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-semibold">{session?.title}</h2>
            <p className="text-sm opacity-75">
              {session.teacherId?.name === currentUser?.name 
                ? 'You are the teacher' 
                : `Teacher: ${session.teacherId?.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <FiX className="w-6 h-6" />
          </button>
        </div>
      </div>

      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          // Disable ALL authentication and pre-join screens
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableBeforeUnloadHandlers: true,
          
          // Media settings
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          
          // UI settings
          disableDeepLinking: true,
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          
          // Disable authentication completely
          enableAuth: false,
          enableFeaturesBasedOnToken: false,
          
          // Disable any moderator requirements
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          
          // Network settings
          p2p: {
            enabled: true,
            stunServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        }}
        interfaceConfigOverwrite={{
          // Hide all Jitsi branding
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0a0a0a',
          
          // Hide login button
          HIDE_INVITE_MORE_HEADER: true,
          
          // Minimal toolbar
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'hangup'
          ],
          
          // Disable all authentication UI
          AUTHENTICATION_ENABLE: false,
          
          // Remove any login prompts
          SETTINGS_SECTIONS: ['devices', 'language']
        }}
        userInfo={{
          displayName: currentUser?.name || 'User',
          email: currentUser?.email || ''
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100vh';
          iframeRef.style.width = '100%';
          iframeRef.style.border = 'none';
        }}
        onApiReady={handleApiReady}
        onReadyToClose={onClose}
      />
    </div>
  );
};

export default VideoCall;