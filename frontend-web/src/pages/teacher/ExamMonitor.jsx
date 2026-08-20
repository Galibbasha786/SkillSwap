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
  cameraStream,
  screenStream,
  violations,
  isLive,
  isConnected,
  lastViolation,
  listenEnabled,
  onToggleListen,
  studentId,
  onToggleMicMute,
  onRemoveStudent
}) => {
  const cameraRef = useRef(null);
  const screenRef = useRef(null);

  useEffect(() => {
    const video = cameraRef.current;
    if (!video) return;
    if (!cameraStream) {
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== cameraStream) {
      video.srcObject = cameraStream;
    }
    video.play().catch(() => {});
  }, [cameraStream]);

  useEffect(() => {
    const video = screenRef.current;
    if (!video) return;
    if (!screenStream) {
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== screenStream) {
      video.srcObject = screenStream;
    }
    video.play().catch(() => {});
  }, [screenStream]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.muted = !listenEnabled;
    }
  }, [listenEnabled, cameraStream]);

  const hasScreen = !!screenStream;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700">
      <div className={`relative bg-black ${hasScreen ? 'aspect-video' : 'aspect-video'}`}>
        {hasScreen ? (
          <>
            <video
              ref={screenRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
            />
            {cameraStream && (
              <div className="absolute bottom-2 left-2 w-24 h-20 rounded-lg overflow-hidden border-2 border-white/80 shadow-lg bg-black">
                <video
                  ref={cameraRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </>
        ) : cameraStream ? (
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <FiVideo className="w-10 h-10 mb-2 animate-pulse" />
            <p className="text-sm">{isLive ? 'Connecting camera...' : 'Student left exam'}</p>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-2">
          {isLive && isConnected && (
            <span className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-green-600">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              LIVE
            </span>
          )}
          {isLive && !isConnected && (
            <span className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-yellow-600">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              CONNECTING
            </span>
          )}
          {hasScreen && (
            <span className="text-white text-xs px-2 py-0.5 rounded-full bg-indigo-600">
              Screen
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

        {cameraStream && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={() => onToggleMicMute?.(studentId, true)}
              className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full text-[10px]"
              title="Mute student mic"
            >
              🔇
            </button>
            <button
              type="button"
              onClick={() => onToggleMicMute?.(studentId, false)}
              className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full text-[10px]"
              title="Unmute student mic"
            >
              🎤
            </button>
            <button
              type="button"
              onClick={() => onToggleListen(studentId)}
              className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
              title={listenEnabled ? 'Mute student audio' : 'Listen to student'}
            >
              {listenEnabled ? <FiVolume2 className="w-4 h-4" /> : <FiMicOff className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onRemoveStudent?.(studentId)}
              className="bg-red-700/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px]"
              title="Remove from exam (0 marks)"
            >
              Remove
            </button>
          </div>
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
  const studentsRef = useRef({});
  const cleanupTimerRef = useRef(null);

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
    examProctoringService.destroyTeacherPeer(sid);
    delete streamsRef.current[sid];
    setStudents(prev => {
      const next = { ...prev };
      delete next[sid];
      return next;
    });
    setViolations(prev => {
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
  studentsRef.current = students;

  const toggleListen = useCallback((studentId) => {
    const sid = String(studentId);
    setListenMap(prev => ({ ...prev, [sid]: !prev[sid] }));
  }, []);

  const handleToggleMicMute = useCallback((studentId, muted) => {
    examProctoringService.setStudentMicMutedByTeacher(muted, studentId);
    toast(muted ? 'Student microphone muted' : 'Student microphone unmuted', { duration: 1500 });
  }, []);

  const handleRemoveStudent = useCallback(async (studentId) => {
    if (!window.confirm('Remove this student from the exam with 0 marks?')) return;
    try {
      const response = await examAPI.removeStudentFromExam(examId, studentId);
      removeStudentRef.current(studentId);
      if (response?.data?.isFinalRemoval) {
        toast.success(`Student removed 3 times — final score ${response.data.finalScore?.percentage?.toFixed(1) ?? 0}% recorded`);
      } else {
        toast.success(`Student removed (${response?.data?.removalNumber || ''}/3)`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove student');
    }
  }, [examId]);

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

  // Stable init — re-sync callbacks on remount (React Strict Mode safe)
  useEffect(() => {
    if (!userId || !examId) return;

    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    let cancelled = false;

    const monitorCallbacks = {
      onMonitorJoined: (data) => {
        setConnected(true);
        setExam(prev => prev || { title: data.examTitle });
        data.activeStudents?.forEach((s) => {
          const sid = String(s.studentId);
          upsertStudentRef.current(sid, { studentName: s.studentName, isLive: true });
          setListenMap(prev => ({ ...prev, [sid]: true }));
        });
        setLoading(false);
      },
      onError: (message) => {
        toast.error(typeof message === 'string' ? message : message?.message || 'Monitor connection failed');
        setLoading(false);
      },
      onStudentJoined: ({ studentId, studentName }) => {
        const sid = String(studentId);
        upsertStudentRef.current(sid, { studentName, isLive: true });
        setListenMap(prev => ({ ...prev, [sid]: true }));
        setLoading(false);
      },
      onStudentLeft: ({ studentId }) => {
        removeStudentRef.current(studentId);
      },
      onRemoteStream: ({ studentId, studentName, stream: remoteStream }) => {
        const sid = String(studentId);
        streamsRef.current[sid] = remoteStream;
        const { cameraStream, screenStream } = examProctoringService.parseRemoteStreams(remoteStream);
        upsertStudentRef.current(sid, {
          studentName,
          cameraStream,
          screenStream,
          isLive: true,
          isConnected: true
        });
        setLoading(false);
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
      },
      onExamEnded: () => {
        toast('Exam session ended for a student', { icon: 'ℹ️' });
      }
    };

    examProctoringService.startTeacherMonitor({
      userId,
      examId,
      teacherAudioStream: teacherAudioStreamRef.current,
      callbacks: monitorCallbacks
    });

    const loadMonitorData = async () => {
      try {
        const [response, micStream] = await Promise.all([
          examAPI.getLiveAttempts(examId),
          navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
          }).catch(() => null)
        ]);

        if (cancelled) {
          micStream?.getTracks().forEach(t => t.stop());
          return;
        }

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
            startedAt: attempt.startTime
          };
          initialViolations[sid] = attempt.violations || 0;
          initialListen[sid] = true;
        });
        setStudents(prev => ({ ...prev, ...initialStudents }));
        setViolations(prev => ({ ...prev, ...initialViolations }));
        setListenMap(prev => ({ ...prev, ...initialListen }));

        if (micStream) {
          teacherAudioStreamRef.current = micStream;
          micStream.getAudioTracks().forEach(t => { t.enabled = false; });
          examProctoringService.updateTeacherAudioStream(micStream);
        } else {
          toast.error('Allow microphone access to speak with students during the exam', { duration: 4000 });
        }
      } catch (error) {
        if (cancelled) return;
        toast.error(error.response?.data?.message || 'Failed to load exam monitor');
        navigate('/teacher/exams');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMonitorData();

    return () => {
      cancelled = true;
      cleanupTimerRef.current = setTimeout(() => {
        examProctoringService.stopTeacherMonitor();
        teacherAudioStreamRef.current?.getTracks().forEach(t => t.stop());
        teacherAudioStreamRef.current = null;
        streamsRef.current = {};
        cleanupTimerRef.current = null;
      }, 500);
    };
  }, [userId, examId, navigate]);

  // Close monitor when exam window ends; refresh active student list
  useEffect(() => {
    if (!exam?.availableTo || !examId) return;

    const checkExamWindow = async () => {
      const now = Date.now();
      const endTime = new Date(exam.availableTo).getTime();

      if (now >= endTime) {
        toast.success('Exam time has ended. Live monitoring closed.');
        navigate('/teacher/exams');
        return;
      }

      try {
        const response = await examAPI.getLiveAttempts(examId);
        const activeIds = new Set(
          (response.data.attempts || []).map((a) => String(a.studentId?._id || a.studentId))
        );

        Object.keys(studentsRef.current).forEach((id) => {
          if (activeIds.has(id)) return;
          const student = studentsRef.current[id];
          // Keep students visible during prep (socket/WebRTC) even before in_progress attempt exists
          if (student?.isLive || student?.isConnected || student?.cameraStream || student?.screenStream) {
            return;
          }
          removeStudentRef.current(id);
        });
      } catch {
        // ignore polling errors
      }
    };

    checkExamWindow();
    const interval = setInterval(checkExamWindow, 15000);
    return () => clearInterval(interval);
  }, [exam?.availableTo, examId, navigate]);

  const studentList = Object.values(students);
  const liveCount = studentList.filter(s => s.isConnected && (s.cameraStream || s.screenStream)).length;

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
                onClick={() => examProctoringService.setStudentMicMutedByTeacher(true)}
                className="px-3 py-2 rounded-lg text-sm bg-red-900/50 hover:bg-red-800 text-red-200"
              >
                Mute all
              </button>
              <button
                type="button"
                onClick={() => examProctoringService.setStudentMicMutedByTeacher(false)}
                className="px-3 py-2 rounded-lg text-sm bg-green-900/50 hover:bg-green-800 text-green-200"
              >
                Unmute all
              </button>
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
                <h3 className="text-lg font-medium text-gray-300">No students in proctoring yet</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Feeds appear when a student grants camera, mic, and screen share — including during the 4-minute prep wait.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {studentList.map((student) => (
                  <StudentFeed
                    key={student.studentId}
                    studentId={student.studentId}
                    studentName={student.studentName}
                    cameraStream={student.cameraStream}
                    screenStream={student.screenStream}
                    violations={violations[student.studentId] || student.violations || 0}
                    isLive={student.isLive}
                    isConnected={student.isConnected}
                    lastViolation={student.lastViolation}
                    listenEnabled={listenMap[student.studentId] !== false}
                    onToggleListen={toggleListen}
                    onToggleMicMute={handleToggleMicMute}
                    onRemoveStudent={handleRemoveStudent}
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
                <li>• Students share <strong className="text-gray-300">camera + screen</strong> during proctored exams</li>
                <li>• Screen is main view; face appears in the corner</li>
                <li>• Feeds disappear when the student submits or leaves</li>
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
