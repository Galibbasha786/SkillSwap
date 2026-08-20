// Bulk question parser for Create Exam — paste blocks, get structured questions

const DEFAULT_CODING = {
  programmingLanguage: 'javascript',
  initialCode: 'function solve(input) {\n  // Write your code here\n  return null;\n}',
  solutionCode: '',
  functionName: 'solve',
  testCases: [],
  timeLimit: 2000,
  memoryLimit: 256
};

const parseMarks = (line, fallback = 1) => {
  const match = line.match(/^Marks?:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : fallback;
};

const parseMcqBlock = (body) => {
  const lines = body.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const options = [];
  let correctAnswer = '';
  let marks = 1;
  const questionLines = [];

  for (const line of lines) {
    const optMatch = line.match(/^[A-Da-d][\).:\-]\s*(.+)$/);
    const ansMatch = line.match(/^Answer:\s*(.+)$/i);
    const marksMatch = line.match(/^Marks?:\s*(\d+)/i);

    if (optMatch) {
      options.push(optMatch[1].trim());
    } else if (ansMatch) {
      const raw = ansMatch[1].trim();
      if (/^[A-Da-d]$/.test(raw)) {
        const idx = raw.toUpperCase().charCodeAt(0) - 65;
        correctAnswer = options[idx] || raw;
      } else {
        correctAnswer = raw;
      }
    } else if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
    } else {
      questionLines.push(line);
    }
  }

  if (!questionLines.length) throw new Error('MCQ missing question text');
  if (options.length < 2) throw new Error('MCQ needs at least 2 options (A, B, …)');
  if (!correctAnswer) throw new Error('MCQ missing Answer line');

  return {
    type: 'mcq',
    question: questionLines.join(' '),
    options,
    correctAnswer,
    marks
  };
};

const parseTheoryBlock = (body) => {
  const lines = body.trim().split('\n');
  let marks = 1;
  let keywords = [];
  const questionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const kwMatch = trimmed.match(/^Keywords?:\s*(.+)$/i);
    const marksMatch = trimmed.match(/^Marks?:\s*(\d+)/i);
    if (kwMatch) {
      keywords = kwMatch[1].split(',').map((k) => k.trim()).filter(Boolean);
    } else if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
    } else {
      questionLines.push(trimmed);
    }
  }

  if (!questionLines.length) throw new Error('Theory question missing text');

  return {
    type: 'theory',
    question: questionLines.join('\n'),
    keywords,
    marks
  };
};

const parseVivaBlock = (body) => {
  const lines = body.trim().split('\n');
  let marks = 1;
  const questionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const marksMatch = trimmed.match(/^Marks?:\s*(\d+)/i);
    if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
    } else {
      questionLines.push(trimmed);
    }
  }

  if (!questionLines.length) throw new Error('Viva question missing text');

  return {
    type: 'viva',
    question: questionLines.join('\n'),
    marks
  };
};

const parseMultilineValue = (lines, startIdx, label) => {
  const first = lines[startIdx];
  const inline = first.match(new RegExp(`^${label}:\\s*\\|\\s*(.+)$`, 'i'));
  if (inline && inline[1].trim()) {
    return { value: inline[1], nextIdx: startIdx + 1 };
  }
  const inlineSimple = first.match(new RegExp(`^${label}:\\s*(.+)$`, 'i'));
  if (inlineSimple && !first.match(new RegExp(`^${label}:\\s*\\|$`, 'i'))) {
    return { value: inlineSimple[1], nextIdx: startIdx + 1 };
  }
  if (first.match(new RegExp(`^${label}:\\s*\\|$`, 'i'))) {
    const parts = [];
    let i = startIdx + 1;
    while (i < lines.length && !/^(Lang|Language|Function|Marks?|Solution|Test|Initial):/i.test(lines[i])) {
      parts.push(lines[i]);
      i += 1;
    }
    return { value: parts.join('\n'), nextIdx: i };
  }
  return { value: '', nextIdx: startIdx + 1 };
};

const parseCodingBlock = (body) => {
  const lines = body.trim().split('\n');
  let marks = 1;
  let lang = 'javascript';
  let functionName = 'solve';
  let initialCode = DEFAULT_CODING.initialCode;
  let solutionCode = '';
  const testCases = [];
  const questionLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    const langMatch = line.match(/^(Lang|Language):\s*(\w+)/i);
    const fnMatch = line.match(/^Function:\s*(\w+)/i);
    const marksMatch = line.match(/^Marks?:\s*(\d+)/i);

    if (langMatch) {
      lang = langMatch[2].toLowerCase();
      i += 1;
    } else if (fnMatch) {
      functionName = fnMatch[1];
      i += 1;
    } else if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
      i += 1;
    } else if (/^Initial:/i.test(line)) {
      const { value, nextIdx } = parseMultilineValue(lines.map((l) => l.trim()), i, 'Initial');
      initialCode = value || initialCode;
      i = nextIdx;
    } else if (/^Solution:/i.test(line)) {
      const { value, nextIdx } = parseMultilineValue(lines.map((l) => l.trim()), i, 'Solution');
      solutionCode = value;
      i = nextIdx;
    } else if (/^Test:/i.test(line)) {
      let input = '';
      let output = '';
      i += 1;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t || t === '---') {
          i += 1;
          if (t === '---') break;
          continue;
        }
        const inMatch = t.match(/^(IN|INPUT):\s*(.+)$/i);
        const outMatch = t.match(/^(OUT|OUTPUT):\s*(.+)$/i);
        if (inMatch) {
          input = inMatch[2];
          i += 1;
        } else if (outMatch) {
          output = outMatch[2];
          i += 1;
          if (input !== '') {
            testCases.push({ input, expectedOutput: output, isHidden: false });
          }
          input = '';
          output = '';
        } else if (/^\[(MCQ|THEORY|CODING|VIVA)\]$/i.test(t)) {
          break;
        } else {
          i += 1;
        }
      }
    } else if (!/^(Lang|Function|Marks?|Solution|Initial|Test)/i.test(line)) {
      questionLines.push(line);
      i += 1;
    } else {
      i += 1;
    }
  }

  if (!questionLines.length) throw new Error('Coding question missing text');
  if (!testCases.length) throw new Error('Coding question needs at least one Test (IN/OUT)');
  if (!solutionCode) throw new Error('Coding question missing Solution');

  return {
    type: 'coding',
    question: questionLines.join('\n'),
    marks,
    coding: {
      ...DEFAULT_CODING,
      programmingLanguage: lang,
      functionName,
      initialCode,
      solutionCode,
      testCases
    }
  };
};

export const BULK_IMPORT_TEMPLATE = `[MCQ]
What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B
Marks: 1

[THEORY]
Explain JavaScript closures in your own words.
Keywords: closure, scope, function
Marks: 5

[CODING]
Write a function that returns the sum of two numbers.
Lang: javascript
Function: add
Marks: 10
Initial: |
function add(a, b) {
  return 0;
}
Solution: |
function add(a, b) {
  return a + b;
}
Test:
IN: 2,3
OUT: 5
---
IN: 10,20
OUT: 30

[VIVA]
Describe how you would debug a production issue.
Marks: 3`;

export function parseBulkQuestions(text) {
  const questions = [];
  const errors = [];

  if (!text || !text.trim()) {
    return { questions, errors: ['Paste your questions using the format below.'] };
  }

  const blocks = [];
  let current = null;

  for (const line of text.split('\n')) {
    const header = line.trim().match(/^\[(MCQ|THEORY|CODING|VIVA)\]$/i);
    if (header) {
      if (current) blocks.push(current);
      current = { type: header[1].toLowerCase(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);

  if (blocks.length === 0) {
    errors.push('No question blocks found. Start each block with [MCQ], [THEORY], [CODING], or [VIVA].');
    return { questions, errors };
  }

  blocks.forEach((block, index) => {
    const body = block.body.join('\n');
    try {
      let parsed;
      if (block.type === 'mcq') parsed = parseMcqBlock(body);
      else if (block.type === 'theory') parsed = parseTheoryBlock(body);
      else if (block.type === 'coding') parsed = parseCodingBlock(body);
      else if (block.type === 'viva') parsed = parseVivaBlock(body);
      else throw new Error(`Unknown type ${block.type}`);
      questions.push(parsed);
    } catch (err) {
      errors.push(`Block ${index + 1} (${block.type.toUpperCase()}): ${err.message}`);
    }
  });

  return { questions, errors };
}
