// frontend-web/src/components/exam/CodeEditor.jsx

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FiPlay, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CodeEditor = forwardRef(({ question, onRunCode, onSubmitCode, readOnly = false }, ref) => {
  const [code, setCode] = useState(question?.coding?.initialCode || '');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    getCode: () => code,
    setCode: (newCode) => setCode(newCode)
  }));

  useEffect(() => {
    if (question?.coding?.initialCode) {
      setCode(question.coding.initialCode);
    }
  }, [question]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    setActiveTab('output');
    
    try {
      const result = await onRunCode({
        code,
        language: question?.coding?.programmingLanguage || 'javascript',
        testCases: question?.coding?.testCases?.slice(0, 2)
      });
      
      setOutput(result.output);
      if (result.testResults) {
        setTestResults(result.testResults);
      }
    } catch (error) {
      setOutput(error.message || 'Error running code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    toast.loading('Submitting code...', { id: 'submit-code' });
    
    try {
      const result = await onSubmitCode({
        code,
        questionId: question._id,
        language: question?.coding?.programmingLanguage || 'javascript'
      });
      
      toast.dismiss('submit-code');
      
      if (result.passed) {
        toast.success(`All tests passed! Score: ${result.score}`);
        setTestResults(result.testResults);
      } else {
        toast.error(`Failed ${result.failedTests} tests. Score: ${result.score}`);
        setTestResults(result.testResults);
      }
      setActiveTab('results');
    } catch (error) {
      toast.dismiss('submit-code');
      toast.error(error.message || 'Failed to submit code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-900">
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Language:</span>
          <span className="text-xs text-blue-400 font-mono">
            {question?.coding?.programmingLanguage?.toUpperCase() || 'JavaScript'}
          </span>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <>
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isRunning ? <FiLoader className="animate-spin w-3 h-3" /> : <FiPlay className="w-3 h-3" />}
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FiCheckCircle className="w-3 h-3" />
                Submit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'editor' 
              ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'output' 
              ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Output
        </button>
        {testResults.length > 0 && (
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === 'results' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Test Results
          </button>
        )}
      </div>

      <div className="relative">
        {activeTab === 'editor' && (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={readOnly}
            className="w-full h-96 font-mono text-sm bg-gray-900 text-gray-200 p-4 focus:outline-none resize-none"
            style={{ fontFamily: 'monospace' }}
            spellCheck={false}
          />
        )}

        {activeTab === 'output' && (
          <div className="h-96 bg-gray-900 p-4 overflow-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {output || 'Click Run to see output...'}
            </pre>
          </div>
        )}

        {activeTab === 'results' && testResults.length > 0 && (
          <div className="h-96 bg-gray-900 p-4 overflow-auto">
            <div className="space-y-3">
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    result.passed ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.passed ? (
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <FiXCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-white">Test Case {idx + 1}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      Expected: {result.expectedOutput}
                    </span>
                  </div>
                  {!result.passed && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-400">Your output:</p>
                      <pre className="text-red-400 font-mono text-xs mt-1 bg-red-900/20 p-2 rounded">
                        {result.actualOutput || 'No output'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {question?.coding?.timeLimit && (
        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
          Time Limit: {question.coding.timeLimit}ms | Memory Limit: {question.coding.memoryLimit}MB
        </div>
      )}
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;