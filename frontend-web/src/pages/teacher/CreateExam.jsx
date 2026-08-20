// frontend-web/src/pages/teacher/CreateExam.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiTrash2, FiClock, FiAward, FiLock, FiMail, FiUsers, FiCode, FiClipboard, FiList } from 'react-icons/fi';
import { examAPI } from '../../services/api';
import toast from 'react-hot-toast';
import BackButton from '../../components/common/BackButton';
import { parseBulkQuestions, BULK_IMPORT_TEMPLATE } from '../../utils/examBulkImport';

const CreateExam = () => {
  const { examId: editExamId } = useParams();
  const isEditMode = Boolean(editExamId);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const navigate = useNavigate();
  const [loadingExam, setLoadingExam] = useState(isEditMode);
  const [editLocked, setEditLocked] = useState(false);
  const [exam, setExam] = useState({
    skillName: '',
    title: '',
    description: '',
    duration: 30,
    passingScore: 70,
    questions: [],
    accessControl: {
      type: 'all',
      passcode: '',
      allowedEmails: []
    },
    proctoring: {
      enabled: true,
      faceDetection: true,
      tabSwitchDetection: true,
      screenshotDetection: true
    }
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1,
    keywords: [],
    // Coding fields
    coding: {
      programmingLanguage: 'javascript',
      initialCode: '// Write your code here\nfunction solve(input) {\n  // Your code here\n  return result;\n}',
      solutionCode: '',
      functionName: 'solve',
      testCases: [],
      timeLimit: 2000,
      memoryLimit: 256
    }
  });
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [questionMode, setQuestionMode] = useState('single');
  const [bulkText, setBulkText] = useState(BULK_IMPORT_TEMPLATE);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  const formatDateTimeLocal = (dateString) => {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!isEditMode) return;

    const loadExam = async () => {
      try {
        setLoadingExam(true);
        const response = await examAPI.getExamById(editExamId);
        const existingExam = response.data.exam;

        const now = new Date();
        if (new Date(existingExam.availableFrom) <= now) {
          setEditLocked(true);
          toast.error('This exam has already started and can no longer be edited');
        }

        setExam({
          skillName: existingExam.skillName || '',
          title: existingExam.title || '',
          description: existingExam.description || '',
          duration: existingExam.duration || 30,
          passingScore: existingExam.passingScore || 70,
          questions: existingExam.questions || [],
          accessControl: existingExam.accessControl || {
            type: 'all',
            passcode: '',
            allowedEmails: []
          },
          proctoring: existingExam.proctoring || {
            enabled: true,
            faceDetection: true,
            tabSwitchDetection: true,
            screenshotDetection: true
          }
        });
        setAvailableFrom(formatDateTimeLocal(existingExam.availableFrom));
        setAvailableTo(formatDateTimeLocal(existingExam.availableTo));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load exam');
        navigate('/teacher/exams');
      } finally {
        setLoadingExam(false);
      }
    };

    loadExam();
  }, [isEditMode, editExamId, navigate]);

  const addQuestion = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter question text');
      return;
    }
    
    if (currentQuestion.type === 'mcq') {
      if (!currentQuestion.correctAnswer) {
        toast.error('Please select correct answer');
        return;
      }
      if (currentQuestion.options.some(opt => !opt)) {
        toast.error('Please fill all options');
        return;
      }
    }
    
    if (currentQuestion.type === 'coding') {
      if (currentQuestion.coding.testCases.length === 0) {
        toast.error('Please add at least one test case');
        return;
      }
      if (!currentQuestion.coding.solutionCode) {
        toast.error('Please provide solution code');
        return;
      }
    }
    
    const newQuestion = {
      type: currentQuestion.type,
      question: currentQuestion.question,
      marks: currentQuestion.marks
    };
    
    if (currentQuestion.type === 'mcq') {
      newQuestion.options = currentQuestion.options;
      newQuestion.correctAnswer = currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'theory' || currentQuestion.type === 'viva') {
      if (currentQuestion.type === 'theory') {
        newQuestion.keywords = currentQuestion.keywords;
      }
    } else if (currentQuestion.type === 'coding') {
      newQuestion.coding = currentQuestion.coding;
    }
    
    setExam({
      ...exam,
      questions: [...exam.questions, newQuestion]
    });
    
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1,
      keywords: [],
      coding: {
        programmingLanguage: 'javascript',
        initialCode: '// Write your code here\nfunction solve(input) {\n  // Your code here\n  return result;\n}',
        solutionCode: '',
        functionName: 'solve',
        testCases: [],
        timeLimit: 2000,
        memoryLimit: 256
      }
    });
    
    toast.success('Question added!');
  };

  const removeQuestion = (index) => {
    const newQuestions = [...exam.questions];
    newQuestions.splice(index, 1);
    setExam({ ...exam, questions: newQuestions });
  };

  const addAllowedEmail = () => {
    if (!newEmail) return;
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (exam.accessControl.allowedEmails.includes(normalizedEmail)) {
      toast.error('Email already added');
      return;
    }
    setExam({
      ...exam,
      accessControl: {
        ...exam.accessControl,
        allowedEmails: [...exam.accessControl.allowedEmails, normalizedEmail]
      }
    });
    setNewEmail('');
  };

  const removeAllowedEmail = (email) => {
    setExam({
      ...exam,
      accessControl: {
        ...exam.accessControl,
        allowedEmails: exam.accessControl.allowedEmails.filter(e => e !== email)
      }
    });
  };

  const addTestCase = () => {
    setCurrentQuestion({
      ...currentQuestion,
      coding: {
        ...currentQuestion.coding,
        testCases: [...currentQuestion.coding.testCases, { input: '', expectedOutput: '', isHidden: false }]
      }
    });
  };

  const removeTestCase = (index) => {
    const newTestCases = currentQuestion.coding.testCases.filter((_, i) => i !== index);
    setCurrentQuestion({
      ...currentQuestion,
      coding: {
        ...currentQuestion.coding,
        testCases: newTestCases
      }
    });
  };

  const updateTestCase = (index, field, value) => {
    const newTestCases = [...currentQuestion.coding.testCases];
    newTestCases[index][field] = value;
    setCurrentQuestion({
      ...currentQuestion,
      coding: {
        ...currentQuestion.coding,
        testCases: newTestCases
      }
    });
  };

  const handleBulkParse = () => {
    const { questions, errors } = parseBulkQuestions(bulkText);
    setBulkPreview(questions);
    setBulkErrors(errors);
    if (questions.length) {
      toast.success(`Parsed ${questions.length} question(s)`);
    } else if (errors.length) {
      toast.error('Fix format errors before importing');
    }
  };

  const importBulkQuestions = () => {
    const { questions, errors } = parseBulkQuestions(bulkText);
    if (errors.length && !questions.length) {
      setBulkErrors(errors);
      toast.error('No valid questions to import');
      return;
    }
    if (!questions.length) {
      toast.error('Nothing to import');
      return;
    }
    setExam({ ...exam, questions: [...exam.questions, ...questions] });
    setBulkPreview([]);
    setBulkErrors(errors);
    toast.success(`Added ${questions.length} question(s) to exam`);
    if (errors.length) {
      toast.error(`${errors.length} block(s) had errors and were skipped`);
    }
  };

  const typeBadgeColor = (type) => {
    const map = {
      mcq: 'bg-blue-100 text-blue-700',
      theory: 'bg-purple-100 text-purple-700',
      coding: 'bg-orange-100 text-orange-700',
      viva: 'bg-pink-100 text-pink-700'
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editLocked) {
      toast.error('This exam can no longer be edited');
      return;
    }
    
    if (exam.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    // Validate access control
    if (exam.accessControl.type === 'passcode' && !exam.accessControl.passcode) {
      toast.error('Please enter a passcode');
      return;
    }
    
    if (exam.accessControl.type === 'specific' && exam.accessControl.allowedEmails.length === 0) {
      toast.error('Please add at least one email');
      return;
    }
    
    setLoading(true);
    
    const examData = {
      skillName: exam.skillName,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      passingScore: exam.passingScore,
      availableFrom: new Date(availableFrom).toISOString(),
      availableTo: new Date(availableTo).toISOString(),
      accessControl: exam.accessControl,
      questions: exam.questions.map(q => ({
        type: q.type,
        question: q.question,
        marks: q.marks,
        ...(q.type === 'mcq' && {
          options: q.options,
          correctAnswer: q.correctAnswer
        }),
        ...(q.type === 'theory' && {
          keywords: q.keywords
        }),
        ...(q.type === 'viva' && {}),
        ...(q.type === 'coding' && {
          coding: q.coding
        })
      })),
      proctoring: exam.proctoring
    };
    
    console.log('Submitting exam data:', examData);
    
    try {
      if (isEditMode) {
        const response = await examAPI.updateExam(editExamId, examData);
        console.log('Exam updated:', response.data);
        toast.success('Exam updated successfully!');
      } else {
        const response = await examAPI.createExam(examData);
        console.log('Exam created:', response.data);
        toast.success('Exam created successfully!');
      }
      navigate('/teacher/exams');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} exam:`, error.response?.data);
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} exam`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Edit Exam' : 'Create New Exam'}
        </h1>
        {editLocked && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            This exam has already started. You can view the details but changes cannot be saved.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Exam Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={exam.skillName}
                  onChange={(e) => setExam({ ...exam, skillName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="e.g., JavaScript, React, Python"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={exam.title}
                  onChange={(e) => setExam({ ...exam, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="JavaScript Fundamentals Assessment"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={exam.description}
                  onChange={(e) => setExam({ ...exam, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this exam covers..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available From *
                  </label>
                  <input
                    type="datetime-local"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available To *
                  </label>
                  <input
                    type="datetime-local"
                    value={availableTo}
                    onChange={(e) => setAvailableTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                    min={availableFrom || new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FiClock className="inline mr-1" />
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={exam.duration}
                    onChange={(e) => setExam({ ...exam, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="5"
                    max="180"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FiAward className="inline mr-1" />
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={exam.passingScore}
                    onChange={(e) => setExam({ ...exam, passingScore: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Access Control Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiLock className="w-5 h-5 text-blue-500" />
              Exam Access Control
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who can take this exam?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="accessType"
                      value="all"
                      checked={exam.accessControl.type === 'all'}
                      onChange={() => setExam({
                        ...exam,
                        accessControl: { ...exam.accessControl, type: 'all', passcode: '', allowedEmails: [] }
                      })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="font-medium">Anyone with a session</span>
                      <p className="text-xs text-gray-500">All students who have sessions with you can take this exam</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="accessType"
                      value="passcode"
                      checked={exam.accessControl.type === 'passcode'}
                      onChange={() => setExam({
                        ...exam,
                        accessControl: { ...exam.accessControl, type: 'passcode', allowedEmails: [] }
                      })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="font-medium">Require Passcode</span>
                      <p className="text-xs text-gray-500">Students need to enter a passcode to access the exam</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="accessType"
                      value="specific"
                      checked={exam.accessControl.type === 'specific'}
                      onChange={() => setExam({
                        ...exam,
                        accessControl: { ...exam.accessControl, type: 'specific', passcode: '' }
                      })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="font-medium">Specific Students Only</span>
                      <p className="text-xs text-gray-500">Only students with registered emails can take this exam</p>
                    </div>
                  </label>
                </div>
              </div>
              
              {exam.accessControl.type === 'passcode' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Passcode *
                  </label>
                  <input
                    type="text"
                    value={exam.accessControl.passcode}
                    onChange={(e) => setExam({
                      ...exam,
                      accessControl: { ...exam.accessControl, passcode: e.target.value }
                    })}
                    placeholder="Enter a passcode (e.g., EXAM123)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Share this passcode with students who should take this exam</p>
                </div>
              )}
              
              {exam.accessControl.type === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <FiMail className="w-4 h-4" />
                    Allowed Student Emails
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addAllowedEmail()}
                    />
                    <button
                      type="button"
                      onClick={addAllowedEmail}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  
                  {exam.accessControl.allowedEmails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {exam.accessControl.allowedEmails.map((email) => (
                        <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm">{email}</span>
                          <button
                            type="button"
                            onClick={() => removeAllowedEmail(email)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Proctoring Settings */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Proctoring Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exam.proctoring.enabled}
                  onChange={(e) => setExam({ 
                    ...exam, 
                    proctoring: { ...exam.proctoring, enabled: e.target.checked } 
                  })}
                  className="w-4 h-4 text-blue-500"
                />
                <span>Enable Proctoring</span>
              </label>
              {exam.proctoring.enabled && (
                <>
                  <label className="flex items-center gap-3 ml-6">
                    <input
                      type="checkbox"
                      checked={exam.proctoring.faceDetection}
                      onChange={(e) => setExam({ 
                        ...exam, 
                        proctoring: { ...exam.proctoring, faceDetection: e.target.checked } 
                      })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span>Face Detection</span>
                  </label>
                  <label className="flex items-center gap-3 ml-6">
                    <input
                      type="checkbox"
                      checked={exam.proctoring.tabSwitchDetection}
                      onChange={(e) => setExam({ 
                        ...exam, 
                        proctoring: { ...exam.proctoring, tabSwitchDetection: e.target.checked } 
                      })}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span>Tab Switch Detection</span>
                  </label>
                </>
              )}
            </div>
          </div>
          
          {/* Questions Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold">Questions</h2>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuestionMode('single')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    questionMode === 'single' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FiList /> One by one
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionMode('bulk')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    questionMode === 'bulk' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FiClipboard /> Bulk paste
                </button>
              </div>
            </div>
            
            {exam.questions.length > 0 && (
              <div className="mb-6 space-y-2">
                <h3 className="font-medium text-gray-700">Added Questions ({exam.questions.length})</h3>
                {exam.questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg flex justify-between items-start gap-3 border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">Q{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${typeBadgeColor(q.type)}`}>
                          {q.type}
                        </span>
                        <span className="text-xs text-gray-500">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{q.question}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="text-red-500 hover:text-red-600 shrink-0 p-1"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {questionMode === 'bulk' ? (
              <div className="border-t pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">Paste questions in bulk</h3>
                  <button
                    type="button"
                    onClick={() => setShowFormatHelp(!showFormatHelp)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showFormatHelp ? 'Hide format guide' : 'Show format guide'}
                  </button>
                </div>

                {showFormatHelp && (
                  <pre className="text-xs bg-gray-900 text-green-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {BULK_IMPORT_TEMPLATE}
                  </pre>
                )}

                <p className="text-sm text-gray-600">
                  Start each block with <code className="bg-gray-100 px-1 rounded">[MCQ]</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">[THEORY]</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">[CODING]</code>, or{' '}
                  <code className="bg-gray-100 px-1 rounded">[VIVA]</code>. Separate blocks with a blank line.
                </p>

                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={16}
                  className="w-full font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste your questions here…"
                />

                {bulkErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                    {bulkErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}

                {bulkPreview.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-emerald-800 mb-2">
                      Preview — {bulkPreview.length} question(s) ready
                    </p>
                    <ul className="text-sm text-emerald-900 space-y-1">
                      {bulkPreview.map((q, i) => (
                        <li key={i}>
                          {i + 1}. [{q.type}] {q.question.slice(0, 60)}
                          {q.question.length > 60 ? '…' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleBulkParse}
                    className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Preview parse
                  </button>
                  <button
                    type="button"
                    onClick={importBulkQuestions}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <FiPlus /> Add all to exam
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkText(BULK_IMPORT_TEMPLATE)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                  >
                    Load sample template
                  </button>
                </div>
              </div>
            ) : (
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Add New Question</h3>
              <div className="space-y-4">
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="theory">Theory / Essay</option>
                  <option value="viva">Viva / Oral</option>
                  <option value="coding">Coding Assessment</option>
                </select>
                
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter question text..."
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                
                {currentQuestion.type === 'mcq' && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...currentQuestion.options];
                          newOptions[idx] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    ))}
                    <select
                      value={currentQuestion.correctAnswer}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Correct Answer</option>
                      {currentQuestion.options.map((opt, idx) => (
                        opt && <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {currentQuestion.type === 'theory' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.keywords.join(', ')}
                      onChange={(e) => setCurrentQuestion({ 
                        ...currentQuestion, 
                        keywords: e.target.value.split(',').map(k => k.trim()) 
                      })}
                      placeholder="e.g., JavaScript, closure, scope"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
                
                {currentQuestion.type === 'coding' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FiCode className="text-blue-500" /> Coding Assessment Settings
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Programming Language
                      </label>
                      <select
                        value={currentQuestion.coding.programmingLanguage}
                        onChange={(e) => setCurrentQuestion({
                          ...currentQuestion,
                          coding: { ...currentQuestion.coding, programmingLanguage: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Function Name
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.coding.functionName}
                        onChange={(e) => setCurrentQuestion({
                          ...currentQuestion,
                          coding: { ...currentQuestion.coding, functionName: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="solve"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Code (Template)
                      </label>
                      <textarea
                        value={currentQuestion.coding.initialCode}
                        onChange={(e) => setCurrentQuestion({
                          ...currentQuestion,
                          coding: { ...currentQuestion.coding, initialCode: e.target.value }
                        })}
                        rows="6"
                        className="w-full font-mono text-sm p-3 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Solution Code
                      </label>
                      <textarea
                        value={currentQuestion.coding.solutionCode}
                        onChange={(e) => setCurrentQuestion({
                          ...currentQuestion,
                          coding: { ...currentQuestion.coding, solutionCode: e.target.value }
                        })}
                        rows="6"
                        className="w-full font-mono text-sm p-3 border border-gray-300 rounded-lg"
                        placeholder="function solve(input) {\n  // Correct solution\n  return result;\n}"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Test Cases
                      </label>
                      <div className="space-y-2">
                        {currentQuestion.coding.testCases.map((testCase, idx) => (
                          <div key={idx} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                              type="text"
                              value={testCase.input}
                              onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                              placeholder="Input"
                              className="flex-1 p-2 border border-gray-300 rounded"
                            />
                            <input
                              type="text"
                              value={testCase.expectedOutput}
                              onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                              placeholder="Expected Output"
                              className="flex-1 p-2 border border-gray-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeTestCase(idx)}
                              className="px-2 text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addTestCase}
                          className="text-sm text-blue-500 hover:text-blue-600"
                        >
                          + Add Test Case
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time Limit (ms)
                        </label>
                        <input
                          type="number"
                          value={currentQuestion.coding.timeLimit}
                          onChange={(e) => setCurrentQuestion({
                            ...currentQuestion,
                            coding: { ...currentQuestion.coding, timeLimit: parseInt(e.target.value) }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Memory Limit (MB)
                        </label>
                        <input
                          type="number"
                          value={currentQuestion.coding.memoryLimit}
                          onChange={(e) => setCurrentQuestion({
                            ...currentQuestion,
                            coding: { ...currentQuestion.coding, memoryLimit: parseInt(e.target.value) }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Marks:</label>
                  <input
                    type="number"
                    value={currentQuestion.marks}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    min="1"
                    max="100"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <FiPlus /> Add Question
                </button>
              </div>
            </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/teacher/exams')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || editLocked}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Exam')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExam;