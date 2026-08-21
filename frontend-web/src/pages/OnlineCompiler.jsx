// frontend-web/src/pages/OnlineCompiler.jsx

import React, { useMemo, useState } from 'react';
import { FiPlay, FiLoader, FiTrash2, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { compilerAPI } from '../services/api';

const LANGUAGE_TEMPLATES = {
  javascript: `// JavaScript
function add(a, b) {
  return a + b;
}

console.log(add(2, 3));`,
  python: `# Python — use input() and put your answer in the Input box
name = input("Enter your name: ")
print("Hello,", name)`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++" << endl;
    return 0;
}`
};

const LANGUAGE_STDIN_PLACEHOLDERS = {
  javascript: 'Optional input for your program...',
  python: 'Example: Alice',
  cpp: 'Example: 10'
};

const LANGUAGE_STDIN_DEFAULTS = {
  python: 'Alice'
};

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' }
];

const OnlineCompiler = () => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [stdin, setStdin] = useState('');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState(null);
  const [running, setRunning] = useState(false);

  const outputText = useMemo(() => {
    const parts = [];
    if (stdout) parts.push(stdout);
    if (stderr) parts.push(stderr ? `\n[stderr]\n${stderr}` : '');
    if (exitCode !== null) parts.push(`\nProcess exited with code ${exitCode}`);
    return parts.join('').trim() || 'Run your code to see output here.';
  }, [stdout, stderr, exitCode]);

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    setCode(LANGUAGE_TEMPLATES[nextLanguage]);
    setStdin(LANGUAGE_STDIN_DEFAULTS[nextLanguage] || '');
    setStdout('');
    setStderr('');
    setExitCode(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setStdout('');
    setStderr('');
    setExitCode(null);

    try {
      const response = await compilerAPI.run({ code, language, stdin });
      const data = response.data;
      setStdout(data.stdout || '');
      setStderr(data.stderr || '');
      setExitCode(typeof data.exitCode === 'number' ? data.exitCode : data.success ? 0 : 1);

      if (data.success && !data.stderr) {
        toast.success('Code executed successfully');
      } else if (data.stderr) {
        toast.error('Execution finished with errors');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to run code';
      setStderr(message);
      setExitCode(1);
    } finally {
      setRunning(false);
    }
  };

  const handleClear = () => {
    setCode(LANGUAGE_TEMPLATES[language]);
    setStdin(LANGUAGE_STDIN_DEFAULTS[language] || '');
    setStdout('');
    setStderr('');
    setExitCode(null);
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      toast.success('Output copied');
    } catch (_) {
      toast.error('Could not copy output');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Online Compiler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Practice JavaScript, Python, and C++ — write your own code and run it instantly.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleLanguageChange(lang.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                language === lang.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shadow-lg">
              <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">Code Editor</span>
                <span className="text-xs text-gray-500 uppercase">{language}</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-[420px] p-4 bg-gray-900 text-green-400 font-mono text-sm leading-6 resize-none focus:outline-none"
                placeholder="Write your code here..."
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Input (stdin)</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                spellCheck={false}
                className="w-full h-28 p-4 font-mono text-sm text-gray-800 resize-none focus:outline-none"
                placeholder={LANGUAGE_STDIN_PLACEHOLDERS[language] || 'Optional input for your program...'}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRun}
                disabled={running}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {running ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
                {running ? 'Running...' : 'Run Code'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <FiTrash2 className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950 shadow-lg">
            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-300 font-medium">Output</span>
              <button
                type="button"
                onClick={handleCopyOutput}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
              >
                <FiCopy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="w-full h-[520px] p-4 overflow-auto text-sm font-mono text-gray-100 whitespace-pre-wrap">
              {outputText}
            </pre>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
          <p className="font-medium mb-1">Tips</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>JavaScript runs everywhere on the server (best for deployed/production use).</li>
            <li>Python and C++ need <code className="bg-blue-100 px-1 rounded">python3</code> / <code className="bg-blue-100 px-1 rounded">g++</code> on the server — may not work on all hosts.</li>
            <li>If you use <code className="bg-blue-100 px-1 rounded">input()</code> or <code className="bg-blue-100 px-1 rounded">cin</code>, put values in the <strong>Input (stdin)</strong> box.</li>
            <li>C++ programs should include <code className="bg-blue-100 px-1 rounded">int main()</code>.</li>
            <li>Execution timeout is 15 seconds per run.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default OnlineCompiler;
