// backend/services/codeExecutionService.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Create temp directory for code execution
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== JAVASCRIPT ====================
// backend/services/codeExecutionService.js

// ==================== JAVASCRIPT ====================
const executeJavaScript = async (code, testCases, functionName = 'solve') => {
  const results = [];
  
  for (const testCase of testCases) {
    try {
      // Check if the code already defines the function
      let wrappedCode;
      
      // If the code already starts with 'function' or 'const', use it directly
      if (code.trim().startsWith('function') || code.trim().startsWith('const') || code.trim().startsWith('let')) {
        wrappedCode = `
          ${code}
          
          const input = ${testCase.input};
          const result = ${functionName}(input);
          console.log(result);
        `;
      } else {
        // If only the function body is provided, wrap it
        wrappedCode = `
          const ${functionName} = ${code};
          
          const input = ${testCase.input};
          const result = ${functionName}(input);
          console.log(result);
        `;
      }
      
      const fileName = `temp_${Date.now()}_${Math.random()}.js`;
      const filePath = path.join(TEMP_DIR, fileName);
      fs.writeFileSync(filePath, wrappedCode);
      
      console.log('📝 Executing JavaScript code:', wrappedCode);
      
      const { stdout, stderr } = await execPromise(`node ${filePath}`, { timeout: 5000 });
      
      fs.unlinkSync(filePath);
      
      let actualOutput = stdout.trim();
      
      // Handle special cases
      if (actualOutput === 'undefined') {
        actualOutput = 'null';
      }
      
      const passed = actualOutput === testCase.expectedOutput;
      
      console.log(`Test: ${testCase.input} → Expected: ${testCase.expectedOutput}, Got: ${actualOutput}, Passed: ${passed}`);
      
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: actualOutput || '(no output)',
        passed
      });
    } catch (error) {
      console.error('JavaScript execution error:', error);
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.message,
        passed: false
      });
    }
  }
  
  return results;
};
// ==================== PYTHON ====================
const executePython = async (code, testCases, functionName = 'solve') => {
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const wrappedCode = `
${code}
x
import json
input_data = ${JSON.stringify(testCase.input)}
result = ${functionName}(input_data)
print(json.dumps(result))
      `;
      
      const fileName = `temp_${Date.now()}_${Math.random()}.py`;
      const filePath = path.join(TEMP_DIR, fileName);
      fs.writeFileSync(filePath, wrappedCode);
      
      const { stdout, stderr } = await execPromise(`python3 ${filePath}`, { timeout: 5000 });
      
      fs.unlinkSync(filePath);
      
      const actualOutput = stdout.trim();
      const passed = actualOutput === testCase.expectedOutput;
      
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.message,
        passed: false
      });
    }
  }
  
  return results;
};

// ==================== JAVA ====================
const executeJava = async (code, testCases, functionName = 'solve') => {
  const results = [];
  const className = 'Main';
  
  // Wrap code in a class for Java
  const wrappedJavaCode = `
import java.util.*;
import com.google.gson.Gson;

public class ${className} {
    ${code}
    
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String input = scanner.nextLine();
        // Parse input as JSON
        Gson gson = new Gson();
        Object inputData = gson.fromJson(input, Object.class);
        Object result = ${functionName}(inputData);
        System.out.println(gson.toJson(result));
    }
}
  `;
  
  for (const testCase of testCases) {
    try {
      const fileName = `temp_${Date.now()}_${Math.random()}.java`;
      const filePath = path.join(TEMP_DIR, fileName);
      fs.writeFileSync(filePath, wrappedJavaCode);
      
      // Compile Java code
      const compileResult = await execPromise(`javac ${filePath}`, { timeout: 10000 });
      
      if (compileResult.stderr) {
        throw new Error(compileResult.stderr);
      }
      
      // Run Java code with input
      const classFilePath = path.join(TEMP_DIR, `${className}.class`);
      const runResult = await execPromise(
        `echo ${JSON.stringify(testCase.input)} | java -cp ${TEMP_DIR} ${className}`,
        { timeout: 5000 }
      );
      
      // Clean up files
      fs.unlinkSync(filePath);
      if (fs.existsSync(classFilePath)) {
        fs.unlinkSync(classFilePath);
      }
      
      const actualOutput = runResult.stdout.trim();
      const passed = actualOutput === testCase.expectedOutput;
      
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.message,
        passed: false
      });
    }
  }
  
  return results;
};

// ==================== C++ ====================
const executeCpp = async (code, testCases, functionName = 'solve') => {
  const results = [];
  const fileName = `temp_${Date.now()}_${Math.random()}`;
  const sourceFile = path.join(TEMP_DIR, `${fileName}.cpp`);
  const executableFile = path.join(TEMP_DIR, fileName);
  
  // Wrap code with main function for C++
  const wrappedCppCode = `
#include <iostream>
#include <string>
#include <sstream>
#include <nlohmann/json.hpp>
using json = nlohmann::json;

${code}

int main() {
    std::string input;
    std::getline(std::cin, input);
    json inputJson = json::parse(input);
    json result = ${functionName}(inputJson);
    std::cout << result.dump() << std::endl;
    return 0;
}
  `;
  
  for (const testCase of testCases) {
    try {
      fs.writeFileSync(sourceFile, wrappedCppCode);
      
      // Compile C++ code
      const compileResult = await execPromise(`g++ ${sourceFile} -o ${executableFile} -std=c++17`, { timeout: 10000 });
      
      if (compileResult.stderr) {
        throw new Error(compileResult.stderr);
      }
      
      // Run C++ code with input
      const runResult = await execPromise(
        `echo ${JSON.stringify(testCase.input)} | ${executableFile}`,
        { timeout: 5000 }
      );
      
      // Clean up files
      fs.unlinkSync(sourceFile);
      if (fs.existsSync(executableFile)) {
        fs.unlinkSync(executableFile);
      }
      
      const actualOutput = runResult.stdout.trim();
      const passed = actualOutput === testCase.expectedOutput;
      
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.message,
        passed: false
      });
    }
  }
  
  return results;
};

// ==================== C ====================
const executeC = async (code, testCases, functionName = 'solve') => {
  const results = [];
  const fileName = `temp_${Date.now()}_${Math.random()}`;
  const sourceFile = path.join(TEMP_DIR, `${fileName}.c`);
  const executableFile = path.join(TEMP_DIR, fileName);
  
  // Wrap code with main function for C
  const wrappedCCode = `
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <json-c/json.h>

${code}

int main() {
    char input[1024];
    fgets(input, sizeof(input), stdin);
    // Remove newline
    input[strcspn(input, "\\n")] = 0;
    
    struct json_object *inputJson = json_tokener_parse(input);
    struct json_object *result = ${functionName}(inputJson);
    
    printf("%s\\n", json_object_to_json_string(result));
    json_object_put(inputJson);
    json_object_put(result);
    return 0;
}
  `;
  
  for (const testCase of testCases) {
    try {
      fs.writeFileSync(sourceFile, wrappedCCode);
      
      // Compile C code
      const compileResult = await execPromise(`gcc ${sourceFile} -o ${executableFile} -ljson-c`, { timeout: 10000 });
      
      if (compileResult.stderr) {
        throw new Error(compileResult.stderr);
      }
      
      // Run C code with input
      const runResult = await execPromise(
        `echo ${JSON.stringify(testCase.input)} | ${executableFile}`,
        { timeout: 5000 }
      );
      
      // Clean up files
      fs.unlinkSync(sourceFile);
      if (fs.existsSync(executableFile)) {
        fs.unlinkSync(executableFile);
      }
      
      const actualOutput = runResult.stdout.trim();
      const passed = actualOutput === testCase.expectedOutput;
      
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error.message,
        passed: false
      });
    }
  }
  
  return results;
};

// ==================== MAIN EXECUTION FUNCTION ====================
const executeCode = async (code, language, testCases, functionName = 'solve') => {
  switch (language) {
    case 'javascript':
      return await executeJavaScript(code, testCases, functionName);
    case 'python':
      return await executePython(code, testCases, functionName);
    case 'java':
      return await executeJava(code, testCases, functionName);
    case 'cpp':
      return await executeCpp(code, testCases, functionName);
    case 'c':
      return await executeC(code, testCases, functionName);
    default:
      throw new Error(`Language ${language} not supported`);
  }
};

module.exports = { executeCode };