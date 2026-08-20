const { runStandaloneCode, SUPPORTED_LANGUAGES, LANGUAGE_LABELS } = require('../services/standaloneCompilerService');

exports.runCode = async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    const result = await runStandaloneCode(code, language, stdin || '');

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Compiler error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to run code',
      stdout: '',
      stderr: error.message || 'Failed to run code',
      exitCode: 1
    });
  }
};

exports.getLanguages = async (_req, res) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES.map((id) => ({
      id,
      label: LANGUAGE_LABELS[id]
    }))
  });
};
