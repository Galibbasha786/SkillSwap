// backend/services/codeExecutionService.js

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const TEMP_DIR = path.join(os.tmpdir(), 'skillswap-code-exec');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const createRunDir = () => {
  const runDir = path.join(TEMP_DIR, `run_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
};

const cleanupRunDir = (runDir) => {
  try {
    fs.rmSync(runDir, { recursive: true, force: true });
  } catch (_) {
    // ignore cleanup errors
  }
};

const parseTestInput = (rawInput) => {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_) {
    // fall through
  }

  if (/^-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?)*$/.test(trimmed)) {
    return trimmed.split(',').map((part) => {
      const value = part.trim();
      if (/^-?\d+$/.test(value)) return parseInt(value, 10);
      return parseFloat(value);
    });
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return [/-?\d+$/.test(trimmed) ? parseInt(trimmed, 10) : parseFloat(trimmed)];
  }

  if (trimmed === 'true') return [true];
  if (trimmed === 'false') return [false];
  if (trimmed === 'null') return [null];

  return [trimmed];
};

const normalizeOutput = (value) => {
  if (value === null || value === undefined) return 'null';
  const text = String(value).trim();
  if (text === 'undefined') return 'null';
  return text;
};

const outputsMatch = (actual, expected) => {
  const actualNorm = normalizeOutput(actual);
  const expectedNorm = normalizeOutput(expected);

  if (actualNorm === expectedNorm) return true;

  const actualNum = Number(actualNorm);
  const expectedNum = Number(expectedNorm);
  if (!Number.isNaN(actualNum) && !Number.isNaN(expectedNum)) {
    return actualNum === expectedNum;
  }

  return false;
};

const formatJsArgs = (args) => args.map((arg) => JSON.stringify(arg)).join(', ');

const formatPythonArgs = (args) => args.map((arg) => JSON.stringify(arg)).join(', ');

const formatJavaArgs = (args) =>
  args
    .map((arg) => {
      if (typeof arg === 'number') {
        return Number.isInteger(arg) ? `(int) ${arg}` : `(double) ${arg}`;
      }
      if (typeof arg === 'boolean') return arg ? 'true' : 'false';
      if (arg === null) return 'null';
      return `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    })
    .join(', ');

const formatCppArgs = (args) =>
  args
    .map((arg) => {
      if (typeof arg === 'number') return Number.isInteger(arg) ? String(arg) : String(arg);
      if (typeof arg === 'boolean') return arg ? 'true' : 'false';
      if (arg === null) return '0';
      return `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    })
    .join(', ');

const runProcess = async (command, options = {}) =>
  execPromise(command, { timeout: options.timeout || 8000, maxBuffer: 1024 * 1024, ...options });

const checkCommand = async (command) => {
  try {
    await runProcess(`command -v ${command}`, { timeout: 3000 });
    return true;
  } catch (_) {
    return false;
  }
};

const executeJavaScript = async (code, testCases, functionName = 'solve') => {
  const results = [];

  for (const testCase of testCases) {
    const runDir = createRunDir();
    const filePath = path.join(runDir, 'solution.js');

    try {
      const args = parseTestInput(testCase.input);
      const callArgs = formatJsArgs(args);
      const trimmedCode = code.trim();
      const wrappedCode =
        trimmedCode.startsWith('function') ||
        trimmedCode.startsWith('const') ||
        trimmedCode.startsWith('let') ||
        trimmedCode.startsWith('class')
          ? `
${code}

const __result = ${functionName}(${callArgs});
if (typeof __result === 'object' && __result !== null) {
  console.log(JSON.stringify(__result));
} else {
  console.log(__result);
}
`
          : `
const ${functionName} = ${code};

const __result = ${functionName}(${callArgs});
if (typeof __result === 'object' && __result !== null) {
  console.log(JSON.stringify(__result));
} else {
  console.log(__result);
}
`;

      fs.writeFileSync(filePath, wrappedCode);
      const { stdout } = await runProcess(`node "${filePath}"`);
      const actualOutput = normalizeOutput(stdout);

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: actualOutput || '(no output)',
        passed: outputsMatch(actualOutput, testCase.expectedOutput)
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.stderr?.trim() || error.message,
        passed: false
      });
    } finally {
      cleanupRunDir(runDir);
    }
  }

  return results;
};

const executePython = async (code, testCases, functionName = 'solve') => {
  const hasPython = await checkCommand('python3');
  if (!hasPython) {
    return testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: 'python3 is not installed on the server',
      passed: false
    }));
  }

  const results = [];

  for (const testCase of testCases) {
    const runDir = createRunDir();
    const filePath = path.join(runDir, 'solution.py');

    try {
      const args = parseTestInput(testCase.input);
      const callArgs = formatPythonArgs(args);
      const wrappedCode = `
import json

${code}

__result = ${functionName}(${callArgs})
print(json.dumps(__result) if isinstance(__result, (dict, list, tuple, bool)) or __result is None else __result)
`;

      fs.writeFileSync(filePath, wrappedCode);
      const { stdout } = await runProcess(`python3 "${filePath}"`);
      const actualOutput = normalizeOutput(stdout);

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed: outputsMatch(actualOutput, testCase.expectedOutput)
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.stderr?.trim() || error.message,
        passed: false
      });
    } finally {
      cleanupRunDir(runDir);
    }
  }

  return results;
};

const executeJava = async (code, testCases, functionName = 'solve') => {
  const hasJava = await checkCommand('javac');
  if (!hasJava) {
    return testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: 'Java compiler (javac) is not installed on the server',
      passed: false
    }));
  }

  const results = [];
  const className = 'Main';

  for (const testCase of testCases) {
    const runDir = createRunDir();
    const filePath = path.join(runDir, `${className}.java`);

    try {
      const args = parseTestInput(testCase.input);
      const callArgs = formatJavaArgs(args);
      const wrappedJavaCode = `
public class ${className} {
    ${code}

    public static void main(String[] args) {
        Object result = ${functionName}(${callArgs});
        System.out.println(convertToString(result));
    }

    static String convertToString(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return (String) obj;
        if (obj instanceof Double) {
            double d = (Double) obj;
            if (d == (long) d) return String.valueOf((long) d);
            return String.valueOf(d);
        }
        return String.valueOf(obj);
    }
}
`;

      fs.writeFileSync(filePath, wrappedJavaCode);
      await runProcess(`javac "${filePath}"`, { timeout: 12000 });
      const { stdout } = await runProcess(`java -cp "${runDir}" ${className}`, { timeout: 8000 });
      const actualOutput = normalizeOutput(stdout);

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed: outputsMatch(actualOutput, testCase.expectedOutput)
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.stderr?.trim() || error.message,
        passed: false
      });
    } finally {
      cleanupRunDir(runDir);
    }
  }

  return results;
};

const executeCpp = async (code, testCases, functionName = 'solve') => {
  const hasGpp = await checkCommand('g++');
  if (!hasGpp) {
    return testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: 'C++ compiler (g++) is not installed on the server',
      passed: false
    }));
  }

  const results = [];

  for (const testCase of testCases) {
    const runDir = createRunDir();
    const sourceFile = path.join(runDir, 'solution.cpp');
    const executableFile = path.join(runDir, 'solution');

    try {
      const args = parseTestInput(testCase.input);
      const callArgs = formatCppArgs(args);
      const wrappedCppCode = `
#include <iostream>
#include <string>

${code}

int main() {
    auto result = ${functionName}(${callArgs});
    std::cout << result << std::endl;
    return 0;
}
`;

      fs.writeFileSync(sourceFile, wrappedCppCode);
      await runProcess(`g++ "${sourceFile}" -o "${executableFile}" -std=c++17`, { timeout: 12000 });
      const { stdout } = await runProcess(`"${executableFile}"`, { timeout: 8000 });
      const actualOutput = normalizeOutput(stdout);

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed: outputsMatch(actualOutput, testCase.expectedOutput)
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.stderr?.trim() || error.message,
        passed: false
      });
    } finally {
      cleanupRunDir(runDir);
    }
  }

  return results;
};

const executeC = async (code, testCases, functionName = 'solve') => {
  const hasGcc = await checkCommand('gcc');
  if (!hasGcc) {
    return testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: 'C compiler (gcc) is not installed on the server',
      passed: false
    }));
  }

  const results = [];

  for (const testCase of testCases) {
    const runDir = createRunDir();
    const sourceFile = path.join(runDir, 'solution.c');
    const executableFile = path.join(runDir, 'solution');

    try {
      const args = parseTestInput(testCase.input);
      if (args.length !== 1) {
        throw new Error('C runner supports one argument per test case. Use comma-separated values only for multi-arg languages.');
      }

      const arg = args[0];
      const cArg =
        typeof arg === 'number'
          ? String(arg)
          : `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

      const wrappedCCode = `
#include <stdio.h>

${code}

int main() {
    int result = ${functionName}(${cArg});
    printf("%d\\n", result);
    return 0;
}
`;

      fs.writeFileSync(sourceFile, wrappedCCode);
      await runProcess(`gcc "${sourceFile}" -o "${executableFile}"`, { timeout: 12000 });
      const { stdout } = await runProcess(`"${executableFile}"`, { timeout: 8000 });
      const actualOutput = normalizeOutput(stdout);

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed: outputsMatch(actualOutput, testCase.expectedOutput)
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.stderr?.trim() || error.message,
        passed: false
      });
    } finally {
      cleanupRunDir(runDir);
    }
  }

  return results;
};

const executeCode = async (code, language, testCases, functionName = 'solve') => {
  try {
    if (!code || !language || !testCases || testCases.length === 0) {
      throw new Error('Invalid input: code, language, and testCases are required');
    }

    if (!Array.isArray(testCases)) {
      throw new Error('testCases must be an array');
    }

    const normalizedLanguage = language.toLowerCase().trim();

    switch (normalizedLanguage) {
      case 'javascript':
        return await executeJavaScript(code, testCases, functionName);
      case 'python':
        return await executePython(code, testCases, functionName);
      case 'java':
        return await executeJava(code, testCases, functionName);
      case 'cpp':
      case 'c++':
        return await executeCpp(code, testCases, functionName);
      case 'c':
        return await executeC(code, testCases, functionName);
      default:
        return testCases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: `Language '${language}' is not supported. Supported: javascript, python, java, cpp, c`,
          passed: false
        }));
    }
  } catch (error) {
    console.error('Code execution error:', error);
    return testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: error.message,
      passed: false
    }));
  }
};

module.exports = { executeCode, parseTestInput, outputsMatch };
