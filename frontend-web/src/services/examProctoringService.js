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
    this.studentListenersAttached = false;
    this.teacherListenersAttached = false;
    this.reconnectTimer = null;
    this.isActive = false;
    this.studentName = 'Student';
    this.outgoingSignalQueue = [];
    this.incomingTeacherSignals = [];
    this.connectionGeneration = 0;
  }

  getIceServers() {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    const turnUrls = import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL;
    if (turnUrls) {
      iceServers.push({
        urls: turnUrls.split(',').map((url) => url.trim()).filter(Boolean),
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      });
    }

    return iceServers;
  }

  resetSocket() {
    this.connectionGeneration += 1;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.detachStudentListeners();
    this.detachTeacherListeners();
    this.outgoingSignalQueue = [];
  }

  connect(userId) {
    this.userId = String(userId);
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('Proctoring socket: no auth token');
    }

    if (this.socket?.connected) {
      this.socket.auth = { token, userId: this.userId };
      this.socket.emit('register-user', this.userId);
      return;
    }

    if (this.socket) {
      this.socket.auth = { token, userId: this.userId };
      this.socket.connect();
      return;
    }

    const socketUrl = getSocketUrl();
    console.log('🔌 Proctoring socket connecting to:', socketUrl);

    this.socket = io(socketUrl, getSocketOptions(this.userId));

    this.socket.on('connect', () => {
      console.log('✅ Proctoring socket connected:', this.socket.id);
      this.socket.emit('register-user', this.userId);
      this.flushOutgoingSignals();
    });

    this.socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) {
        console.warn('Proctoring socket offline:', error.message || error);
      }
    });

    this.socket.on('reconnect', () => {
      this.socket.emit('register-user', this.userId);
      if (this.mode === 'student' && this.examId) {
        this.socket.emit('join-exam-proctoring', {
          examId: this.examId,
          studentName: this.studentName
        });
        this.createStudentPeer(true);
      } else if (this.mode === 'teacher' && this.examId) {
        this.socket.emit('join-exam-monitor', { examId: this.examId });
      }
    });
  }

  flushOutgoingSignals() {
    if (!this.socket?.connected || !this.outgoingSignalQueue.length) return;
    const queue = [...this.outgoingSignalQueue];
    this.outgoingSignalQueue = [];
    queue.forEach((payload) => {
      this.socket.emit('exam-proctor-signal', payload);
    });
  }

  queueOrEmitSignal(payload) {
    if (this.socket?.connected) {
      this.socket.emit('exam-proctor-signal', payload);
    } else {
      this.outgoingSignalQueue.push(payload);
      if (this.outgoingSignalQueue.length > 50) {
        this.outgoingSignalQueue.shift();
      }
    }
  }

  isStudentActiveFor(examId, userId) {
    return (
      this.mode === 'student' &&
      this.isActive &&
      String(this.examId) === String(examId) &&
      String(this.userId) === String(userId)
    );
  }

  mergeStudentCallbacks(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  whenConnected(callback) {
    if (!this.socket) {
      console.warn('Proctoring socket not initialized');
      return;
    }

    const generation = this.connectionGeneration;
    const socket = this.socket;

    if (socket.connected) {
      callback();
      return;
    }

    waitForSocketConnection(socket)
      .then(() => {
        if (generation !== this.connectionGeneration || this.socket !== socket) return;
        callback();
      })
      .catch((error) => {
        if (generation !== this.connectionGeneration || this.socket !== socket) return;
        const message = error?.message || 'Socket connection failed';
        console.error('Proctoring socket failed to connect:', message);
        this.callbacks.onError?.(message);
      });
  }

  startStudentStream({ userId, examId, studentName, stream, callbacks = {} }) {
    const examKey = String(examId);
    const uid = String(userId);

    if (
      this.mode === 'student' &&
      this.isActive &&
      this.examId === examKey &&
      this.userId === uid &&
      this.localStream === stream
    ) {
      this.mergeStudentCallbacks(callbacks);
      const peer = this.peers.get('teacher');
      if (peer?.connected) {
        this.callbacks.onConnected?.();
      }
      return;
    }

    this.mode = 'student';
    this.examId = examKey;
    this.userId = uid;
    this.localStream = stream;
    this.studentName = studentName || 'Student';
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isActive = true;

    this.connect(uid);
    this.attachStudentListeners();

    this.whenConnected(() => {
      this.socket.emit('join-exam-proctoring', {
        examId: this.examId,
        studentName: this.studentName
      });
      this.createStudentPeer(true);
    });
  }

  attachStudentListeners() {
    if (!this.socket || this.studentListenersAttached) return;
    this.studentListenersAttached = true;

    this.socket.on('request-proctoring-stream', ({ examId }) => {
      if (String(examId) !== String(this.examId)) return;

      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.mode === 'student' && this.examId && this.localStream) {
          this.incomingTeacherSignals = [];
          this.createStudentPeer(true);
        }
      }, 0);
    });

    this.socket.on('proctor-mic-control', (payload) => {
      if (String(payload.examId) !== String(this.examId)) return;
      if (payload.allStudents || String(payload.studentId) === String(this.userId)) {
        this.setStudentMicEnabled(!payload.muted);
        this.callbacks.onMicControl?.(payload);
      }
    });

    this.socket.on('exam-force-ended', (payload) => {
      if (String(payload.examId) !== String(this.examId)) return;
      if (payload.studentId && String(payload.studentId) !== String(this.userId)) return;
      this.callbacks.onForceEnded?.(payload);
    });

    this.socket.on('exam-proctor-signal', ({ signal, from }) => {
      if (!signal) return;
      const peer = this.peers.get('teacher');
      if (peer && !peer.destroyed) {
        try {
          peer.signal(signal);
        } catch (err) {
          console.warn('Student peer signal error:', err);
          this.createStudentPeer(true);
        }
      } else {
        this.incomingTeacherSignals.push(signal);
        if (this.incomingTeacherSignals.length > 20) {
          this.incomingTeacherSignals.shift();
        }
      }
    });
  }

  createStudentPeer(force = false) {
    if (!this.localStream || !this.examId) return;

    const existing = this.peers.get('teacher');
    if (existing && !existing.destroyed) {
      if (!force && existing.connected) return;
      existing.destroy();
      this.peers.delete('teacher');
    }

    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream: this.localStream,
      config: { iceServers: this.getIceServers() }
    });

    peer.on('signal', (signal) => {
      this.queueOrEmitSignal({
        examId: this.examId,
        signal,
        studentId: this.userId
      });
    });

    peer.on('stream', (remoteStream) => {
      this.callbacks.onTeacherAudio?.(remoteStream);
    });

    peer.on('connect', () => {
      console.log('✅ Student proctoring peer connected');
      this.callbacks.onConnected?.();
    });

    peer.on('error', (err) => {
      console.error('Student proctoring peer error:', err);
      setTimeout(() => {
        if (this.mode === 'student' && this.isActive) {
          this.createStudentPeer(true);
        }
      }, 250);
    });

    peer.on('close', () => {
      this.peers.delete('teacher');
    });

    this.peers.set('teacher', peer);

    // Apply any teacher answers that arrived before the peer was ready
    if (this.incomingTeacherSignals.length) {
      const queued = [...this.incomingTeacherSignals];
      this.incomingTeacherSignals = [];
      queued.forEach((signal) => {
        try {
          if (!peer.destroyed) peer.signal(signal);
        } catch (err) {
          console.warn('Queued teacher signal error:', err);
        }
      });
    }
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

  updateStudentStream(stream) {
    this.localStream = stream;
    if (this.mode === 'student' && this.isActive) {
      this.createStudentPeer(true);
    }
  }

  stopStudentStream() {
    if (!this.isActive && this.mode !== 'student') return;

    clearTimeout(this.reconnectTimer);
    if (this.examId && this.socket?.connected) {
      this.socket.emit('leave-exam-proctoring', { examId: this.examId });
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
    }
    this.destroyStudentPeer();
    this.incomingTeacherSignals = [];
    this.examId = null;
    this.mode = null;
    this.callbacks = {};
    this.isActive = false;
    this.localStream = null;
    this.resetSocket();
  }

  startTeacherMonitor({ userId, examId, teacherAudioStream, callbacks }) {
    const examKey = String(examId);
    const uid = String(userId);

    if (teacherAudioStream) {
      this.teacherAudioStream = teacherAudioStream;
    }

    // Already monitoring this exam — refresh callbacks and re-join room only
    if (
      this.mode === 'teacher' &&
      this.isActive &&
      this.examId === examKey &&
      this.userId === uid
    ) {
      this.callbacks = callbacks || {};
      const joinMonitor = () => {
        if (this.socket?.connected) {
          this.socket.emit('join-exam-monitor', { examId: examKey });
        }
      };
      if (this.socket?.connected) {
        joinMonitor();
      } else {
        this.connect(uid);
        this.attachTeacherListeners();
        this.whenConnected(joinMonitor);
      }
      return;
    }

    this.mode = 'teacher';
    this.examId = examKey;
    this.userId = uid;
    this.callbacks = callbacks || {};
    this.isActive = true;

    this.connect(uid);
    this.attachTeacherListeners();

    this.whenConnected(() => {
      this.socket.emit('join-exam-monitor', { examId: this.examId });
    });
  }

  attachTeacherListeners() {
    if (!this.socket || this.teacherListenersAttached) return;
    this.teacherListenersAttached = true;

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
      this.destroyTeacherPeer(sid, true);
    });

    this.socket.on('exam-proctor-signal', ({ signal, studentId, studentName }) => {
      if (signal && studentId) {
        this.handleTeacherSignal(String(studentId), studentName, signal);
      }
    });

    this.socket.on('exam-violation', (data) => {
      this.callbacks.onViolation?.(data);
    });

    this.socket.on('exam-ended', ({ examId }) => {
      if (String(examId) === String(this.examId)) {
        this.callbacks.onExamEnded?.();
      }
    });
  }

  emitRemoteStream(studentId, studentName, stream) {
    if (!stream || stream.getTracks().length === 0) return;
    const sid = String(studentId);
    this.callbacks.onRemoteStream?.({ studentId: sid, studentName, stream });
  }

  handleTeacherSignal(studentId, studentName, signal) {
    const sid = String(studentId);
    let peer = this.peers.get(sid);

    // Fresh offer from student — reset peer for clean negotiation
    if (signal.type === 'offer' && peer && !peer.destroyed) {
      this.destroyTeacherPeer(sid, false);
      peer = null;
    }

    if (!peer || peer.destroyed) {
      peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: this.teacherAudioStream || undefined,
        config: { iceServers: this.getIceServers() }
      });

      peer.on('signal', (answerSignal) => {
        this.queueOrEmitSignal({
          examId: this.examId,
          targetUserId: sid,
          signal: answerSignal
        });
      });

      peer.on('stream', (stream) => {
        console.log('📹 Received student stream from', sid, 'tracks:', stream.getTracks().length);
        this.emitRemoteStream(sid, studentName, stream);
      });

      peer.on('connect', () => {
        console.log('✅ Teacher peer connected to student', sid);
        this.callbacks.onStudentConnected?.({ studentId: sid, studentName });
      });

      peer.on('error', (err) => {
        console.error(`Teacher peer error for ${sid}:`, err);
        this.destroyTeacherPeer(sid, false);
      });

      peer.on('close', () => {
        this.peers.delete(sid);
      });

      this.peers.set(sid, peer);
    }

    try {
      if (!peer.destroyed) {
        peer.signal(signal);
      }
    } catch (err) {
      console.warn('Teacher peer signal error:', err);
      this.destroyTeacherPeer(sid, false);
    }
  }

  destroyTeacherPeer(studentId, notifyLeft = false) {
    const sid = String(studentId);
    const peer = this.peers.get(sid);
    if (peer && !peer.destroyed) {
      peer.destroy();
    }
    this.peers.delete(sid);
    if (notifyLeft) {
      this.callbacks.onStudentLeft?.({ studentId: sid });
    }
  }

  /** Split a remote MediaStream into camera + screen streams for the monitor UI */
  parseRemoteStreams(mediaStream) {
    if (!mediaStream) {
      return { cameraStream: null, screenStream: null };
    }

    const videoTracks = mediaStream.getVideoTracks();
    const audioTracks = mediaStream.getAudioTracks();

    let screenTrack = videoTracks.find((t) =>
      /screen|window|display|monitor|web-contents/i.test(t.label)
    );
    let cameraTrack = videoTracks.find((t) => t !== screenTrack);

    if (!screenTrack && videoTracks.length > 1) {
      screenTrack = videoTracks[1];
      cameraTrack = videoTracks[0];
    }

    const cameraStream = cameraTrack
      ? new MediaStream([cameraTrack, ...audioTracks])
      : audioTracks.length
        ? new MediaStream([...audioTracks])
        : videoTracks[0]
          ? new MediaStream([videoTracks[0], ...audioTracks])
          : null;

    const screenStream = screenTrack ? new MediaStream([screenTrack]) : null;

    return { cameraStream, screenStream };
  }

  setTeacherMicEnabled(enabled) {
    if (!this.teacherAudioStream) return;
    this.teacherAudioStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setStudentMicMutedByTeacher(muted, studentId = null) {
    if (!this.socket?.connected || !this.examId) return;
    this.socket.emit('proctor-mic-control', {
      examId: this.examId,
      muted,
      allStudents: !studentId,
      studentId: studentId ? String(studentId) : undefined
    });
  }

  updateTeacherAudioStream(stream) {
    this.teacherAudioStream = stream;
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
    this.examId = null;
    this.mode = null;
    this.callbacks = {};
    this.teacherAudioStream = null;
    this.isActive = false;
    this.resetSocket();
  }

  detachStudentListeners() {
    if (!this.socket) return;
    this.socket.off('request-proctoring-stream');
    this.socket.off('proctor-mic-control');
    this.socket.off('exam-force-ended');
    this.socket.off('exam-proctor-signal');
    this.studentListenersAttached = false;
  }

  detachTeacherListeners() {
    if (!this.socket) return;
    this.socket.off('exam-monitor-joined');
    this.socket.off('exam-monitor-error');
    this.socket.off('student-proctoring-started');
    this.socket.off('student-proctoring-ended');
    this.socket.off('exam-proctor-signal');
    this.socket.off('exam-violation');
    this.socket.off('exam-ended');
    this.teacherListenersAttached = false;
  }
}

export default new ExamProctoringService();
