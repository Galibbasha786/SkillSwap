// frontend-web/src/pages/teacher/TeacherExams.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiUsers, FiBarChart2, FiTrash2 } from 'react-icons/fi';
import { examAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TeacherExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await examAPI.getTeacherExams();
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
          <Link to="/teacher/exams/create">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600">
              + Create New Exam
            </button>
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-12">
            <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No exams created yet</p>
            <Link to="/teacher/exams/create">
              <button className="mt-4 text-blue-500 hover:text-blue-600">Create your first exam</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{exam.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{exam.skillName}</p>
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <FiFileText /> {exam.questions.length} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <FiBarChart2 /> Pass: {exam.passingScore}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/teacher/exams/${exam._id}/results`}>
                    <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      <FiUsers className="inline mr-1" /> Results
                    </button>
                  </Link>
                  <Link to={`/teacher/exams/${exam._id}/edit`}>
                    <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm">
                      Edit
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherExams;