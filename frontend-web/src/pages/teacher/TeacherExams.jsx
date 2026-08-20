// frontend-web/src/pages/teacher/TeacherExams.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, 
  FiUsers, 
  FiBarChart2, 
  FiTrash2, 
  FiAlertCircle, 
  FiX,
  FiClock,
  FiCheckCircle,
  FiCalendar,
  FiVideo
} from 'react-icons/fi';
import { examAPI } from '../../services/api';
import toast from 'react-hot-toast';
import BackButton from '../../components/common/BackButton';

const TeacherExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleFrom, setRescheduleFrom] = useState('');
  const [rescheduleTo, setRescheduleTo] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examAPI.getTeacherExams();
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    setDeleteLoading(true);
    try {
      await examAPI.deleteExam(examToDelete._id);
      toast.success('Exam deleted successfully');
      setShowDeleteModal(false);
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelExam = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setCancelLoading(true);
    try {
      await examAPI.cancelExam(selectedExam._id, { reason: cancelReason });
      toast.success('Exam cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel exam');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleExam = async () => {
    if (!rescheduleReason.trim() || !rescheduleFrom || !rescheduleTo) {
      toast.error('Please fill reason and new exam dates');
      return;
    }
    setRescheduleLoading(true);
    try {
      await examAPI.rescheduleExam(selectedExam._id, {
        reason: rescheduleReason,
        availableFrom: new Date(rescheduleFrom).toISOString(),
        availableTo: new Date(rescheduleTo).toISOString()
      });
      toast.success('Exam rescheduled and students notified');
      setShowRescheduleModal(false);
      setRescheduleReason('');
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reschedule exam');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const filteredExams = exams.filter(exam => {
    if (filter === 'active') return exam.status !== 'cancelled' && exam.status !== 'expired';
    if (filter === 'cancelled') return exam.status === 'cancelled' || exam.status === 'expired';
    return true;
  });

  const getStatusBadge = (exam) => {
    if (exam.status === 'cancelled') {
      return (
        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
          Cancelled
        </span>
      );
    }
    if (exam.status === 'expired') {
      return (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          Expired
        </span>
      );
    }
    if (exam.isActive && exam.status === 'active') {
      return (
        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
          Active
        </span>
      );
    }
    return (
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
        Inactive
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
              <p className="text-gray-600 mt-1">Manage your certification exams</p>
            </div>
          </div>
          <Link to="/teacher/exams/create">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg">
              + Create New Exam
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Exams
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Cancelled/Expired
          </button>
        </div>

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No exams found</p>
            {filter !== 'cancelled' && (
              <Link to="/teacher/exams/create">
                <button className="mt-4 text-blue-500 hover:text-blue-600">
                  Create your first exam
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam, index) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${
                  exam.status === 'cancelled' || exam.status === 'expired' ? 'opacity-75' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {exam.title}
                    </h3>
                    {getStatusBadge(exam)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{exam.skillName}</p>
                  
                  {/* Date Range */}
                  {exam.availableFrom && exam.availableTo && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <FiCalendar className="w-3 h-3" />
                      <span>{formatDate(exam.availableFrom)} - {formatDate(exam.availableTo)}</span>
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="flex justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <FiFileText className="w-4 h-4" /> 
                      {exam.questions?.length || 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock className="w-4 h-4" /> 
                      {exam.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <FiBarChart2 className="w-4 h-4" /> 
                      Pass: {exam.passingScore}%
                    </span>
                  </div>
                  
                  {/* Cancellation Info */}
                  {exam.status === 'cancelled' && exam.cancellationReason && (
                    <div className="mb-4 p-2 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-600 font-medium">Cancelled</p>
                      <p className="text-xs text-red-500 mt-1 line-clamp-2">
                        Reason: {exam.cancellationReason}
                      </p>
                    </div>
                  )}
                  
                  {/* Expired Info */}
                  {exam.status === 'expired' && (
                    <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">Expired</p>
                      <p className="text-xs text-gray-500 mt-1">
                        This exam is no longer available
                      </p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {exam.status !== 'cancelled' && exam.status !== 'expired' ? (
                      <>
                        {exam.proctoring?.enabled && (
                          <Link to={`/teacher/exams/${exam._id}/monitor`}>
                            <button className="w-full px-3 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-colors text-sm flex items-center justify-center gap-1">
                              <FiVideo className="w-4 h-4" />
                              Live Monitor
                            </button>
                          </Link>
                        )}
                        <div className="flex gap-2">
                        <Link to={`/teacher/exams/${exam._id}/results`} className="flex-1">
                          <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-1">
                            <FiUsers className="w-4 h-4" />
                            Results
                          </button>
                        </Link>
                        <Link to={`/teacher/exams/${exam._id}/edit`} className="flex-1">
                          <button
                            disabled={exam.availableFrom && new Date(exam.availableFrom) <= new Date()}
                            className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              exam.availableFrom && new Date(exam.availableFrom) <= new Date()
                                ? 'Cannot edit after exam start time'
                                : 'Edit exam'
                            }
                          >
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedExam(exam);
                            const from = exam.availableFrom ? new Date(exam.availableFrom) : new Date();
                            const to = exam.availableTo ? new Date(exam.availableTo) : new Date(Date.now() + 3600000);
                            setRescheduleFrom(from.toISOString().slice(0, 16));
                            setRescheduleTo(to.toISOString().slice(0, 16));
                            setRescheduleReason('');
                            setShowRescheduleModal(true);
                          }}
                          className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <FiCalendar className="w-4 h-4" />
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExam(exam);
                            setShowCancelModal(true);
                          }}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <FiAlertCircle className="w-4 h-4" />
                          Cancel
                        </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setExamToDelete(exam);
                          setShowDeleteModal(true);
                        }}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-1"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete Permanently
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Exam Modal */}
      <AnimatePresence>
        {showRescheduleModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-6 h-6 text-amber-500" />
                  <h3 className="text-xl font-bold text-gray-900">Reschedule Exam</h3>
                </div>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Update the exam window for <span className="font-semibold">"{selectedExam?.title}"</span>.
                Eligible students will be notified of the new dates.
              </p>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New start</label>
                  <input
                    type="datetime-local"
                    value={rescheduleFrom}
                    onChange={(e) => setRescheduleFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New end</label>
                  <input
                    type="datetime-local"
                    value={rescheduleTo}
                    onChange={(e) => setRescheduleTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Why is this exam being rescheduled?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Dates
                </button>
                <button
                  onClick={handleRescheduleExam}
                  disabled={rescheduleLoading}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {rescheduleLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCalendar className="w-4 h-4" />
                      Reschedule
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Exam Modal */}
      <AnimatePresence>
        {showCancelModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold text-gray-900">Cancel Exam</h3>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel <span className="font-semibold">"{selectedExam?.title}"</span>?
                This action will notify all eligible students and they will no longer be able to take this exam.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this exam..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-700">
                  ⚠️ This will notify all students who have access to this exam. This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Exam
                </button>
                <button
                  onClick={handleCancelExam}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-4 h-4" />
                      Cancel Exam
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Exam Modal */}
      <AnimatePresence>
        {showDeleteModal && examToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <FiTrash2 className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold text-gray-900">Delete Exam Permanently</h3>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to permanently delete <span className="font-semibold">"{examToDelete?.title}"</span>?
                This action cannot be undone and all associated data will be lost.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-700">
                  ⚠️ This will permanently remove the exam and all student attempts. This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherExams;