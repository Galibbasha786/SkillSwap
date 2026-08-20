// Practice mode — reuse exam questions, no proctoring, instant feedback at end

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBookOpen, FiCheckCircle, FiXCircle, FiArrowRight, FiAward } from 'react-icons/fi';
import { examAPI } from '../services/api';
import toast from 'react-hot-toast';
import BackButton from '../components/common/BackButton';
import CodeEditor from '../components/exam/CodeEditor';

const ExamPractice = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [codingResults, setCodingResults] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await examAPI.getPracticeExam(examId);
        setExam(response.data.exam);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Cannot load practice mode');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, navigate]);

  const question = exam?.questions?.[currentQuestion];
  const progress = exam?.questions?.length
    ? ((currentQuestion + 1) / exam.questions.length) * 100
    : 0;

  const finishPractice = async () => {
    setSubmitting(true);
    try {
      const payload = exam.questions.map((q, idx) => ({
        questionId: q._id,
        answer: answers[idx] || '',
        codingResult: codingResults[q._id] || null
      }));
      const response = await examAPI.submitPractice(examId, { answers: payload });
      setResults(response.data);
      toast.success('Practice complete!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grade practice');
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (currentQuestion >= exam.questions.length - 1) {
      finishPractice();
    } else {
      setCurrentQuestion((q) => q + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <BackButton />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
              <FiAward className="w-12 h-12 mx-auto mb-2 opacity-90" />
              <h1 className="text-2xl font-bold">Practice Results</h1>
              <p className="text-emerald-100 mt-1">{exam.title}</p>
              <p className="text-4xl font-bold mt-4">{results.percentage.toFixed(1)}%</p>
              <p className="text-sm text-emerald-100">
                {results.obtainedMarks} / {results.totalMarks} marks · Does not affect certification
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {results.breakdown.map((item, idx) => (
                <div
                  key={item.questionId || idx}
                  className={`p-4 rounded-xl border ${
                    item.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {item.isCorrect ? (
                      <FiCheckCircle className="text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <FiXCircle className="text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.question}</p>
                      <p className="text-sm text-gray-600 mt-1 capitalize">Type: {item.type}</p>
                      {item.userAnswer && (
                        <p className="text-sm mt-2">
                          <span className="text-gray-500">Your answer: </span>
                          <span className="text-gray-800">{String(item.userAnswer).slice(0, 200)}</span>
                        </p>
                      )}
                      {!item.isCorrect && item.correctAnswer && (
                        <p className="text-sm mt-1 text-green-700">
                          <span className="font-medium">Correct: </span>
                          {item.correctAnswer}
                        </p>
                      )}
                      {item.feedback && (
                        <p className="text-xs text-gray-500 mt-1">{item.feedback}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setResults(null);
                  setAnswers({});
                  setCodingResults({});
                  setCurrentQuestion(0);
                  setStarted(true);
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Practice Again
              </button>
              <Link to="/exams" className="flex-1">
                <button type="button" className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Back to Exams
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <BackButton />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <FiBookOpen className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Practice Mode</h1>
                <p className="text-gray-500">{exam?.title}</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-900 space-y-1">
              <p>• No camera, mic, or screen share required</p>
              <p>• Unlimited practice — does not use certification attempts</p>
              <p>• See correct answers and explanations at the end</p>
              <p>• {exam?.questions?.length || 0} questions from this exam</p>
            </div>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 flex items-center justify-center gap-2"
            >
              Start Practice
              <FiArrowRight />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white py-3 px-4 sticky top-0 z-40 shadow">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-medium flex items-center gap-2">
            <FiBookOpen /> Practice — {exam?.skillName}
          </span>
          <span className="text-sm text-emerald-100">
            Q{currentQuestion + 1} / {exam?.questions?.length}
          </span>
        </div>
        <div className="max-w-4xl mx-auto mt-2 h-1.5 bg-emerald-900/40 rounded-full overflow-hidden">
          <div className="h-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-md p-8"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            {question?.type}
          </span>
          <h3 className="text-xl font-semibold text-gray-900 mt-3 mb-6">
            {question?.question}
          </h3>

          {question?.type === 'mcq' && (
            <div className="space-y-3">
              {question.options?.map((option, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-emerald-50/50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`practice-${currentQuestion}`}
                    checked={answers[currentQuestion] === option}
                    onChange={() => setAnswers({ ...answers, [currentQuestion]: option })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {(question?.type === 'theory' || question?.type === 'viva') && (
            <textarea
              value={answers[currentQuestion] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
              rows={6}
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder={question.type === 'viva' ? 'Write how you would answer orally…' : 'Type your answer…'}
            />
          )}

          {question?.type === 'coding' && (
            <CodeEditor
              question={question}
              onRunCode={async (data) => {
                const response = await examAPI.runCode(examId, {
                  ...data,
                  questionId: question._id
                });
                return response.data;
              }}
              onSubmitCode={async (data) => {
                const response = await examAPI.runCode(examId, {
                  code: data.code,
                  language: data.language,
                  questionId: question._id,
                  testCases: question.coding?.testCases
                });
                const passed = (response.data.testResults || response.data.results)?.every((r) => r.passed);
                setCodingResults((prev) => ({
                  ...prev,
                  [question._id]: { ...response.data, code: data.code, passed }
                }));
                setAnswers({ ...answers, [currentQuestion]: data.code });
                return { ...response.data, passed };
              }}
            />
          )}

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={currentQuestion === 0 || submitting}
              onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
              className="px-6 py-3 border border-gray-300 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting
                ? 'Grading…'
                : currentQuestion === exam.questions.length - 1
                  ? 'Finish Practice'
                  : 'Next'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ExamPractice;
