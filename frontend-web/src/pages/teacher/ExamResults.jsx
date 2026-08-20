// frontend-web/src/pages/teacher/ExamResults.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiAlertTriangle, FiSend,
  FiBarChart2, FiMonitor, FiRefreshCw
} from 'react-icons/fi';
import { examAPI } from '../../services/api';
import BackButton from '../../components/common/BackButton';
import toast from 'react-hot-toast';

const statusBadge = (status, passed) => {
  if (status === 'terminated') {
    return 'bg-red-100 text-red-700';
  }
  if (passed) {
    return 'bg-green-100 text-green-700';
  }
  return 'bg-orange-100 text-orange-700';
};

const statusLabel = (status, passed) => {
  if (status === 'terminated') return 'Terminated';
  if (passed) return 'Passed';
  return 'Failed';
};

const ExamResults = () => {
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await examAPI.getExamResults(examId);
      setExam(response.data.exam);
      setAttempts(response.data.attempts || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [examId]);

  const handlePublish = async () => {
    if (exam?.resultsPublished) {
      toast.error('Results already published');
      return;
    }
    if (attempts.length === 0) {
      toast.error('No completed attempts to publish');
      return;
    }
    if (!window.confirm('Publish results? Each student will receive a notification with their own score only.')) {
      return;
    }

    setPublishing(true);
    try {
      const response = await examAPI.publishExamResults(examId);
      toast.success(response.data.message || 'Results published');
      await fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading exam results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Exam Results</h1>
              <p className="text-sm text-gray-500">{exam?.title} · {exam?.skillName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/teacher/exams/${examId}/monitor`}>
              <button className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2">
                <FiMonitor className="w-4 h-4" /> Live Monitor
              </button>
            </Link>
            <button
              onClick={fetchResults}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || exam?.resultsPublished || attempts.length === 0}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {publishing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              {exam?.resultsPublished ? 'Results Published' : 'Publish Results'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {exam?.resultsPublished && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            Results were published on {new Date(exam.resultsPublishedAt).toLocaleString()}.
            Students received notifications with their individual scores.
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total attempts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Passed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.passed}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Failed</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{summary.failed}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Terminated</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{summary.terminated}</p>
            </div>
          </div>
        )}

        {attempts.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No completed attempts yet</h3>
            <p className="text-gray-500 text-sm mt-1">Results appear here after students finish the exam.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Violations</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tab switches</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Duration</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const durationMin = attempt.startTime && attempt.endTime
                      ? Math.round((new Date(attempt.endTime) - new Date(attempt.startTime)) / 60000)
                      : '—';
                    const isExpanded = expandedStudent === attempt._id;

                    return (
                      <React.Fragment key={attempt._id}>
                        <tr className="border-b hover:bg-gray-50/80">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{attempt.studentName}</p>
                            <p className="text-xs text-gray-500">{attempt.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <FiBarChart2 className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold">
                                {attempt.status === 'terminated' ? '—' : `${(attempt.percentage || 0).toFixed(1)}%`}
                              </span>
                            </div>
                            {attempt.totalMarks > 0 && (
                              <p className="text-xs text-gray-500">
                                {attempt.obtainedMarks}/{attempt.totalMarks} marks
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge(attempt.status, attempt.passed)}`}>
                              {attempt.passed ? <FiCheckCircle /> : attempt.status === 'terminated' ? <FiAlertTriangle /> : <FiXCircle />}
                              {statusLabel(attempt.status, attempt.passed)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${attempt.violations >= 4 ? 'text-red-600' : attempt.violations > 0 ? 'text-orange-600' : 'text-gray-700'}`}>
                              {attempt.violations}/5
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{attempt.tabSwitches}</td>
                          <td className="px-4 py-3 text-gray-700">{durationMin}{durationMin !== '—' ? ' min' : ''}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedStudent(isExpanded ? null : attempt._id)}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              {isExpanded ? 'Hide log' : 'View log'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                                <div className="bg-white rounded-lg p-3 border">
                                  <p className="text-gray-500">Face missing</p>
                                  <p className="font-semibold text-lg">{attempt.faceMissing}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                  <p className="text-gray-500">Multiple faces</p>
                                  <p className="font-semibold text-lg">{attempt.multipleFaces}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                  <p className="text-gray-500">Fullscreen exit</p>
                                  <p className="font-semibold text-lg">{attempt.fullscreenExit}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                  <p className="text-gray-500">Copy / paste</p>
                                  <p className="font-semibold text-lg">{attempt.copyPaste}</p>
                                </div>
                              </div>
                              {attempt.proctoringLogs?.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {attempt.proctoringLogs.map((log, idx) => (
                                    <div key={idx} className="flex justify-between text-xs bg-white rounded px-3 py-2 border">
                                      <span className="capitalize text-gray-700">{log.type.replace(/_/g, ' ')}</span>
                                      <span className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No proctoring violations logged.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;
