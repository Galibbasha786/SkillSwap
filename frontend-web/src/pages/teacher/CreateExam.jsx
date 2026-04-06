// frontend-web/src/pages/teacher/CreateExam.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiClock, FiAward, FiLock, FiMail, FiUsers, FiCode } from 'react-icons/fi';
import { examAPI } from '../../services/api';
import toast from 'react-hot-toast';
import BackButton from '../../components/common/BackButton';

const CreateExam = () => {
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const navigate = useNavigate();
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
    } else if (currentQuestion.type === 'theory') {
      newQuestion.keywords = currentQuestion.keywords;
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
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (exam.accessControl.allowedEmails.includes(newEmail)) {
      toast.error('Email already added');
      return;
    }
    setExam({
      ...exam,
      accessControl: {
        ...exam.accessControl,
        allowedEmails: [...exam.accessControl.allowedEmails, newEmail]
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        ...(q.type === 'coding' && {
          coding: q.coding
        })
      })),
      proctoring: exam.proctoring
    };
    
    console.log('Submitting exam data:', examData);
    
    try {
      const response = await examAPI.createExam(examData);
      console.log('Exam created:', response.data);
      toast.success('Exam created successfully!');
      navigate('/teacher/exams');
    } catch (error) {
      console.error('Failed to create exam:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Exam</h1>
        
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
            <h2 className="text-xl font-semibold mb-4">Questions</h2>
            
            {exam.questions.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="font-medium">Added Questions ({exam.questions.length})</h3>
                {exam.questions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-medium">Q{idx + 1}:</span> {q.question}
                      <span className="text-sm text-gray-500 ml-2">({q.type})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Question */}
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
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExam;