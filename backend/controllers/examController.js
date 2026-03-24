// backend/controllers/examController.js

const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const Session = require('../models/Session');
const { getLogoBase64 } = require('../utils/logoUtil');
const fs = require('fs');
// @desc    Create exam
// @route   POST /api/exams
// @access  Private (Teacher only)
// backend/controllers/examController.js - Update createExam

exports.createExam = async (req, res) => {
  try {
    console.log('📝 Creating exam with data:', JSON.stringify(req.body, null, 2));
    console.log('👤 Teacher ID:', req.user.id);
    
    const { availableFrom, availableTo, ...otherData } = req.body;
    
    // Validate dates
    const fromDate = new Date(availableFrom);
    const toDate = new Date(availableTo);
    
    if (fromDate >= toDate) {
      return res.status(400).json({ 
        message: 'Available To date must be after Available From date' 
      });
    }
    
    if (toDate <= new Date()) {
      return res.status(400).json({ 
        message: 'Available To date must be in the future' 
      });
    }
    
    const examData = {
      ...otherData,
      teacherId: req.user.id,
      availableFrom: fromDate,
      availableTo: toDate,
      status: 'active'
    };
    
    // Remove any _id from questions if present
    if (examData.questions) {
      examData.questions = examData.questions.map(q => {
        const { _id, ...cleanQuestion } = q;
        return cleanQuestion;
      });
    }
    
    const exam = await Exam.create(examData);
    console.log('✅ Exam created successfully:', exam._id);
    
    res.status(201).json(exam);
  } catch (error) {
    console.error('❌ Error creating exam:', error);
    res.status(500).json({ message: 'Failed to create exam', error: error.message });
  }
};
// @desc    Get all exams for teacher
// @route   GET /api/exams/teacher
// @access  Private (Teacher only)
exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ teacherId: req.user.id })
      .sort('-createdAt');
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

// @desc    Get available exams for student
// @route   GET /api/exams/available
// @access  Private
// backend/controllers/examController.js - Update getAvailableExams

exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    
    // Get all sessions where this student is the learner
    const sessions = await Session.find({ 
      learnerId: req.user.id,
      status: { $in: ['completed', 'scheduled'] }
    }).select('teacherId');
    
    // Get unique teacher IDs
    const teacherIds = [...new Set(sessions.map(s => s.teacherId.toString()))];
    
    // Get active exams from those teachers that are within date range
    const exams = await Exam.find({ 
      teacherId: { $in: teacherIds },
      status: 'active',
      isActive: true,
      availableFrom: { $lte: now },
      availableTo: { $gte: now }
    })
    .populate('teacherId', 'name profileImage')
    .sort('-createdAt');
    
    // Auto-expire exams that have passed their availableTo date
    const expiredExams = await Exam.find({
      status: 'active',
      availableTo: { $lt: now }
    });
    
    for (const expiredExam of expiredExams) {
      expiredExam.status = 'expired';
      expiredExam.isActive = false;
      await expiredExam.save();
      console.log(`📅 Exam ${expiredExam.title} expired automatically`);
    }
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching available exams:', error);
    res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

// @desc    Start exam
// @route   POST /api/exams/:examId/start
// @access  Private
// backend/controllers/examController.js - Update startExam

// @desc    Start exam
// @route   POST /api/exams/:examId/start
// @access  Private
// backend/controllers/examController.js - Update startExam

exports.startExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const now = new Date();
    
    // Check if exam is within date range
    if (now < exam.availableFrom) {
      return res.status(400).json({ 
        message: `Exam is not available yet. Available from: ${new Date(exam.availableFrom).toLocaleString()}` 
      });
    }
    
    if (now > exam.availableTo) {
      // Auto-expire if past due date
      exam.status = 'expired';
      exam.isActive = false;
      await exam.save();
      return res.status(400).json({ 
        message: 'Exam has expired. It is no longer available.' 
      });
    }
    
    // Check if student has a session with this teacher
    const session = await Session.findOne({
      teacherId: exam.teacherId,
      learnerId: req.user.id,
      status: { $in: ['completed', 'scheduled'] }
    });
    
    if (!session) {
      return res.status(403).json({ 
        message: 'You can only take exams from teachers you have sessions with' 
      });
    }

    // Check if already passed
    const passedAttempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: req.user.id,
      status: 'passed'
    });

    if (passedAttempt) {
      return res.status(400).json({ 
        message: 'You have already passed this exam',
        passed: true,
        percentage: passedAttempt.percentage,
        certificateId: passedAttempt.certificateId
      });
    }
    
    // Check if there's an in-progress attempt
    const inProgressAttempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (inProgressAttempt) {
      // Check if time has expired
      const elapsed = (Date.now() - new Date(inProgressAttempt.startTime).getTime()) / 1000;
      const remaining = Math.max(0, exam.duration * 60 - elapsed);
      
      if (remaining <= 0) {
        // Auto-finish expired exam
        inProgressAttempt.status = 'failed';
        inProgressAttempt.endTime = new Date();
        await inProgressAttempt.save();
        return res.status(400).json({ 
          message: 'Your previous attempt has expired',
          expired: true
        });
      }
      
      return res.json({ 
        attempt: inProgressAttempt, 
        existing: true, 
        exam,
        remainingTime: Math.floor(remaining)
      });
    }

    const attempt = await ExamAttempt.create({
      examId: exam._id,
      studentId: req.user.id,
      startTime: new Date()
    });

    console.log('✅ Exam started:', attempt._id);
    res.json({ attempt, exam, remainingTime: exam.duration * 60 });
  } catch (error) {
    console.error('❌ Error starting exam:', error);
    res.status(500).json({ message: 'Failed to start exam' });
  }
};
// @desc    Submit answer
// @route   POST /api/exams/:examId/submit
// @access  Private
// backend/controllers/examController.js - Update submitAnswer

// @desc    Submit answer
// @route   POST /api/exams/:examId/submit
// @access  Private
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, answer, timeSpent } = req.body;
    console.log('📝 Submitting answer for question:', questionId);
    
    const attempt = await ExamAttempt.findOne({
      examId: req.params.examId,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Find the question
    const question = exam.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    let isCorrect = false;
    let marksObtained = 0;

    // Grade based on question type
    if (question.type === 'mcq') {
      isCorrect = answer === question.correctAnswer;
      marksObtained = isCorrect ? question.marks : 0;
    } else if (question.type === 'theory') {
      const keywords = question.keywords || [];
      const answerLower = answer.toLowerCase();
      const matchedKeywords = keywords.filter(k => answerLower.includes(k.toLowerCase()));
      isCorrect = matchedKeywords.length >= (keywords.length * 0.6);
      marksObtained = isCorrect ? question.marks : 0;
    }

    // Check if question already answered
    const existingAnswerIndex = attempt.answers.findIndex(a => a.questionId === questionId);
    
    if (existingAnswerIndex !== -1) {
      // Update existing answer
      const oldMarks = attempt.answers[existingAnswerIndex].marksObtained;
      attempt.obtainedMarks -= oldMarks;
      attempt.answers[existingAnswerIndex] = {
        questionId,
        answer,
        isCorrect,
        marksObtained,
        timeSpent
      };
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        answer,
        isCorrect,
        marksObtained,
        timeSpent
      });
    }
    
    attempt.obtainedMarks += marksObtained;
    await attempt.save();

    console.log(`✅ Answer submitted: Q${questionId} - Correct: ${isCorrect}, Marks: ${marksObtained}`);
    
    res.json({ success: true, marksObtained, isCorrect });
  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
};

// @desc    Submit exam
// @route   POST /api/exams/:examId/finish
// @access  Private
// backend/controllers/examController.js - Update finishExam

// @desc    Finish exam
// @route   POST /api/exams/:examId/finish
// @access  Private
exports.finishExam = async (req, res) => {
  try {
    // Check if already finished
    const existingFinished = await ExamAttempt.findOne({
      examId: req.params.examId,
      studentId: req.user.id,
      status: { $in: ['passed', 'failed', 'completed'] }
    });
    
    if (existingFinished) {
      return res.status(400).json({ 
        message: 'You have already completed this exam',
        passed: existingFinished.passed,
        percentage: existingFinished.percentage,
        certificate: existingFinished.certificateId ? { _id: existingFinished.certificateId } : null
      });
    }
    
    const attempt = await ExamAttempt.findOne({
      examId: req.params.examId,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const exam = await Exam.findById(req.params.examId);
    
    const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? (attempt.obtainedMarks / totalMarks) * 100 : 0;
    const passed = percentage >= exam.passingScore;

    attempt.totalMarks = totalMarks;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.status = passed ? 'passed' : 'failed';
    attempt.endTime = new Date();
    await attempt.save();

    let certificate = null;
    if (passed) {
      try {
        certificate = await generateCertificate(exam, attempt, req.user);
        // Save certificate ID to attempt
        attempt.certificateId = certificate._id;
        await attempt.save();
        console.log('✅ Certificate created:', certificate._id);
      } catch (certError) {
        console.error('❌ Certificate generation failed:', certError);
      }
    }

    console.log(`✅ Exam finished: ${passed ? 'PASSED' : 'FAILED'} - ${percentage.toFixed(2)}%`);
    
    res.json({ 
      passed, 
      percentage, 
      certificate: certificate ? {
        _id: certificate._id,
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        skillName: certificate.skillName,
        percentage: certificate.percentage
      } : null,
      attempt 
    });
  } catch (error) {
    console.error('❌ Error finishing exam:', error);
    res.status(500).json({ message: 'Failed to finish exam' });
  }
};



// @desc    Record proctoring violation
// @route   POST /api/exams/:examId/violation
// @access  Private
exports.recordViolation = async (req, res) => {
  try {
    const { type, details } = req.body;
    console.log('📝 Recording violation:', { type, details });
    
    const attempt = await ExamAttempt.findOne({
      examId: req.params.examId,
      studentId: req.user.id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Validate violation type
    const validTypes = [
      'tab_switch', 'face_missing', 'screenshot', 'window_resize', 
      'mouse_leave', 'right_click', 'copy_attempt', 'paste_attempt', 
      'print_attempt', 'fullscreen_exit', 'camera_denied'
    ];
    
    if (!validTypes.includes(type)) {
      console.log('⚠️ Invalid violation type:', type);
      return res.status(400).json({ message: 'Invalid violation type' });
    }

    // Add violation log
    attempt.proctoringLogs.push({ 
      type, 
      timestamp: new Date(), 
      details: details || '' 
    });
    attempt.violations += 1;

    // Check if should terminate
    if (attempt.violations >= 5) {
      attempt.status = 'terminated';
      await attempt.save();
      console.log('❌ Exam terminated due to violations');
      return res.json({ 
        terminated: true, 
        message: 'Exam terminated due to multiple violations',
        violations: attempt.violations
      });
    }

    await attempt.save();
    console.log(`⚠️ Violation recorded: ${type} (${attempt.violations}/5)`);
    
    res.json({ 
      success: true, 
      violations: attempt.violations,
      message: `Violation recorded (${attempt.violations}/5)`
    });
  } catch (error) {
    console.error('❌ Error recording violation:', error);
    res.status(500).json({ message: 'Failed to record violation' });
  }
};
// Helper function to generate certificate
// backend/controllers/examController.js - Update generateCertificate

// backend/controllers/examController.js - Replace the generateCertificate function

const generateCertificate = async (exam, attempt, user) => {
  try {
    const certificateId = crypto.randomBytes(16).toString('hex');
    
    // Generate QR Code
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${certificateId}`;
    const qrData = JSON.stringify({
      certificateId,
      student: user.name,
      skill: exam.skillName,
      date: new Date().toISOString(),
      score: attempt.percentage,
      verifyUrl: verificationUrl
    });
    
    const qrCode = await QRCode.toDataURL(qrData);
    
    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50
    });
    
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    
    // Brand colors
    const colors = {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#10B981',
      gold: '#F59E0B',
      light: '#EFF6FF',
      dark: '#1F2937',
      gray: '#6B7280'
    };
    
    // ========== BORDERS ==========
    
    // Outer border
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
      .stroke(colors.primary)
      .lineWidth(2);
    
    // Inner border
    doc.rect(margin + 10, margin + 10, pageWidth - (margin * 2) - 20, pageHeight - (margin * 2) - 20)
      .stroke(colors.accent)
      .lineWidth(1);
    
    // Corner decorations
    const cornerSize = 30;
    // Top-left
    doc.rect(margin, margin, cornerSize, 3).fill(colors.secondary);
    doc.rect(margin, margin, 3, cornerSize).fill(colors.secondary);
    // Top-right
    doc.rect(pageWidth - margin - cornerSize, margin, cornerSize, 3).fill(colors.secondary);
    doc.rect(pageWidth - margin - 3, margin, 3, cornerSize).fill(colors.secondary);
    // Bottom-left
    doc.rect(margin, pageHeight - margin - cornerSize, cornerSize, 3).fill(colors.secondary);
    doc.rect(margin, pageHeight - margin - cornerSize, 3, cornerSize).fill(colors.secondary);
    // Bottom-right
    doc.rect(pageWidth - margin - cornerSize, pageHeight - margin - cornerSize, cornerSize, 3).fill(colors.secondary);
    doc.rect(pageWidth - margin - 3, pageHeight - margin - cornerSize, 3, cornerSize).fill(colors.secondary);
    
    // ========== LOGO SECTION ==========
    let currentY = margin + 35;
    
    // Get logo from logoUtil
    const { getLogoBase64 } = require('../utils/logoUtil');
    const logoBase64 = getLogoBase64();
    
    if (logoBase64) {
      try {
        // Decode base64 to buffer
        const logoBuffer = Buffer.from(logoBase64.split(',')[1], 'base64');
        doc.image(logoBuffer, margin + 30, currentY - 15, { width: 70 });
        currentY = currentY + 40;
      } catch (err) {
        console.log('Logo placement error:', err);
        // Fallback to text logo
        doc.font('Helvetica-Bold')
          .fontSize(24)
          .fill(colors.primary)
          .text('SKILL', margin + 30, currentY);
        doc.font('Helvetica-Bold')
          .fontSize(24)
          .fill(colors.secondary)
          .text('SWAP', margin + 105, currentY);
        doc.font('Helvetica')
          .fontSize(8)
          .fill(colors.gray)
          .text('LEARN.SHARE.GROW.', margin + 30, currentY + 28);
        currentY = currentY + 50;
      }
    } else {
      // Text logo fallback
      doc.font('Helvetica-Bold')
        .fontSize(24)
        .fill(colors.primary)
        .text('SKILL', margin + 30, currentY);
      doc.font('Helvetica-Bold')
        .fontSize(24)
        .fill(colors.secondary)
        .text('SWAP', margin + 105, currentY);
      doc.font('Helvetica')
        .fontSize(8)
        .fill(colors.gray)
        .text('LEARN.SHARE.GROW.', margin + 30, currentY + 28);
      currentY = currentY + 50;
    }
    
    // ========== CERTIFICATE TITLE ==========
    currentY = margin + 100;
    
    doc.font('Helvetica-Bold')
      .fontSize(36)
      .fill(colors.primary)
      .text('CERTIFICATE', margin + 30, currentY);
    
    doc.font('Helvetica-Bold')
      .fontSize(28)
      .fill(colors.accent)
      .text('OF ACHIEVEMENT', margin + 30, currentY + 45);
    
    // ========== SUBTITLE ==========
    currentY = margin + 170;
    
    doc.font('Helvetica')
      .fontSize(16)
      .fill(colors.gray)
      .text('This is to proudly certify that', margin + 30, currentY);
    
    // ========== STUDENT NAME ==========
    currentY = margin + 210;
    
    doc.font('Helvetica-Bold')
      .fontSize(42)
      .fill(colors.primary)
      .text(user.name, margin + 30, currentY);
    
    // ========== ACHIEVEMENT TEXT ==========
    currentY = margin + 270;
    
    doc.font('Helvetica')
      .fontSize(16)
      .fill(colors.gray)
      .text('has successfully completed the', margin + 30, currentY);
    
    // ========== SKILL NAME ==========
    currentY = margin + 310;
    
    // Background highlight for skill
    const skillWidth = doc.widthOfString(exam.skillName);
    doc.rect(margin + 25, currentY - 8, skillWidth + 10, 38)
      .fill(colors.light);
    
    doc.font('Helvetica-Bold')
      .fontSize(28)
      .fill(colors.secondary)
      .text(exam.skillName, margin + 30, currentY);
    
    // ========== DESCRIPTION ==========
    currentY = margin + 370;
    
    doc.font('Helvetica')
      .fontSize(10)
      .fill(colors.gray)
      .text('Demonstrating exceptional knowledge and practical understanding', margin + 30, currentY);
    
    doc.font('Helvetica')
      .fontSize(10)
      .fill(colors.gray)
      .text('of the subject matter through rigorous assessment and evaluation.', margin + 30, currentY + 15);
    
    // ========== SCORE SECTION ==========
    currentY = margin + 430;
    
    const score = attempt.percentage.toFixed(2);
    const scoreWidth_display = doc.widthOfString(`${score}%`);
    
    // Score badge
    doc.rect(margin + 30, currentY - 10, 100, 35)
      .fill(colors.accent);
    
    doc.font('Helvetica-Bold')
      .fontSize(24)
      .fill('#FFFFFF')
      .text(`${score}%`, margin + 40, currentY - 5);
    
    // Grade text
    let grade = '';
    let gradeColor = '';
    if (attempt.percentage >= 90) {
      grade = 'EXCELLENT';
      gradeColor = '#10B981';
    } else if (attempt.percentage >= 80) {
      grade = 'DISTINCTION';
      gradeColor = '#3B82F6';
    } else if (attempt.percentage >= 70) {
      grade = 'MERIT';
      gradeColor = '#8B5CF6';
    } else if (attempt.percentage >= 60) {
      grade = 'CREDIT';
      gradeColor = '#F59E0B';
    } else {
      grade = 'PASS';
      gradeColor = '#6B7280';
    }
    
    doc.font('Helvetica-Bold')
      .fontSize(18)
      .fill(gradeColor)
      .text(grade, margin + 150, currentY - 5);
    
    // ========== FOOTER SECTION ==========
    const footerY = pageHeight - margin - 80;
    
    // Left - Certificate Details
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fill(colors.primary)
      .text('CERTIFICATE DETAILS', margin + 30, footerY);
    
    doc.font('Helvetica')
      .fontSize(8)
      .fill(colors.gray)
      .text(`Certificate ID: ${certificateId.slice(0, 8)}-${certificateId.slice(8, 16)}-${certificateId.slice(16, 24)}`, margin + 30, footerY + 15);
    
    doc.font('Helvetica')
      .fontSize(8)
      .fill(colors.gray)
      .text(`Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 30, footerY + 30);
    
    // Right - QR Code
    const qrImage = await QRCode.toBuffer(qrData);
    doc.image(qrImage, pageWidth - margin - 90, footerY - 10, { width: 70 });
    
    // Center - Signature
    const teacher = await User.findById(exam.teacherId);
    const signatureX = (pageWidth / 2) - 80;
    
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fill(colors.primary)
      .text('AUTHORIZED SIGNATURE', signatureX, footerY - 5);
    
    // Signature line
    doc.moveTo(signatureX, footerY + 10)
      .lineTo(signatureX + 160, footerY + 10)
      .stroke(colors.secondary)
      .lineWidth(1);
    
    doc.font('Helvetica')
      .fontSize(9)
      .fill(colors.dark)
      .text(teacher.name, signatureX, footerY + 15);
    
    doc.font('Helvetica')
      .fontSize(7)
      .fill(colors.gray)
      .text('(Instructor / Certifying Authority)', signatureX, footerY + 30);
    
    // Bottom verification note
    doc.font('Helvetica')
      .fontSize(7)
      .fill(colors.gray)
      .text(`Verify this certificate at: ${verificationUrl}`, { align: 'center', y: pageHeight - margin - 20 });
    
    // Decorative line
    doc.moveTo(margin + 30, footerY - 25)
      .lineTo(pageWidth - margin - 30, footerY - 25)
      .stroke(colors.light)
      .lineWidth(0.5);
    
    doc.end();
    
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });
    
    const pdfBuffer = Buffer.concat(buffers);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const certificate = await Certificate.create({
      examId: exam._id,
      studentId: user.id,
      teacherId: exam.teacherId,
      attemptId: attempt._id,
      certificateId: certificateId,
      studentName: user.name,
      skillName: exam.skillName,
      score: attempt.percentage,
      percentage: attempt.percentage,
      certificateUrl: `data:application/pdf;base64,${pdfBase64}`,
      qrCode
    });
    
    return certificate;
  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    throw error;
  }
};
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      certificateId: req.params.certificateId 
    }).populate('examId', 'title skillName');
    
    if (!certificate) {
      return res.status(404).json({ message: 'Invalid certificate' });
    }
    
    res.json({
      valid: true,
      certificate: {
        studentName: certificate.studentName,
        skillName: certificate.skillName,
        score: certificate.score,
        issueDate: certificate.issueDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// @desc    Download certificate
// @route   GET /api/certificates/:certificateId/download
// @access  Private
exports.downloadCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.certificateId);
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    // Decode base64 PDF
    const pdfBuffer = Buffer.from(certificate.certificateUrl.split(',')[1], 'base64');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to download certificate' });
  }
};
// backend/controllers/examController.js

// Add these functions at the end of your examController.js

// @desc    Get certificate by ID
// @route   GET /api/certificates/:certificateId
// @access  Private
exports.getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      certificateId: req.params.certificateId 
    }).populate('examId', 'title skillName');
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    if (certificate.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(certificate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch certificate' });
  }
};

// @desc    Download certificate
// @route   GET /api/certificates/:certificateId/download
// @access  Private
exports.downloadCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      certificateId: req.params.certificateId 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    if (certificate.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (!certificate.certificateUrl) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    const pdfBuffer = Buffer.from(certificate.certificateUrl.split(',')[1], 'base64');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to download certificate' });
  }
};

// @desc    Verify certificate
// @route   GET /api/certificates/verify/:certificateId
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      certificateId: req.params.certificateId 
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    res.json({
      valid: true,
      certificate: {
        studentName: certificate.studentName,
        skillName: certificate.skillName,
        percentage: certificate.percentage,
        issueDate: certificate.issueDate,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Verification failed' });
  }
};
// backend/controllers/examController.js - Update cancelExam function

// @desc    Cancel exam
// @route   POST /api/exams/:examId/cancel
// @access  Private (Teacher only)
exports.cancelExam = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }
    
    const exam = await Exam.findById(req.params.examId)
      .populate('teacherId', 'name email');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if user is the teacher who created the exam
    if (exam.teacherId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the exam creator can cancel this exam' });
    }
    
    // Check if exam is already cancelled
    if (exam.status === 'cancelled') {
      return res.status(400).json({ message: 'Exam is already cancelled' });
    }
    
    // Update exam status
    exam.status = 'cancelled';
    exam.cancellationReason = reason;
    exam.cancelledAt = new Date();
    exam.cancelledBy = req.user.id;
    exam.isActive = false;
    await exam.save();
    
    // Find all students who have sessions with this teacher (eligible for exam)
    const sessions = await Session.find({
      teacherId: req.user.id,
      status: { $in: ['completed', 'scheduled'] }
    }).populate('learnerId', 'name email');
    
    // Get unique students
    const studentMap = new Map();
    for (const session of sessions) {
      if (session.learnerId && !studentMap.has(session.learnerId._id.toString())) {
        studentMap.set(session.learnerId._id.toString(), session.learnerId);
      }
    }
    const students = Array.from(studentMap.values());
    
    // Send notifications to all eligible students
    const { getIO } = require('../socket');
    const Notification = require('../models/Notification');
    
    for (const student of students) {
      // Create notification in database
      const notification = await Notification.create({
        userId: student._id,
        type: 'exam_cancelled',
        title: `Exam Cancelled: ${exam.title}`,
        message: `The exam "${exam.title}" for ${exam.skillName} has been cancelled. Reason: ${reason}`,
        data: {
          examId: exam._id,
          examTitle: exam.title,
          skillName: exam.skillName,
          reason: reason
        }
      });
      
      // Send real-time notification via socket
      try {
        const io = getIO();
        if (io) {
          io.to(`user:${student._id}`).emit('new-notification', notification);
        }
      } catch (socketError) {
        console.log('Socket not available for real-time notification');
      }
    }
    
    console.log(`✅ Exam ${exam._id} cancelled. Notifications sent to ${students.length} students`);
    
    res.json({
      success: true,
      message: 'Exam cancelled successfully',
      exam: {
        _id: exam._id,
        title: exam.title,
        status: exam.status,
        cancellationReason: exam.cancellationReason,
        cancelledAt: exam.cancelledAt
      }
    });
  } catch (error) {
    console.error('Error cancelling exam:', error);
    res.status(500).json({ message: 'Failed to cancel exam', error: error.message });
  }
};
// backend/controllers/examController.js - Add deleteExam function

// @desc    Delete exam permanently (only cancelled or expired exams)
// @route   DELETE /api/exams/:examId
// @access  Private (Teacher only)
// backend/controllers/examController.js - Update deleteExam function

// @desc    Delete exam permanently (only cancelled or expired exams)
// @route   DELETE /api/exams/:examId
// @access  Private (Teacher only)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if user is the teacher who created the exam
    if (exam.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the exam creator can delete this exam' });
    }
    
    // Only allow deletion of cancelled or expired exams
    if (exam.status !== 'cancelled' && exam.status !== 'expired') {
      return res.status(400).json({ 
        message: 'Only cancelled or expired exams can be deleted. Please cancel the exam first.' 
      });
    }
    
    // Delete all associated attempts
    const deletedAttempts = await ExamAttempt.deleteMany({ examId: exam._id });
    console.log(`🗑️ Deleted ${deletedAttempts.deletedCount} attempts for exam ${exam._id}`);
    
    // Delete the exam
    await Exam.findByIdAndDelete(req.params.examId);
    
    console.log(`🗑️ Exam ${exam._id} deleted permanently by teacher ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: 'Failed to delete exam', error: error.message });
  }
};