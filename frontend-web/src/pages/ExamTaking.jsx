// frontend-web/src/pages/ExamTaking.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiClock, FiCheckCircle, FiCamera, FiMonitor, FiAlertTriangle, 
  FiLock, FiShield, FiEye, FiVideo, FiUser, FiAward
} from 'react-icons/fi';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';
import Proctoring from '../components/exam/Proctoring';
import ProctoringSetup from '../components/exam/ProctoringSetup';
import examProctoringService from '../services/examProctoringService';
import CodeEditor from '../components/exam/CodeEditor';
import { useAuth } from '../hooks/useAuth';

const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const [allAnswersSubmitted, setAllAnswersSubmitted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [accessVerified, setAccessVerified] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessChecking, setAccessChecking] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [isCodingSubmitted, setIsCodingSubmitted] = useState(false);
  
  const [showPermissionSetup, setShowPermissionSetup] = useState(false);
  const [proctoringStreams, setProctoringStreams] = useState(null);
  const proctoringStreamsRef = useRef(null);
  const proctoringCleanupRef = useRef(null);
  
  const timerRef = useRef(null);
  const codeEditorRef = useRef(null);
  const accessVerifiedRef = useRef(false);

  // Timer countdown
  useEffect(() => {
    if (!examStarted || timeLeft <= 0 || allAnswersSubmitted) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [examStarted, timeLeft, allAnswersSubmitted]);

  // Fetch exam details and handle access verification
  useEffect(() => {
    accessVerifiedRef.current = false;
    setShowAccessModal(false);
    setAccessVerified(false);
    setAccessDenied(false);
    setAccessChecking(false);
    setShowInstructions(true);
    setShowPermissionSetup(false);
    setProctoringStreams(null);
    setExamStarted(false);

    let cancelled = false;

    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        const response = await examAPI.getExamById(examId);
        if (cancelled) return;

        const loadedExam = response.data.exam;
        setExam(loadedExam);

        const accessControl = loadedExam.accessControl;
        if (!accessControl || accessControl.type === 'all') {
          accessVerifiedRef.current = true;
          setAccessVerified(true);
          setLoading(false);
          return;
        }

        if (accessControl.type === 'specific') {
          setShowAccessModal(true);
          setAccessChecking(true);
          try {
            const verifyRes = await examAPI.verifyExamAccess(examId, { passcode: '' });
            if (cancelled) return;

            if (verifyRes.data.allowed) {
              accessVerifiedRef.current = true;
              setAccessVerified(true);
              setShowAccessModal(false);
              setAccessDenied(false);
              setCameraInitialized(true);
            } else {
              setAccessDenied(true);
            }
          } catch (verifyError) {
            if (cancelled) return;
            setAccessDenied(true);
            toast.error(verifyError.response?.data?.message || 'Access verification failed');
          } finally {
            if (!cancelled) setAccessChecking(false);
          }
        } else if (accessControl.type === 'passcode') {
          setShowAccessModal(true);
        }

        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching exam:', error);
        toast.error('Failed to load exam');
        navigate('/exams');
      }
    };

    fetchExamDetails();

    return () => {
      cancelled = true;
    };
  }, [examId, navigate]);

  const verifyAccess = async () => {
    setAccessChecking(true);
    try {
      const response = await examAPI.verifyExamAccess(examId, {
        passcode
      });

      if (response.data.allowed) {
        accessVerifiedRef.current = true;
        setShowAccessModal(false);
        setAccessDenied(false);
        setAccessVerified(true);
        setCameraInitialized(true);
      } else {
        setAccessDenied(true);
        toast.error(response.data.message || 'Access denied');
      }
    } catch (error) {
      console.error('Access verification error:', error);
      setAccessDenied(true);
      toast.error(error.response?.data?.message || 'Access verification failed');
    } finally {
      setAccessChecking(false);
    }
  };

  const stopProctoringMedia = useCallback(() => {
    examProctoringService.stopStudentStream();
    proctoringCleanupRef.current?.();
    proctoringCleanupRef.current = null;
    const streams = proctoringStreamsRef.current;
    streams?.cameraStream?.getTracks().forEach((t) => t.stop());
    streams?.screenStream?.getTracks().forEach((t) => t.stop());
    proctoringStreamsRef.current = null;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleForceEnded = useCallback((payload) => {
    if (payload?.examId && String(payload.examId) !== String(examId)) return;

    stopProctoringMedia();
    setProctoringStreams(null);
    setShowPermissionSetup(false);
    setExamStarted(false);
    setLoading(false);

    toast.error(payload?.reason || 'You were removed from the exam by your teacher.');
    navigate('/dashboard', { replace: true });
  }, [examId, navigate, stopProctoringMedia]);

  // Pre-connect proctoring socket when entering setup so teacher sees student faster
  useEffect(() => {
    if (!showPermissionSetup && !examStarted) return;
    const studentId = user?.id || user?._id;
    if (!studentId) return;
    examProctoringService.connect(String(studentId));
  }, [showPermissionSetup, examStarted, user?.id, user?._id]);

  // Keep force-end handler wired during prep and during the exam
  useEffect(() => {
    if (!examId) return;
    const studentId = String(user?.id || user?._id || '');
    if (!studentId) return;

    if (examProctoringService.isStudentActiveFor(examId, studentId)) {
      examProctoringService.mergeStudentCallbacks({ onForceEnded: handleForceEnded });
    }
  }, [examId, user?.id, user?._id, handleForceEnded, showPermissionSetup, examStarted]);

  const startExam = async () => {
    try {
      setLoading(true);

      const startPayload = {};
      if (exam?.accessControl?.type === 'passcode' && passcode) {
        startPayload.passcode = passcode;
      }
      
      const response = await examAPI.startExam(examId, startPayload);
      
      if (response.data.existing) {
        setExam(response.data.exam);
        setAttempt(response.data.attempt);
        const remaining = response.data.remainingTime || response.data.exam.duration * 60;
        setTimeLeft(remaining);
        setExamStarted(true);
        
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          setFullscreenRequired(true);
        }
        
        setLoading(false);
      } else {
        setExam(response.data.exam);
        setAttempt(response.data.attempt);
        setTimeLeft(response.data.exam.duration * 60);
        setExamStarted(true);
        
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          setFullscreenRequired(true);
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error(error.response?.data?.message || 'Failed to start exam');
      navigate('/exams');
    }
  };

  const acceptInstructions = () => {
    setInstructionsAccepted(true);
    setShowInstructions(false);
    const proctoringEnabled = exam?.proctoring?.enabled !== false;
    if (proctoringEnabled) {
      setShowPermissionSetup(true);
    } else {
      startExam();
    }
  };

  const handleProctoringLive = useCallback((streams) => {
    proctoringStreamsRef.current = streams;
    setProctoringStreams(streams);

    const proctoringEnabled = exam?.proctoring?.enabled !== false;
    const studentId = String(user?.id || user?._id || '');

    if (proctoringEnabled && studentId && examId) {
      examProctoringService.startStudentStream({
        userId: studentId,
        examId,
        studentName: user?.name || 'Student',
        stream: streams.combinedStream,
        callbacks: { onForceEnded: handleForceEnded }
      });
    }
  }, [exam?.proctoring?.enabled, examId, user?.id, user?._id, user?.name, handleForceEnded]);

  const handleProctoringReady = (streams) => {
    proctoringStreamsRef.current = streams;
    setProctoringStreams(streams);
    setShowPermissionSetup(false);
    startExam();
  };

  const handleProctoringSetupCancel = () => {
    setShowPermissionSetup(false);
    setShowInstructions(true);
    setInstructionsAccepted(false);
  };

  const goToPrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((q) => q - 1);
      setIsCodingSubmitted(false);
    }
  };

  const handleFullscreenClick = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenRequired(false);
      toast.success('Fullscreen mode enabled');
    } catch (err) {
      toast.error('Please manually enter fullscreen mode');
    }
  };

  const finishExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setAllAnswersSubmitted(true);
    stopProctoringMedia();
    
    toast.loading('Submitting exam...', { id: 'submit-exam' });
    
    try {
      const result = await examAPI.finishExam(examId);
      toast.dismiss('submit-exam');
      
      if (result.data.passed) {
        toast.success('Congratulations! You passed the exam!');
        if (result.data.certificate && result.data.certificate._id) {
          navigate(`/certificate/${result.data.certificate._id}`);
        } else {
          navigate('/certificates');
        }
      } else {
        toast.error(`You scored ${result.data.percentage.toFixed(2)}%. Try again!`);
        navigate('/exams');
      }
    } catch (error) {
      toast.dismiss('submit-exam');
      console.error('Error finishing exam:', error);
      toast.error(error.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
      setAllAnswersSubmitted(false);
    }
  };

  // ✅ FIXED: Handle coding questions separately
  const handleCodingQuestionComplete = (passed) => {
    setIsCodingSubmitted(true);
    if (currentQuestion === exam?.questions.length - 1) {
      finishExam();
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setIsCodingSubmitted(false);
    }
  };

  // ✅ FIXED: Skip coding questions in submitAnswer
  const submitAnswer = async () => {
    const currentQ = exam?.questions[currentQuestion];
    
    // Skip coding questions - they are handled separately
    if (currentQ?.type === 'coding') {
      if (!isCodingSubmitted) {
        toast.info('Please click "Submit" in the code editor first');
      }
      return;
    }
    
    let answer = answers[currentQuestion];
    
    if (!answer && currentQ?.type !== 'viva') {
      toast.error('Please answer the question');
      return;
    }

    try {
      const response = await examAPI.submitAnswer(examId, {
        questionId: currentQ._id,
        answer: answer || '',
        timeSpent: exam.duration * 60 - timeLeft
      });
      
      if (currentQuestion === exam.questions.length - 1) {
        await finishExam();
      } else {
        setCurrentQuestion(currentQuestion + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  const handleViolation = useCallback(async (violation) => {
    try {
      const response = await examAPI.recordViolation(examId, violation);
      setViolations(response.data.violations);
      if (response.data.terminated) {
        stopProctoringMedia();
        toast.error('Exam terminated due to multiple violations');
        navigate('/exams');
      }
    } catch (error) {
      console.error('Failed to record violation');
    }
  }, [examId, navigate]);

  // Access Control Modal
  if (showAccessModal && exam) {
    const userEmail = user?.email || JSON.parse(localStorage.getItem('user') || '{}').email;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <FiLock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Exam Access Required</h2>
            <p className="text-gray-600 mt-2">
              {exam.accessControl?.type === 'specific'
                ? 'This exam is restricted to specific students only.'
                : 'This exam is protected. Please provide the required information.'}
            </p>
          </div>
          
          {exam.accessControl?.type === 'specific' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-1">Checking access for:</p>
              <p className="font-medium text-gray-900">{userEmail}</p>
              {accessChecking ? (
                <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                  Verifying your email...
                </p>
              ) : accessDenied ? null : (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <FiCheckCircle className="w-4 h-4" />
                  Access granted
                </p>
              )}
            </div>
          )}

          {exam.accessControl?.type === 'passcode' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Exam Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter the passcode provided by your teacher"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && verifyAccess()}
              />
            </div>
          )}
          
          {accessDenied && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {exam.accessControl?.type === 'specific'
                  ? 'Access denied. Your email is not on the allowed list for this exam. Contact your teacher.'
                  : 'Access denied. Please check your passcode or contact your teacher.'}
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/exams')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {exam.accessControl?.type === 'passcode' && (
            <button
              onClick={verifyAccess}
              disabled={accessChecking}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {accessChecking ? 'Verifying...' : 'Verify Access'}
            </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Proctoring permission setup — before exam questions
  if (showPermissionSetup && exam) {
    return (
      <ProctoringSetup
        onReady={handleProctoringReady}
        onProctoringLive={handleProctoringLive}
        onCancel={handleProctoringSetupCancel}
      />
    );
  }

  // Instructions Page
  if (showInstructions && exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <h1 className="text-2xl font-bold">{exam?.title}</h1>
              <p className="text-blue-100 mt-1">{exam?.description}</p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FiShield className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold text-gray-900">Exam Instructions</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-blue-500" />
                    General Information
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Duration: {exam?.duration} minutes</li>
                    <li>• Total Questions: {exam?.questions?.length}</li>
                    <li>• Passing Score: {exam?.passingScore}%</li>
                  </ul>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiEye className="w-4 h-4 text-red-500" />
                    Proctoring Rules
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Camera and screen sharing must remain on throughout</li>
                    <li>• Your face must be visible at all times</li>
                    <li>• Share your full screen before questions appear</li>
                    <li>• No other people allowed in frame</li>
                    <li>• Do not switch tabs or windows</li>
                    <li>• Stay in fullscreen mode</li>
                    <li>• Maximum 5 violations allowed</li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-6">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instructionsAccepted}
                    onChange={(e) => setInstructionsAccepted(e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and understood all instructions. I agree to follow the proctoring rules.
                  </span>
                </label>

                <button
                  onClick={acceptInstructions}
                  disabled={!instructionsAccepted}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  I Understand, Start Exam
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (fullscreenRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FiMonitor className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fullscreen Required</h2>
          <p className="text-gray-600 mb-6">Please enter fullscreen mode to continue the exam</p>
          <button
            onClick={handleFullscreenClick}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Enter Fullscreen
          </button>
        </div>
      </div>
    );
  }

  const question = exam?.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam?.questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gray-50">
      <Proctoring 
        examId={examId}
        studentId={user?.id || user?._id}
        studentName={user?.name}
        onViolation={handleViolation} 
        enabled={exam?.proctoring?.enabled !== false}
        violations={violations}
        initialCameraStream={proctoringStreamsRef.current?.cameraStream || proctoringStreams?.cameraStream}
        initialScreenStream={proctoringStreamsRef.current?.screenStream || proctoringStreams?.screenStream}
        initialCombinedStream={proctoringStreamsRef.current?.combinedStream || proctoringStreams?.combinedStream}
        onRegisterCleanup={(fn) => { proctoringCleanupRef.current = fn; }}
        onForceEnded={handleForceEnded}
      />
      
      <div className="pt-20 max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center gap-3">
              <FiClock className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Time Remaining</p>
                <p className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-900'}`}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-6 h-6 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Progress</p>
                <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{currentQuestion + 1} of {exam?.questions.length} questions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center gap-3">
              <FiAward className="w-6 h-6 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Passing Score</p>
                <p className="text-2xl font-bold text-gray-900">{exam?.passingScore}%</p>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-md p-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Q{currentQuestion + 1}. {question?.question}
          </h3>

          {question?.type === 'mcq' && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={answers[currentQuestion] === option}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question?.type === 'theory' && (
            <textarea
              value={answers[currentQuestion] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
              rows="6"
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your answer here..."
            />
          )}
          
          {question?.type === 'coding' && (
            <CodeEditor
              ref={codeEditorRef}
              question={question}
              onRunCode={async (data) => {
                const response = await examAPI.runCode(examId, {
                  ...data,
                  questionId: question._id
                });
                return response.data;
              }}
              onSubmitCode={async (data) => {
                const response = await examAPI.submitCoding(examId, {
                  ...data,
                  questionId: question._id
                });
                handleCodingQuestionComplete(response.data.passed);
                return response.data;
              }}
            />
          )}

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentQuestion === 0 || submitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={submitAnswer}
              disabled={submitting || (question?.type === 'coding' && !isCodingSubmitted)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
            >
              {currentQuestion === exam?.questions.length - 1 ? 'Submit Exam' : 'Next Question'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ExamTaking;