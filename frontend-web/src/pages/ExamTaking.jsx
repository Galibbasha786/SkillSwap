// frontend-web/src/components/exam/ExamTaking.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { examAPI } from '../services/api';
import Proctoring from '../components/exam/Proctoring';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    startExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeft <= 0 && exam) {
      submitExam();
    }
  }, [timeLeft]);

  const startExam = async () => {
    try {
      const response = await examAPI.startExam(examId);
      setExam(response.data.exam);
      setAttempt(response.data.attempt);
      setTimeLeft(response.data.exam.duration * 60);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to start exam');
      navigate('/exams');
    }
  };

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const submitAnswer = async () => {
    const answer = answers[currentQuestion];
    if (!answer && exam?.questions[currentQuestion]?.type !== 'viva') {
      toast.error('Please answer the question');
      return;
    }

    try {
      await examAPI.submitAnswer(examId, {
        questionId: exam.questions[currentQuestion]._id,
        answer,
        timeSpent: exam.duration * 60 - timeLeft
      });
      
      if (currentQuestion < exam.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        submitExam();
      }
    } catch (error) {
      toast.error('Failed to submit answer');
    }
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      const result = await examAPI.finishExam(examId);
     if (result.data.passed) {
  toast.success('Congratulations! You passed the exam!');
  // Navigate with the MongoDB _id
  navigate(`/certificate/${result.data.certificate._id}`);
} else {
        toast.error(`You scored ${result.data.percentage.toFixed(2)}%. Try again!`);
        navigate('/exams');
      }
    } catch (error) {
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViolation = async (violation) => {
    try {
      const response = await examAPI.recordViolation(examId, violation);
      if (response.data.terminated) {
        toast.error('Exam terminated due to multiple violations');
        navigate('/exams');
      }
    } catch (error) {
      console.error('Failed to record violation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const question = exam?.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam?.questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Proctoring examId={examId} onViolation={handleViolation} enabled={exam?.proctoring?.enabled} />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FiClock className="text-blue-500" />
              <span className={timeLeft < 60 ? 'text-red-500' : 'text-gray-700'}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Question {currentQuestion + 1} of {exam?.questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                   style={{ width: `${progress}%` }} />
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
            {question?.question}
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
                    onChange={(e) => handleAnswer(e.target.value)}
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
              onChange={(e) => handleAnswer(e.target.value)}
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

export default ExamTaking;