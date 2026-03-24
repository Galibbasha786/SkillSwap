// frontend-web/src/pages/ExamTaking.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiCheckCircle, FiCamera, FiMonitor, FiAlertTriangle } from 'react-icons/fi';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';
import Proctoring from '../components/exam/Proctoring';
const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const [allAnswersSubmitted, setAllAnswersSubmitted] = useState(false);
  const [violations, setViolations] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  const startExam = async () => {
    try {
      setLoading(true);
      
      const response = await examAPI.startExam(examId);
      
      if (response.data.existing) {
        setExam(response.data.exam);
        setAttempt(response.data.attempt);
        const remaining = response.data.remainingTime || response.data.exam.duration * 60;
        setTimeLeft(remaining);
        setExamStarted(true);
        setLoading(false);
        
        setTimeout(() => {
          requestPermissions();
        }, 500);
      } else {
        setExam(response.data.exam);
        setAttempt(response.data.attempt);
        setTimeLeft(response.data.exam.duration * 60);
        setExamStarted(true);
        setLoading(false);
        
        setTimeout(() => {
          requestPermissions();
        }, 500);
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error(error.response?.data?.message || 'Failed to start exam');
      navigate('/exams');
    }
  };

  const requestPermissions = async () => {
    // Request fullscreen with user gesture
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        setFullscreenRequired(true);
      }
    } catch (err) {
      console.log('Fullscreen request failed:', err);
    }
    
    // Request camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setCameraError(false);
        console.log('✅ Camera started successfully');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(true);
      setCameraActive(false);
      toast.error('Camera access required for proctoring');
    }
  };

  const handleFullscreenClick = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setFullscreenRequired(false);
        toast.success('Fullscreen mode enabled');
      }
    } catch (err) {
      toast.error('Please manually enter fullscreen mode');
    }
  };

  const handleCameraRetry = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setCameraError(false);
      }
      toast.success('Camera connected!');
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  };

  const finishExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setAllAnswersSubmitted(true);
    
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

  const submitAnswer = async () => {
    const answer = answers[currentQuestion];
    if (!answer && exam?.questions[currentQuestion]?.type !== 'viva') {
      toast.error('Please answer the question');
      return;
    }

    try {
      const response = await examAPI.submitAnswer(examId, {
        questionId: exam.questions[currentQuestion]._id,
        answer: answer || '',
        timeSpent: exam.duration * 60 - timeLeft
      });
      
      console.log('Answer submitted:', response.data);
      
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

  const handleViolation = async (violation) => {
    try {
      const response = await examAPI.recordViolation(examId, violation);
      setViolations(response.data.violations);
      if (response.data.terminated) {
        toast.error('Exam terminated due to multiple violations');
        navigate('/exams');
      }
    } catch (error) {
      console.error('Failed to record violation');
    }
  };

  // Initialize exam
  useEffect(() => {
    startExam();
  }, [examId]);

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

  if (!examStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FiAlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
          <p className="text-gray-600 mb-6">Click start when you're ready to begin the exam</p>
          <button
            onClick={() => setExamStarted(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Start Exam
          </button>
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
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Proctoring Component - Pass violations state */}
      <Proctoring 
        examId={examId} 
        onViolation={handleViolation} 
        enabled={exam?.proctoring?.enabled}
        violations={violations}
      />
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Timer Card */}
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
          
          {/* Progress Card */}
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
          
          {/* Camera Feed Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCamera className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">Proctoring Camera</span>
              </div>
              {cameraActive && (
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Active</span>
              )}
              {violations > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Violations: {violations}/5</span>
              )}
            </div>
            <div className="p-2 bg-gray-900">
              {cameraError ? (
                <div className="w-full h-40 bg-gray-800 rounded-lg flex flex-col items-center justify-center">
                  <FiCamera className="w-10 h-10 text-gray-500 mb-2" />
                  <p className="text-xs text-gray-400 mb-2">Camera access required</p>
                  <button
                    onClick={handleCameraRetry}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-40 bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    style={{ display: cameraActive ? 'block' : 'none' }}
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-gray-400">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      Face Monitoring
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Card */}
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

          <div className="mt-8 flex justify-end">
            <button
              onClick={submitAnswer}
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {currentQuestion === exam?.questions.length - 1 ? 'Submit Exam' : 'Next Question'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Add Proctoring import at the top


export default ExamTaking;