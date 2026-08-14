// frontend-web/src/pages/teacher/ExamMonitor.jsx

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiVideo, FiUsers, FiAlertTriangle, FiEye, FiMic, FiMicOff, FiVolume2
} from 'react-icons/fi';
import { examAPI } from '../../services/api';
import examProctoringService from '../../services/examProctoringService';
import { useAuth } from '../../hooks/useAuth';
import BackButton from '../../components/common/BackButton';
import toast from 'react-hot-toast';

const StudentFeed = memo(({
  studentName,
  stream,
  violations,
  isLive,
  isConnected,
  lastViolation,
  listenEnabled,
  onToggleListen,
  studentId
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !listenEnabled;
    }
  }, [listenEnabled, stream]);

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700">
      <div className="relative aspect-video bg-black">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <FiVideo className="w-10 h-10 mb-2 animate-pulse" />
            <p className="text-sm">{isLive ? 'Connecting camera...' : 'Waiting for student...'}</p>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-2">
          {isLive && (
            <span className={`text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isConnected ? 'bg-green-600' : 'bg-yellow-600'
            }`}>
              <span className={`w-1.5 h-1.5 bg-white rounded-full ${isConnected ? '' : 'animate-pulse'}`} />
              {isConnected ? 'LIVE' : 'CONNECTING'}
            </span>
          )}
          {violations > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
              violations >= 4 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'
            }`}>
              {violations} violation{violations !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {stream && (
          <button
            type="button"
            onClick={() => onToggleListen(studentId)}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
            title={listenEnabled ? 'Mute student audio' : 'Listen to student'}
          >
            {listenEnabled ? <FiVolume2 className="w-4 h-4" /> : <FiMicOff className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="p-3">
        <p className="text-white font-medium text-sm truncate">{studentName}</p>
        {lastViolation && (
          <p className="text-xs text-red-400 mt-1 truncate">
            Latest: {lastViolation.type.replace(/_/g, ' ')}
          </p>
        )}
      </div>
    </div>
  );
});

StudentFeed.displayName = 'StudentFeed';

const ExamMonitor = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState({});
  const [violations, setViolations] = useState({});
  const [violationLog, setViolationLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [teacherMicOn, setTeacherMicOn] = useState(false);
  const [listenMap, setListenMap] = useState({});

  const teacherAudioStreamRef = useRef(null);
  const streamsRef = useRef({});
  const initStartedRef = useRef(false);

  const upsertStudent = useCallback((studentId, updates) => {
    const sid = String(studentId);
    setStudents(prev => ({
      ...prev,
      [sid]: {
        studentId: sid,
        studentName: 'Student',
        isLive: false,
        isConnected: false,
        ...prev[sid],
        ...updates,
        studentId: sid
      }
    }));
  }, []);

  const removeStudent = useCallback((studentId) => {
    const sid = String(studentId);
    delete streamsRef.current[sid];
    setStudents(prev => {
      const next = { ...prev };
      delete next[sid];
      return next;
    });
    setListenMap(prev => {
      const next = { ...prev };
      delete next[sid];
      return next;
    });
  }, []);

  const upsertStudentRef = useRef(upsertStudent);
  const removeStudentRef = useRef(removeStudent);
  upsertStudentRef.current = upsertStudent;
  removeStudentRef.current = removeStudent;

  const toggleListen = useCallback((studentId) => {
    const sid = String(studentId);
    setListenMap(prev => ({ ...prev, [sid]: !prev[sid] }));
  }, []);

  const toggleTeacherMic = () => {
    if (!teacherAudioStreamRef.current) {
      toast.error('Microphone not available');
      return;
    }
    const next = !teacherMicOn;
    setTeacherMicOn(next);
    examProctoringService.setTeacherMicEnabled(next);
    toast(next ? 'Microphone on — students can hear you' : 'Microphone muted', {
      duration: 1500,
      icon: next ? '🎤' : '🔇'
    });
  };

  // Stable init — runs once per examId + userId
  useEffect(() => {
    if (!userId || !examId) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    const init = async () => {
      try {
        const response = await examAPI.getLiveAttempts(examId);
        if (cancelled) return;

        setExam(response.data.exam);

        const initialStudents = {};
        const initialViolations = {};
        const initialListen = {};
        response.data.attempts.forEach((attempt) => {
          const sid = String(attempt.studentId._id || attempt.studentId);
          initialStudents[sid] = {
            studentId: sid,
            studentName: attempt.studentId.name || 'Student',
            isLive: true,
            isConnected: false,
            violations: attempt.violations || 0,
            startedAt: attempt.startedAt
          };
          initialViolations[sid] = attempt.violations || 0;
          initialListen[sid] = true;
        });
        setStudents(initialStudents);
        setViolations(initialViolations);
        setListenMap(initialListen);
      } catch (error) {
        if (cancelled) return;
        toast.error(error.response?.data?.message || 'Failed to load exam monitor');
        navigate('/teacher/exams');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        teacherAudioStreamRef.current = stream;
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
      } catch {
        toast.error('Allow microphone access to speak with students during the exam', { duration: 4000 });
      }

      if (cancelled) return;

      examProctoringService.startTeacherMonitor({
        userId,
        examId,
        teacherAudioStream: teacherAudioStreamRef.current,
        callbacks: {
          onMonitorJoined: (data) => {
            setConnected(true);
            setExam(prev => prev || { title: data.examTitle });
            data.activeStudents?.forEach((s) => {
              const sid = String(s.studentId);
              upsertStudentRef.current(sid, { studentName: s.studentName, isLive: true });
              setListenMap(prev => ({ ...prev, [sid]: true }));
            });
          },
          onError: (message) => {
            toast.error(message);
          },
          onStudentJoined: ({ studentId, studentName }) => {
            const sid = String(studentId);
            upsertStudentRef.current(sid, { studentName, isLive: true });
            setListenMap(prev => ({ ...prev, [sid]: true }));
          },
          onStudentLeft: ({ studentId }) => {
            removeStudentRef.current(studentId);
          },
          onRemoteStream: ({ studentId, studentName, stream: remoteStream }) => {
            const sid = String(studentId);
            streamsRef.current[sid] = remoteStream;
            upsertStudentRef.current(sid, { studentName, stream: remoteStream, isLive: true, isConnected: true });
          },
          onStudentConnected: ({ studentId, studentName }) => {
            upsertStudentRef.current(String(studentId), { studentName, isConnected: true });
          },
          onViolation: (data) => {
            const sid = String(data.studentId);
            setViolations(prev => ({ ...prev, [sid]: data.violations }));
            upsertStudentRef.current(sid, {
              studentName: data.studentName,
              violations: data.violations,
              lastViolation: data
            });
            setViolationLog(prev => [data, ...prev].slice(0, 50));
          }
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      initStartedRef.current = false;
      examProctoringService.stopTeacherMonitor();
      teacherAudioStreamRef.current?.getTracks().forEach(t => t.stop());
      teacherAudioStreamRef.current = null;
      streamsRef.current = {};
    };
  }, [userId, examId, navigate]);

  const studentList = Object.values(students);
  const liveCount = studentList.filter(s => s.isConnected && s.stream).length;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading live monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <BackButton className="text-gray-300 hover:text-white" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <FiEye className="text-blue-400" />
                  Live Exam Monitor
                </h1>
                <p className="text-sm text-gray-400">{exam?.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={toggleTeacherMic}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  teacherMicOn
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {teacherMicOn ? <FiMic className="w-4 h-4" /> : <FiMicOff className="w-4 h-4" />}
                {teacherMicOn ? 'Mic On — speaking' : 'Talk to students'}
              </button>

              <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                {connected ? 'Monitoring active' : 'Connecting...'}
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg text-sm">
                <FiUsers className="text-blue-400" />
                <span>{liveCount} live / {studentList.length} in progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {studentList.length === 0 ? (
              <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700">
                <FiVideo className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300">No students taking the exam yet</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Student camera feeds will appear here when they start the exam.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {studentList.map((student) => (
                  <StudentFeed
                    key={student.studentId}
                    studentId={student.studentId}
                    studentName={student.studentName}
                    stream={student.stream}
                    violations={violations[student.studentId] || student.violations || 0}
                    isLive={student.isLive}
                    isConnected={student.isConnected}
                    lastViolation={student.lastViolation}
                    listenEnabled={listenMap[student.studentId] !== false}
                    onToggleListen={toggleListen}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold text-sm mb-2">Live communication</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Click <strong className="text-gray-300">Talk to students</strong> to enable your mic</li>
                <li>• Click the speaker icon on a feed to hear that student</li>
                <li>• Students can mute/unmute their mic during the exam</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <FiAlertTriangle className="text-orange-400" />
                Violation Feed
              </h3>

              {violationLog.length === 0 ? (
                <p className="text-sm text-gray-500">No violations detected yet.</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {violationLog.map((v, idx) => (
                    <div
                      key={`${v.studentId}-${idx}`}
                      className="bg-gray-900/80 rounded-lg p-3 border border-gray-700 text-sm"
                    >
                      <p className="font-medium text-red-400">{v.studentName}</p>
                      <p className="text-gray-300 capitalize">{v.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(v.timestamp).toLocaleTimeString()} · {v.violations}/5
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamMonitor;
