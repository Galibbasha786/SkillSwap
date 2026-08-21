const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const TEMP_DIR = path.join(os.tmpdir(), 'skillswap-compiler');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp'];

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++'
};

const createRunDir = () => {
  const runDir = path.join(TEMP_DIR, `run_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
};

const cleanupRunDir = (runDir) => {
  try {
    fs.rmSync(runDir, { recursive: true, force: true });
  } catch (_) {
    // ignore
  }
};

const normalizeStdin = (stdin) => {
  const text = String(stdin ?? '');
  if (!text) return '';
  return text.endsWith('\n') ? text : `${text}\n`;
};

const needsStdin = (code, language) => {
  const source = String(code || '');
  switch (language) {
    case 'python':
      return /\binput\s*\(/.test(source);
    case 'cpp':
      return /\bcin\s*>>|getline\s*\(/i.test(source);
    case 'javascript':
      return /readline|process\.stdin/i.test(source);
    default:
      return false;
  }
};

const runProcessWithStdin = (command, args, cwd, stdin = '', timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error('Execution timed out (15s limit)'));
        return;
      }
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });

    const pipeStdin = () => {
      const payload = normalizeStdin(stdin);
      if (payload && child.stdin.writable) {
        child.stdin.write(payload, 'utf8', () => {
          child.stdin.end();
        });
      } else {
        child.stdin.end();
      }
    };

    if (child.stdin) {
      if (child.pid) {
        pipeStdin();
      } else {
        child.on('spawn', pipeStdin);
      }
    }
  });

const checkCommand = async (command) => {
  try {
    await execPromise(`command -v ${command}`, { timeout: 3000 });
    return true;
  } catch (_) {
    return false;
  }
};

const ensureCppMain = (code) => {
  if (/\bint\s+main\s*\(/.test(code)) {
    return code;
  }

  return `#include <iostream>
using namespace std;

${code}

int main() {
    return 0;
}
`;
};

const runJavaScript = async (code, stdin) => {
  const runDir = createRunDir();
  const filePath = path.join(runDir, 'main.js');

  try {
    fs.writeFileSync(filePath, code);
    return await runProcessWithStdin('node', [filePath], runDir, stdin);
  } finally {
    cleanupRunDir(runDir);
  }
};

const runPython = async (code, stdin) => {
  const hasPython = await checkCommand('python3');
  if (!hasPython) {
    throw new Error('python3 is not installed on the server');
  }

  const runDir = createRunDir();
  const filePath = path.join(runDir, 'main.py');

  try {
    fs.writeFileSync(filePath, code);
    return await runProcessWithStdin('python3', [filePath], runDir, stdin);
  } finally {
    cleanupRunDir(runDir);
  }
};

const runCpp = async (code, stdin) => {
  const hasGpp = await checkCommand('g++');
  if (!hasGpp) {
    throw new Error('C++ compiler (g++) is not installed on the server');
  }

  const runDir = createRunDir();
  const sourceFile = path.join(runDir, 'main.cpp');
  const executableFile = path.join(runDir, 'main');

  try {
    fs.writeFileSync(sourceFile, ensureCppMain(code));
    await execPromise(`g++ "${sourceFile}" -o "${executableFile}" -std=c++17`, {
      cwd: runDir,
      timeout: 12000
    });
    return await runProcessWithStdin(executableFile, [], runDir, stdin);
  } finally {
    cleanupRunDir(runDir);
  }
};

const runStandaloneCode = async (code, language, stdin = '') => {
  if (!code || !String(code).trim()) {
    throw new Error('Code cannot be empty');
  }

  const normalizedLanguage = String(language || '').toLowerCase().trim();

  if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
    throw new Error(`Unsupported language. Choose one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  if (needsStdin(code, normalizedLanguage) && !String(stdin).trim()) {
    return {
      language: normalizedLanguage,
      languageLabel: LANGUAGE_LABELS[normalizedLanguage],
      stdout: '',
      stderr:
        'This program reads input from stdin. Enter values in the "Input (stdin)" box below the editor.\n' +
        'Example: type a number or text in the input box, then run again.',
      exitCode: 1,
      success: false
    };
  }

  let result;

  switch (normalizedLanguage) {
    case 'javascript':
      result = await runJavaScript(code, stdin);
      break;
    case 'python':
      result = await runPython(code, stdin);
      break;
    case 'cpp':
      result = await runCpp(code, stdin);
      break;
    default:
      throw new Error('Unsupported language');
  }

  return {
    language: normalizedLanguage,
    languageLabel: LANGUAGE_LABELS[normalizedLanguage],
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.exitCode,
    success: result.exitCode === 0
  };
};

module.exports = {
  runStandaloneCode,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS
};
