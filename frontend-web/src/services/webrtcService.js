// frontend-web/src/services/webrtcService.js

import SimplePeer from 'simple-peer';
import io from 'socket.io-client';

class WebRTCService {
  constructor() {
    this.socket = null;
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null;
    this.onCallEnd = null;
    this.onIncomingCall = null;
    this.onCallAccepted = null;
    this.onRemoteStream = null;
    this.onCallReaction = null;
    this.callReactionListeners = new Set();
    this.isInitialized = false;
  }

  // Initialize socket connection
  init(userId, callbacks) {
    this.onIncomingCall = callbacks.onIncomingCall;
    this.onCallAccepted = callbacks.onCallAccepted;
    this.onRemoteStream = callbacks.onRemoteStream;
    this.onCallEnd = callbacks.onCallEnd;
    this.onCallReaction = callbacks.onCallReaction;

    if (this.isInitialized) {
      console.log('WebRTC already initialized');
      return;
    }
    
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    const token = localStorage.getItem('token');

    console.log('🔌 Connecting to socket server:', socketUrl);
    console.log('👤 User ID:', userId);
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token, userId }
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.socket.emit('register-user', userId);
      this.isInitialized = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.isInitialized = false;
    });

    this.socket.on('incoming-call', ({ from, callerName, signal, isVideo }) => {
      console.log('📞📞📞 INCOMING CALL RECEIVED!', { from, callerName, isVideo });
      if (this.onIncomingCall) {
        this.onIncomingCall({ from, callerName, signal, isVideo });
      }
    });

    this.socket.on('call-accepted', ({ signal, from }) => {
      console.log('✅ Call accepted from:', from);
      if (this.peer && this.currentCall?.targetUserId === from) {
        this.peer.signal(signal);
      }
      if (this.onCallAccepted) {
        this.onCallAccepted(signal, from);
      }
    });

    this.socket.on('call-rejected', ({ from, reason }) => {
      console.log('❌ Call rejected by:', from, reason);
      if (this.onCallEnd) {
        this.onCallEnd({ rejected: true, reason });
      }
    });

    this.socket.on('call-ended', ({ from }) => {
      console.log('🔴 Call ended by:', from);
      this.endCall(false);
      if (this.onCallEnd) {
        this.onCallEnd({ ended: true });
      }
    });

    this.socket.on('call-reaction', ({ from, emoji }) => {
      console.log('✨ Call reaction received:', { from, emoji });
      this.notifyCallReaction({ from, emoji });
    });

    this.socket.on('call-error', ({ message }) => {
      console.error('❌ Call error:', message);
      if (this.onCallEnd) {
        this.onCallEnd({ error: true, message });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.socket && this.socket.connected;
  }

  // Check camera and microphone availability
  async checkMediaDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error('MediaDevices API not supported');
        return { available: false, error: 'Browser does not support video calls' };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMic = devices.some(device => device.kind === 'audioinput');
      
      console.log('📹 Camera available:', hasCamera);
      console.log('🎤 Microphone available:', hasMic);
      
      return { available: hasCamera && hasMic, hasCamera, hasMic };
    } catch (error) {
      console.error('Error checking devices:', error);
      return { available: false, error: error.message };
    }
  }

  // Request camera permissions
  async requestPermissions(isVideo = true) {
    try {
      console.log('Requesting camera/microphone permissions...');
      
      const constraints = {
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      stream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Please allow camera and microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera or microphone found on your device.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera or microphone is already in use by another application.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Camera access blocked due to security restrictions. Please use HTTPS or localhost.');
      } else {
        throw new Error(`Could not access camera/microphone: ${error.message}`);
      }
    }
  }

  // Start a call to another user
  async startCall(targetUserId, callerName, isVideo = true) {
    try {
      console.log('📞 Starting call to:', targetUserId, 'Video:', isVideo);
      console.log('Socket connected:', this.isSocketConnected());
      
      if (!this.isSocketConnected()) {
        throw new Error('Not connected to server');
      }
      
      const mediaStatus = await this.checkMediaDevices();
      if (!mediaStatus.available) {
        throw new Error(mediaStatus.error || 'No camera or microphone found');
      }
      
      await this.requestPermissions(isVideo);
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });
      
      console.log('✅ Got local stream, video tracks:', this.localStream.getVideoTracks().length);
      console.log('✅ Audio tracks:', this.localStream.getAudioTracks().length);

      // Create peer with proper options
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        }
      });

      this.currentCall = { targetUserId, isVideo };
      this.setupPeerEvents(targetUserId, callerName, true);
      
      if (this.onRemoteStream) {
        const previewStream = this.localStream.clone();
        this.onRemoteStream(previewStream, true);
      }

    } catch (error) {
      console.error('Error starting call:', error);
      this.cleanupStreams();
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(from, signal, isVideo = true) {
    try {
      console.log('✅ Accepting call from:', from, 'Video:', isVideo);
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });
      
      console.log('✅ Got local stream for accepting call');

      this.peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.currentCall = { targetUserId: from, isVideo };
      this.setupPeerEvents(from, 'Caller', false);
      this.peer.signal(signal);
      
      if (this.onRemoteStream) {
        const previewStream = this.localStream.clone();
        this.onRemoteStream(previewStream, true);
      }

    } catch (error) {
      console.error('Error accepting call:', error);
      this.cleanupStreams();
      throw error;
    }
  }

  // Reject an incoming call
  rejectCall(to, reason = 'User busy') {
    console.log('❌ Rejecting call to:', to, reason);
    if (this.socket) {
      this.socket.emit('reject-call', { to, reason });
    }
  }

  sendReaction(emoji) {
    const targetUserId = this.currentCall?.targetUserId;

    if (!emoji || !targetUserId) {
      return false;
    }

    if (this.socket?.connected) {
      this.socket.emit('call-reaction', {
        to: targetUserId,
        emoji
      });
    }

    if (this.peer?.connected) {
      try {
        this.peer.send(JSON.stringify({
          type: 'call-reaction',
          emoji
        }));
      } catch (error) {
        console.warn('Could not send reaction over peer data channel:', error);
      }
    }

    return true;
  }

  subscribeToCallReactions(listener) {
    this.callReactionListeners.add(listener);

    return () => {
      this.callReactionListeners.delete(listener);
    };
  }

  notifyCallReaction(reaction) {
    if (this.onCallReaction) {
      this.onCallReaction(reaction);
    }

    this.callReactionListeners.forEach(listener => listener(reaction));
  }

  // End current call
  endCall(notifyPeer = true) {
    console.log('🔴 Ending current call');
    const targetUserId = this.currentCall?.targetUserId;
    this.currentCall = null;
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.cleanupStreams();
    
    if (notifyPeer && targetUserId && this.socket?.connected) {
      this.socket.emit('end-call', { to: targetUserId });
    }
  }
  
  // Clean up streams
  cleanupStreams() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
  }

  // Setup peer event listeners
  setupPeerEvents(targetUserId, callerName, isInitiator) {
    if (!this.peer) return;
    
    this.peer.on('signal', (signal) => {
      console.log('📡 Signal generated, initiator:', isInitiator);
      
      if (isInitiator) {
        this.socket.emit('call-user', {
          to: targetUserId,
          signal,
          callerName,
          from: this.socket.id,
          isVideo: this.currentCall?.isVideo
        });
      } else {
        this.socket.emit('accept-call', {
          to: targetUserId,
          signal,
          from: this.socket.id
        });
      }
    });

    this.peer.on('stream', (stream) => {
      console.log('📹 Remote stream received');
      this.remoteStream = stream;
      if (this.onRemoteStream) {
        this.onRemoteStream(stream, false);
      }
    });

    this.peer.on('connect', () => {
      console.log('🔗 Peer connection established!');
    });

    this.peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'call-reaction') {
          this.notifyCallReaction({
            from: targetUserId,
            emoji: message.emoji
          });
        }
      } catch (error) {
        console.warn('Ignoring unknown peer data message:', error);
      }
    });

    this.peer.on('close', () => {
      console.log('🔌 Peer connection closed');
      this.endCall(false);
      if (this.onCallEnd) {
        this.onCallEnd({ ended: true });
      }
    });

    this.peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      this.endCall(false);
      if (this.onCallEnd) {
        this.onCallEnd({ error: true, message: err.message });
      }
    });
  }

  // Toggle microphone mute/unmute
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('Microphone muted:', !audioTrack.enabled);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle video on/off
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('Video off:', !videoTrack.enabled);
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  // Check if microphone is muted
  isMuted() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : false;
    }
    return false;
  }

  // Check if video is off
  isVideoOff() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? !videoTrack.enabled : false;
    }
    return true;
  }

  // Disconnect
  disconnect() {
    console.log('Disconnecting WebRTC service');
    this.endCall(false);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isInitialized = false;
  }
}

export default new WebRTCService();
