// frontend-web/src/services/examProctoringService.js

import SimplePeer from 'simple-peer';
import io from 'socket.io-client';
import { getSocketUrl, getSocketOptions, waitForSocketConnection } from '../utils/socketConfig';

class ExamProctoringService {
  constructor() {
    this.socket = null;
    this.peers = new Map();
    this.localStream = null;
    this.teacherAudioStream = null;
    this.examId = null;
    this.userId = null;
    this.mode = null;
    this.callbacks = {};
    this.listenersAttached = false;
    this.reconnectTimer = null;
    this.isActive = false;
  }

  getIceServers() {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    const turnUrls = import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL;
    if (turnUrls) {
      iceServers.push({
        urls: turnUrls.split(',').map(url => url.trim()).filter(Boolean),
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      });
    }

    return iceServers;
  }

  connect(userId) {
    this.userId = String(userId);
    const token = localStorage.getItem('token');

    if (this.socket) {
      this.socket.auth = { token, userId: this.userId };
      if (this.socket.connected) {
        this.socket.emit('register-user', this.userId);
        return;
      }
      this.socket.connect();
      return;
    }

    const socketUrl = getSocketUrl();
    console.log('🔌 Proctoring socket connecting to:', socketUrl);

    this.socket = io(socketUrl, getSocketOptions(this.userId));

    this.socket.on('connect', () => {
      console.log('✅ Proctoring socket connected:', this.socket.id);
      this.socket.emit('register-user', this.userId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Proctoring socket connection error:', error.message || error);
    });

    this.socket.on('reconnect', () => {
      this.socket.emit('register-user', this.userId);
    });
  }

  whenConnected(callback) {
    if (!this.socket) {
      console.warn('Proctoring socket not initialized');
      return;
    }

    waitForSocketConnection(this.socket)
      .then(() => callback())
      .catch((error) => {
        console.error('Proctoring socket failed to connect:', error.message || error);
        this.callbacks.onError?.(error);
      });
  }

  startStudentStream({ userId, examId, studentName, stream, callbacks = {} }) {
    const examKey = String(examId);

    if (
      this.isActive &&
      this.mode === 'student' &&
      this.examId === examKey &&
      this.localStream === stream &&
      this.socket?.connected
    ) {
      this.callbacks = { ...this.callbacks, ...callbacks };
      return;
    }

    this.mode = 'student';
    this.examId = examKey;
    this.localStream = stream;
    this.studentName = studentName;
    this.callbacks = callbacks;
    this.isActive = true;

    if (!this.listenersAttached) {
      this.connect(userId);
      this.attachStudentListeners();
    } else {
      this.connect(userId);
    }

    this.whenConnected(() => {
      this.socket.emit('join-exam-proctoring', {
        examId: this.examId,
        studentName: this.studentName
      });
      this.createStudentPeer();
    });
  }

  attachStudentListeners() {
    if (!this.socket || this.listenersAttached) return;
    this.listenersAttached = true;

    this.socket.on('request-proctoring-stream', ({ examId }) => {
      if (String(examId) !== String(this.examId)) return;

      const peer = this.peers.get('teacher');
      if (peer && peer.connected) return;

      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.mode === 'student' && this.examId) {
          this.createStudentPeer();
        }
      }, 800);
    });

    this.socket.on('exam-proctor-signal', ({ signal }) => {
      const peer = this.peers.get('teacher');
      if (peer && !peer.destroyed && signal) {
        try {
          peer.signal(signal);
        } catch (err) {
          console.warn('Student peer signal error:', err);
        }
      }
    });
  }

  createStudentPeer() {
    if (!this.localStream || !this.examId) return;

    const existing = this.peers.get('teacher');
    if (existing && existing.connected) return;

    this.destroyStudentPeer();

    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: this.localStream,
      config: { iceServers: this.getIceServers() }
    });

    peer.on('signal', (signal) => {
      if (this.socket?.connected) {
        this.socket.emit('exam-proctor-signal', {
          examId: this.examId,
          signal,
          studentId: this.userId
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      this.callbacks.onTeacherAudio?.(remoteStream);
    });

    peer.on('connect', () => {
      this.callbacks.onConnected?.();
    });

    peer.on('error', (err) => {
      console.error('Student proctoring peer error:', err);
    });

    peer.on('close', () => {
      this.peers.delete('teacher');
    });

    this.peers.set('teacher', peer);
  }

  destroyStudentPeer() {
    const peer = this.peers.get('teacher');
    if (peer && !peer.destroyed) {
      peer.removeAllListeners?.();
      peer.destroy();
    }
    this.peers.delete('teacher');
  }

  setStudentMicEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  stopStudentStream() {
    if (!this.isActive && this.mode !== 'student') return;

    clearTimeout(this.reconnectTimer);
    if (this.examId && this.socket?.connected) {
      this.socket.emit('leave-exam-proctoring', { examId: this.examId });
    }
    this.destroyStudentPeer();
    this.detachListeners();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.examId = null;
    this.mode = null;
    this.callbacks = {};
    this.listenersAttached = false;
    this.isActive = false;
    this.localStream = null;
  }

  startTeacherMonitor({ userId, examId, teacherAudioStream, callbacks }) {
    const examKey = String(examId);

    if (
      this.isActive &&
      this.mode === 'teacher' &&
      this.examId === examKey &&
      this.socket?.connected
    ) {
      this.callbacks = callbacks || {};
      if (teacherAudioStream) {
        this.teacherAudioStream = teacherAudioStream;
      }
      return;
    }

    this.mode = 'teacher';
    this.examId = examKey;
    this.teacherAudioStream = teacherAudioStream || null;
    this.callbacks = callbacks || {};
    this.isActive = true;

    if (!this.listenersAttached) {
      this.connect(userId);
      this.attachTeacherListeners();
    } else {
      this.connect(userId);
    }

    this.whenConnected(() => {
      this.socket.emit('join-exam-monitor', { examId: this.examId });
    });
  }

  attachTeacherListeners() {
    if (!this.socket || this.listenersAttached) return;
    this.listenersAttached = true;

    this.socket.on('exam-monitor-joined', (data) => {
      this.callbacks.onMonitorJoined?.(data);
    });

    this.socket.on('exam-monitor-error', ({ message }) => {
      this.callbacks.onError?.(message);
    });

    this.socket.on('student-proctoring-started', (data) => {
      this.callbacks.onStudentJoined?.({
        ...data,
        studentId: String(data.studentId)
      });
    });

    this.socket.on('student-proctoring-ended', ({ studentId }) => {
      const sid = String(studentId);
      this.destroyTeacherPeer(sid);
      this.callbacks.onStudentLeft?.({ studentId: sid });
    });

    this.socket.on('exam-proctor-signal', ({ signal, studentId, studentName }) => {
      if (signal && studentId) {
        this.handleTeacherSignal(String(studentId), studentName, signal);
      }
    });

    this.socket.on('exam-violation', (data) => {
      this.callbacks.onViolation?.(data);
    });
  }

  handleTeacherSignal(studentId, studentName, signal) {
    let peer = this.peers.get(studentId);

    if (!peer || peer.destroyed) {
      peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: this.teacherAudioStream || undefined,
        config: { iceServers: this.getIceServers() }
      });

      peer.on('signal', (answerSignal) => {
        if (this.socket?.connected) {
          this.socket.emit('exam-proctor-signal', {
            examId: this.examId,
            targetUserId: studentId,
            signal: answerSignal
          });
        }
      });

      peer.on('stream', (stream) => {
        this.callbacks.onRemoteStream?.({ studentId, studentName, stream });
      });

      peer.on('connect', () => {
        this.callbacks.onStudentConnected?.({ studentId, studentName });
      });

      peer.on('error', (err) => {
        console.error(`Teacher peer error for ${studentId}:`, err);
      });

      peer.on('close', () => {
        this.peers.delete(studentId);
      });

      this.peers.set(studentId, peer);
    }

    try {
      if (!peer.destroyed) {
        peer.signal(signal);
      }
    } catch (err) {
      console.warn('Teacher peer signal error:', err);
      this.destroyTeacherPeer(studentId);
    }
  }

  destroyTeacherPeer(studentId) {
    const peer = this.peers.get(studentId);
    if (peer && !peer.destroyed) {
      peer.destroy();
    }
    this.peers.delete(studentId);
  }

  setTeacherMicEnabled(enabled) {
    if (!this.teacherAudioStream) return;
    this.teacherAudioStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  stopTeacherMonitor() {
    if (!this.isActive && this.mode !== 'teacher') return;

    clearTimeout(this.reconnectTimer);
    if (this.examId && this.socket?.connected) {
      this.socket.emit('leave-exam-monitor', { examId: this.examId });
    }
    this.peers.forEach((peer) => {
      if (!peer.destroyed) peer.destroy();
    });
    this.peers.clear();
    this.detachListeners();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.examId = null;
    this.mode = null;
    this.callbacks = {};
    this.teacherAudioStream = null;
    this.listenersAttached = false;
    this.isActive = false;
  }

  detachListeners() {
    if (!this.socket) return;
    this.socket.off('request-proctoring-stream');
    this.socket.off('exam-proctor-signal');
    this.socket.off('exam-monitor-joined');
    this.socket.off('exam-monitor-error');
    this.socket.off('student-proctoring-started');
    this.socket.off('student-proctoring-ended');
    this.socket.off('exam-violation');
    this.listenersAttached = false;
  }
}

export default new ExamProctoringService();
