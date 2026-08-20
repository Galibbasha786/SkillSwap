// frontend-web/src/pages/student/StudentExams.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBook, FiClock, FiAward, FiCheckCircle, FiXCircle, FiBookOpen } from 'react-icons/fi';
import { examAPI } from '../../services/api';
import toast from 'react-hot-toast';
import BackButton from '../../components/common/BackButton';

const StudentExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await examAPI.getAvailableExams();
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const getExamAction = (exam) => {
    const attempt = exam.studentAttempt;
    if (!attempt?.status) {
      return { label: 'Start Exam', disabled: false, variant: 'primary' };
    }
    if (attempt.status === 'in_progress') {
      return { label: 'Continue Exam', disabled: false, variant: 'primary' };
    }
    if (attempt.status === 'passed') {
      return { label: 'Passed ✓', disabled: true, variant: 'success' };
    }
    if (attempt.canRetake) {
      return { label: 'Attempt Again', disabled: false, variant: 'retry' };
    }
    return { label: 'Submitted', disabled: true, variant: 'muted' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Certifications</h1>
        <p className="text-gray-600 mb-8">
          Practice anytime without proctoring. Certification exams use camera monitoring during the real attempt.
        </p>

        {exams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FiAward className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No exams available</p>
            <p className="text-gray-400 text-sm mt-2">
              Complete sessions with teachers to unlock their certification exams
            </p>
            <Link to="/marketplace">
              <button className="mt-4 text-blue-500 hover:text-blue-600">
                Find a teacher →
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const action = getExamAction(exam);
              const attempt = exam.studentAttempt;

              return (
                <motion.div
                  key={exam._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FiAward className="text-purple-500" />
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                          Certification
                        </span>
                      </div>
                      {attempt?.status === 'passed' && (
                        <FiCheckCircle className="text-green-500 w-5 h-5" />
                      )}
                      {attempt?.status === 'failed' || attempt?.status === 'terminated' ? (
                        <FiXCircle className="text-red-400 w-5 h-5" />
                      ) : null}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.skillName}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{exam.title}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{exam.duration} minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Questions:</span>
                        <span className="font-medium">{exam.questions?.length || 0}</span>
                      </div>
                      {attempt?.percentage != null && attempt.status !== 'in_progress' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Last score:</span>
                          <span className="font-medium">{attempt.percentage.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    {action.disabled ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-lg font-medium bg-gray-100 text-gray-500 cursor-not-allowed"
                      >
                        {action.label}
                      </button>
                    ) : (
                      <Link to={`/exams/${exam._id}/take`}>
                        <button
                          className={`w-full py-3 rounded-lg font-medium transition-colors ${
                            action.variant === 'retry'
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                          }`}
                        >
                          {action.label}
                        </button>
                      </Link>
                    )}

                    <Link to={`/exams/${exam._id}/practice`} className="block mt-2">
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-lg font-medium border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <FiBookOpen className="w-4 h-4" />
                        Practice (no proctor)
                      </button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExams;
