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
const { getIO, forceEndStudentProctoring } = require('../socket');
const fs = require('fs');
const { executeCode } = require('../services/codeExecutionService');

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const TEACHER_REMOVAL_LOG = 'Removed from exam by teacher';
const MAX_TEACHER_REMOVALS = 3;

const countTeacherRemovals = async (examId, studentId) =>
  ExamAttempt.countDocuments({
    examId,
    studentId,
    proctoringLogs: { $elemMatch: { details: TEACHER_REMOVAL_LOG } }
  });

const finalizeAttemptScore = (attempt, exam) => {
  const totalMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const percentage = totalMarks > 0 ? (attempt.obtainedMarks / totalMarks) * 100 : 0;
  const passed = percentage >= exam.passingScore;
  attempt.totalMarks = totalMarks;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.status = passed ? 'passed' : 'failed';
  attempt.endTime = new Date();
  return { percentage, passed, totalMarks };
};

const getTeacherId = (exam) => {
  const teacher = exam.teacherId;
  return (teacher?._id || teacher)?.toString();
};

const isEmailInAllowedList = (exam, email) => {
  const normalized = normalizeEmail(email);
  return (exam.accessControl?.allowedEmails || []).some(
    (allowedEmail) => normalizeEmail(allowedEmail) === normalized
  );
};

const hasSessionWithTeacher = async (teacherId, studentId) => {
  const session = await Session.findOne({
    teacherId,
    learnerId: studentId,
    status: { $in: ['completed', 'scheduled'] }
  });
  return !!session;
};

const canStudentAccessExam = async (exam, user) => {
  const accessType = exam.accessControl?.type || 'all';

  if (accessType === 'specific') {
    return isEmailInAllowedList(exam, user.email);
  }

  const teacherId = getTeacherId(exam);
  return hasSessionWithTeacher(teacherId, user.id || user._id);
};

const verifyExamAccessRules = async (exam, user, { passcode } = {}) => {
  const accessType = exam.accessControl?.type || 'all';

  if (accessType === 'specific') {
    if (!isEmailInAllowedList(exam, user.email)) {
      return { allowed: false, message: 'You are not authorized to take this exam' };
    }
    return { allowed: true };
  }

  const teacherId = getTeacherId(exam);
  const hasSession = await hasSessionWithTeacher(teacherId, user.id || user._id);
  if (!hasSession) {
    return { allowed: false, message: 'You can only take exams from teachers you have sessions with' };
  }

  if (accessType === 'passcode') {
    if (!passcode || exam.accessControl.passcode !== passcode) {
      return { allowed: false, message: 'Invalid passcode' };
    }
  }

  return { allowed: true };
};

const Notification = require('../models/Notification');

const getEligibleStudentUsers = async (exam) => {
  const studentMap = new Map();
  const accessType = exam.accessControl?.type || 'all';
  const teacherId = getTeacherId(exam);

  if (accessType === 'specific') {
    for (const email of exam.accessControl?.allowedEmails || []) {
      const student = await User.findOne({ email: normalizeEmail(email) }).select('_id name email');
      if (student) studentMap.set(student._id.toString(), student);
    }
    return Array.from(studentMap.values());
  }

  const sessions = await Session.find({
    teacherId,
    status: { $in: ['completed', 'scheduled'] }
  }).populate('learnerId', 'name email');

  sessions.forEach((session) => {
    if (session.learnerId) {
      studentMap.set(session.learnerId._id.toString(), session.learnerId);
    }
  });

  return Array.from(studentMap.values());
};

const notifyEligibleStudents = async (exam, { type, title, message, data = {} }) => {
  const students = await getEligibleStudentUsers(exam);
  for (const student of students) {
    const notification = await Notification.create({
      userId: student._id,
      type,
      title,
      message,
      data: { examId: exam._id, examTitle: exam.title, skillName: exam.skillName, ...data }
    });
    try {
      const io = getIO();
      io?.to(`user:${student._id}`).emit('new-notification', notification);
    } catch {
      // ignore socket errors
    }
  }
  return students.length;
};

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

    if (examData.accessControl?.allowedEmails) {
      examData.accessControl.allowedEmails = examData.accessControl.allowedEmails.map(normalizeEmail);
    }
    
    const exam = await Exam.create(examData);
    console.log('✅ Exam created successfully:', exam._id);

    const fromLabel = fromDate.toLocaleString();
    const toLabel = toDate.toLocaleString();
    await notifyEligibleStudents(exam, {
      type: 'exam_created',
      title: `New Exam: ${exam.title}`,
      message: `Your teacher scheduled "${exam.title}" for ${exam.skillName}. Exam window: ${fromLabel} to ${toLabel}.`,
      data: { availableFrom: exam.availableFrom, availableTo: exam.availableTo }
    });
    
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

// @desc    Get live in-progress attempts for teacher monitoring
// @route   GET /api/exams/:examId/live-attempts
// @access  Private (Exam owner only)
exports.getLiveAttempts = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this exam' });
    }

    const attempts = await ExamAttempt.find({
      examId: req.params.examId,
      status: 'in_progress'
    })
      .populate('studentId', 'name email profileImage')
      .select('studentId startTime violations proctoringLogs status');

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        skillName: exam.skillName,
        duration: exam.duration,
        proctoring: exam.proctoring,
        availableFrom: exam.availableFrom,
        availableTo: exam.availableTo
      },
      attempts
    });
  } catch (error) {
    console.error('Error fetching live attempts:', error);
    res.status(500).json({ message: 'Failed to fetch live attempts' });
  }
};

// @desc    Get exam results for teacher (all finished attempts)
// @route   GET /api/exams/:examId/results
// @access  Private (Exam owner only)
exports.getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view results' });
    }

    const attempts = await ExamAttempt.find({
      examId: req.params.examId,
      status: { $in: ['passed', 'failed', 'terminated', 'completed'] }
    })
      .populate('studentId', 'name email profileImage')
      .sort({ endTime: -1, updatedAt: -1 });

    const enriched = attempts.map((attempt) => {
      const logs = attempt.proctoringLogs || [];
      const tabSwitches = logs.filter((l) => l.type === 'tab_switch').length;
      const faceMissing = logs.filter((l) => l.type === 'face_missing').length;
      const multipleFaces = logs.filter((l) => l.type === 'multiple_faces').length;
      const fullscreenExit = logs.filter((l) => l.type === 'fullscreen_exit').length;
      const copyPaste = logs.filter((l) =>
        ['copy_attempt', 'paste_attempt', 'copy_shortcut', 'paste_shortcut'].includes(l.type)
      ).length;

      return {
        _id: attempt._id,
        studentId: attempt.studentId?._id || attempt.studentId,
        studentName: attempt.studentId?.name || 'Unknown',
        studentEmail: attempt.studentId?.email || '',
        profileImage: attempt.studentId?.profileImage,
        status: attempt.status,
        passed: attempt.passed,
        percentage: attempt.percentage,
        obtainedMarks: attempt.obtainedMarks,
        totalMarks: attempt.totalMarks,
        violations: attempt.violations || 0,
        tabSwitches,
        faceMissing,
        multipleFaces,
        fullscreenExit,
        copyPaste,
        proctoringLogs: logs,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        certificateId: attempt.certificateId
      };
    });

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        skillName: exam.skillName,
        passingScore: exam.passingScore,
        duration: exam.duration,
        availableTo: exam.availableTo,
        resultsPublished: exam.resultsPublished,
        resultsPublishedAt: exam.resultsPublishedAt
      },
      attempts: enriched,
      summary: {
        total: enriched.length,
        passed: enriched.filter((a) => a.passed).length,
        failed: enriched.filter((a) => !a.passed && a.status !== 'terminated').length,
        terminated: enriched.filter((a) => a.status === 'terminated').length
      }
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ message: 'Failed to fetch exam results' });
  }
};

// @desc    Publish exam results — notify each student with their own marks
// @route   POST /api/exams/:examId/publish-results
// @access  Private (Exam owner only)
exports.publishExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to publish results' });
    }

    const attempts = await ExamAttempt.find({
      examId: req.params.examId,
      status: { $in: ['passed', 'failed', 'terminated', 'completed'] }
    }).populate('studentId', 'name email');

    if (attempts.length === 0) {
      return res.status(400).json({ message: 'No completed attempts to publish' });
    }

    exam.resultsPublished = true;
    exam.resultsPublishedAt = new Date();
    await exam.save();

    const Notification = require('../models/Notification');
    const { getIO } = require('../socket');
    let io;
    try {
      io = getIO();
    } catch {
      io = null;
    }

    const notifications = [];

    for (const attempt of attempts) {
      const student = attempt.studentId;
      if (!student?._id) continue;

      const scoreText = attempt.status === 'terminated'
        ? 'Exam terminated due to proctoring violations'
        : `Score: ${(attempt.percentage || 0).toFixed(1)}% — ${attempt.passed ? 'Passed' : 'Failed'}`;

      const notification = await Notification.create({
        userId: student._id,
        type: 'exam_results_published',
        title: `Results published: ${exam.title}`,
        message: `${scoreText}. Violations: ${attempt.violations || 0}.`,
        data: {
          examId: exam._id,
          examTitle: exam.title,
          skillName: exam.skillName,
          attemptId: attempt._id,
          percentage: attempt.percentage,
          passed: attempt.passed,
          violations: attempt.violations,
          status: attempt.status,
          obtainedMarks: attempt.obtainedMarks,
          totalMarks: attempt.totalMarks
        }
      });

      notifications.push(notification);

      if (io) {
        io.to(`user:${student._id}`).emit('new-notification', notification);
      }
    }

    res.json({
      success: true,
      message: `Results published to ${notifications.length} student(s)`,
      resultsPublished: true,
      notifiedCount: notifications.length
    });
  } catch (error) {
    console.error('Error publishing exam results:', error);
    res.status(500).json({ message: 'Failed to publish results' });
  }
};

// @desc    Get available exams for student
// @route   GET /api/exams/available
// @access  Private
// backend/controllers/examController.js - Update getAvailableExams

exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    const user = await User.findById(req.user.id).select('email');
    const userEmail = normalizeEmail(user?.email);
    
    // Get all sessions where this student is the learner
    const sessions = await Session.find({ 
      learnerId: req.user.id,
      status: { $in: ['completed', 'scheduled'] }
    }).select('teacherId');
    
    // Get unique teacher IDs
    const teacherIds = [...new Set(sessions.map(s => s.teacherId.toString()))];
    
    const baseQuery = {
      status: 'active',
      isActive: true,
      availableFrom: { $lte: now },
      availableTo: { $gte: now }
    };

    // Exams from teachers the student has sessions with
    const sessionExams = teacherIds.length > 0
      ? await Exam.find({
          ...baseQuery,
          teacherId: { $in: teacherIds }
        }).populate('teacherId', 'name profileImage')
      : [];

    // Exams where this student's email is explicitly allowed
    const specificExams = userEmail
      ? await Exam.find({
          ...baseQuery,
          'accessControl.type': 'specific',
          'accessControl.allowedEmails': userEmail
        }).populate('teacherId', 'name profileImage')
      : [];

    const examMap = new Map();
    [...sessionExams, ...specificExams].forEach((exam) => {
      examMap.set(exam._id.toString(), exam);
    });
    const exams = [...examMap.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
      examId: { $in: examIds },
      studentId: req.user.id
    }).sort('-createdAt');

    const attemptByExam = new Map();
    attempts.forEach((attempt) => {
      const key = attempt.examId.toString();
      if (!attemptByExam.has(key)) attemptByExam.set(key, attempt);
    });

    const enriched = exams.map((exam) => {
      const attempt = attemptByExam.get(exam._id.toString());
      const examAttempts = attempts.filter((a) => a.examId.toString() === exam._id.toString());
      const totalAttempts = examAttempts.length;
      const teacherRemovals = examAttempts.filter((a) =>
        (a.proctoringLogs || []).some((log) => log.details === TEACHER_REMOVAL_LOG)
      ).length;
      const lockedByRemovals = teacherRemovals >= MAX_TEACHER_REMOVALS;
      return {
        ...exam.toObject(),
        studentAttempt: attempt
          ? {
              status: attempt.status,
              passed: attempt.passed,
              percentage: attempt.percentage,
              canRetake: !lockedByRemovals &&
                !attempt.passed &&
                attempt.status !== 'in_progress' &&
                totalAttempts < (exam.proctoring?.allowedAttempts || 3)
            }
          : { status: null, canRetake: !lockedByRemovals }
      };
    });
    
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
    
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching available exams:', error);
    res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

// @desc    Reschedule exam (update window + notify students)
// @route   POST /api/exams/:examId/reschedule
exports.rescheduleExam = async (req, res) => {
  try {
    const { reason, availableFrom, availableTo } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ message: 'Reschedule reason is required' });
    }
    if (!availableFrom || !availableTo) {
      return res.status(400).json({ message: 'New exam dates are required' });
    }

    const fromDate = new Date(availableFrom);
    const toDate = new Date(availableTo);

    if (fromDate >= toDate) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    exam.availableFrom = fromDate;
    exam.availableTo = toDate;
    exam.status = 'active';
    exam.isActive = true;
    exam.cancellationReason = reason.trim();
    await exam.save();

    const fromLabel = fromDate.toLocaleString();
    const toLabel = toDate.toLocaleString();
    const count = await notifyEligibleStudents(exam, {
      type: 'exam_rescheduled',
      title: `Exam Rescheduled: ${exam.title}`,
      message: `"${exam.title}" has been rescheduled. New window: ${fromLabel} to ${toLabel}. Reason: ${reason.trim()}`,
      data: { availableFrom: fromDate, availableTo: toDate, reason: reason.trim() }
    });

    res.json({
      success: true,
      message: `Exam rescheduled. ${count} student(s) notified.`,
      exam
    });
  } catch (error) {
    console.error('Error rescheduling exam:', error);
    res.status(500).json({ message: 'Failed to reschedule exam' });
  }
};

// @desc    Remove student from live exam (0 marks)
// @route   POST /api/exams/:examId/remove-student/:studentId
exports.removeStudentFromExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const studentId = String(req.params.studentId);
    const priorRemovals = await countTeacherRemovals(exam._id, studentId);
    const removalNumber = priorRemovals + 1;
    const isFinalRemoval = removalNumber >= MAX_TEACHER_REMOVALS;

    const attempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId,
      status: 'in_progress'
    });

    let finalScore = null;

    if (attempt) {
      attempt.proctoringLogs.push({
        type: 'devtools_attempt',
        details: TEACHER_REMOVAL_LOG,
        timestamp: new Date()
      });

      if (isFinalRemoval) {
        const { percentage, passed } = finalizeAttemptScore(attempt, exam);
        finalScore = { percentage, passed, obtainedMarks: attempt.obtainedMarks };
      } else {
        attempt.obtainedMarks = 0;
        attempt.percentage = 0;
        attempt.passed = false;
        attempt.status = 'terminated';
        attempt.endTime = new Date();
      }

      await attempt.save();
    }

    const forceMessage = isFinalRemoval
      ? (finalScore
        ? `You were removed ${MAX_TEACHER_REMOVALS} times. Your final score is ${finalScore.percentage.toFixed(1)}%.`
        : `You were removed ${MAX_TEACHER_REMOVALS} times. Your exam access is now locked.`)
      : `You were removed from the exam by your teacher (${removalNumber}/${MAX_TEACHER_REMOVALS}).`;

    forceEndStudentProctoring(exam._id, studentId, forceMessage);

    res.json({
      success: true,
      removalNumber,
      isFinalRemoval,
      finalScore,
      message: isFinalRemoval
        ? `Student removed ${MAX_TEACHER_REMOVALS} times — last score recorded as final`
        : `Student removed (${removalNumber}/${MAX_TEACHER_REMOVALS})`
    });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ message: 'Failed to remove student' });
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

    const user = await User.findById(req.user.id).select('email name');
    const accessCheck = await verifyExamAccessRules(exam, user, req.body);
    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
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

    const teacherRemovals = await countTeacherRemovals(exam._id, req.user.id);
    if (teacherRemovals >= MAX_TEACHER_REMOVALS) {
      const lastAttempt = await ExamAttempt.findOne({
        examId: exam._id,
        studentId: req.user.id
      }).sort('-updatedAt');
      return res.status(403).json({
        message: `You were removed ${MAX_TEACHER_REMOVALS} times. Your last score of ${(lastAttempt?.percentage || 0).toFixed(1)}% is final.`,
        locked: true,
        percentage: lastAttempt?.percentage || 0
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
// backend/controllers/examController.js

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
    
    // Calculate total marks from all questions
    const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
    
    // Calculate percentage based on obtained marks
    const percentage = totalMarks > 0 ? (attempt.obtainedMarks / totalMarks) * 100 : 0;
    const passed = percentage >= exam.passingScore;

    console.log(`Exam finished - Total Marks: ${totalMarks}, Obtained: ${attempt.obtainedMarks}, Percentage: ${percentage}%, Passed: ${passed}`);

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
        attempt.certificateId = certificate._id;
        await attempt.save();
        console.log('✅ Certificate created:', certificate._id);
      } catch (certError) {
        console.error('❌ Certificate generation failed:', certError);
      }
    }

    console.log(`✅ Exam finished: ${passed ? 'PASSED' : 'FAILED'} - ${percentage.toFixed(2)}%`);

    try {
      const { getIO } = require('../socket');
      const io = getIO();
      io.to(`exam-monitor:${req.params.examId}`).emit('student-proctoring-ended', {
        examId: String(req.params.examId),
        studentId: String(req.user.id)
      });
    } catch (socketError) {
      console.warn('Could not emit proctoring end on finish:', socketError.message);
    }
    
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
      'tab_switch', 'face_missing', 'multiple_faces', 'screenshot', 'screenshot_attempt',
      'window_resize', 'mouse_leave', 'right_click', 'copy_attempt', 'paste_attempt',
      'copy_shortcut', 'paste_shortcut', 'print_attempt', 'fullscreen_exit',
      'camera_denied', 'screen_denied', 'devtools_attempt'
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

      try {
        const io = getIO();
        const user = await User.findById(req.user.id).select('name email');
        io.to(`exam-monitor:${req.params.examId}`).emit('exam-violation', {
          examId: req.params.examId,
          studentId: req.user.id,
          studentName: user?.name || 'Student',
          type,
          details: details || '',
          violations: attempt.violations,
          terminated: true,
          timestamp: new Date()
        });
        io.to(`exam-monitor:${req.params.examId}`).emit('student-proctoring-ended', {
          examId: req.params.examId,
          studentId: String(req.user.id)
        });
      } catch (socketError) {
        console.warn('Could not emit termination to monitor room:', socketError.message);
      }

      return res.json({ 
        terminated: true, 
        message: 'Exam terminated due to multiple violations',
        violations: attempt.violations
      });
    }

    await attempt.save();
    console.log(`⚠️ Violation recorded: ${type} (${attempt.violations}/5)`);

    // Notify teacher monitoring this exam in real time
    try {
      const exam = await Exam.findById(req.params.examId).select('teacherId title');
      if (exam) {
        const io = getIO();
        const user = await User.findById(req.user.id).select('name email');
        io.to(`exam-monitor:${req.params.examId}`).emit('exam-violation', {
          examId: req.params.examId,
          studentId: req.user.id,
          studentName: user?.name || 'Student',
          type,
          details: details || '',
          violations: attempt.violations,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Could not emit violation to monitor room:', socketError.message);
    }
    
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
    const qrCode = await QRCode.toDataURL(verificationUrl);
    
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
    const qrImage = await QRCode.toBuffer(verificationUrl);
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

    const count = await notifyEligibleStudents(exam, {
      type: 'exam_cancelled',
      title: `Exam Cancelled: ${exam.title}`,
      message: `The exam "${exam.title}" for ${exam.skillName} has been cancelled. Reason: ${reason}`,
      data: { reason }
    });

    console.log(`✅ Exam ${exam._id} cancelled. Notifications sent to ${count} students`);
    
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
// backend/controllers/examController.js
// Add this function

// @desc    Get exam by ID
// @route   GET /api/exams/:examId
// @access  Private
exports.getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId)
      .populate('createdBy', 'name email')
      .select('-questions.correctAnswer'); // Don't send correct answers
    
    if (!exam) {
      return res.status(404).json({ 
        success: false, 
        message: 'Exam not found' 
      });
    }
    
    // Check if user is allowed to view this exam
    // Students can only view available exams
    const user = await User.findById(req.user.id);
    const isTeacher = user.role === 'admin' || exam.createdBy.toString() === req.user.id;
    
    if (!isTeacher && exam.status !== 'published') {
      return res.status(403).json({ 
        success: false, 
        message: 'Exam not available' 
      });
    }
    
    res.json({
      success: true,
      exam
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam' 
    });
  }
};
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
// backend/controllers/examController.js

// @desc    Verify exam access
// @route   POST /api/exams/:examId/verify-access
// @access  Private
exports.verifyExamAccess = async (req, res) => {
  try {
    const { examId } = req.params;
    const { passcode } = req.body;
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Check if exam is active
    const now = new Date();
    if (now < exam.availableFrom || now > exam.availableTo) {
      return res.status(403).json({ 
        allowed: false, 
        message: 'Exam is not available at this time' 
      });
    }

    const user = await User.findById(req.user.id).select('email');
    const accessCheck = await verifyExamAccessRules(exam, user, { passcode });

    if (!accessCheck.allowed) {
      return res.status(403).json({
        allowed: false,
        message: accessCheck.message
      });
    }
    
    res.json({ allowed: true });
  } catch (error) {
    console.error('Error verifying exam access:', error);
    res.status(500).json({ message: 'Failed to verify access' });
  }
};

// @desc    Update exam (before start time only)
// @route   PUT /api/exams/:examId
// @access  Private (Exam owner only)
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (String(exam.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to edit this exam' });
    }

    if (exam.status === 'cancelled' || exam.status === 'expired') {
      return res.status(400).json({ message: 'Cannot edit a cancelled or expired exam' });
    }

    const now = new Date();
    if (now >= exam.availableFrom) {
      return res.status(400).json({
        message: 'Cannot edit exam after it has started. Editing is only allowed before the available from time.'
      });
    }

    const { availableFrom, availableTo, ...otherData } = req.body;

    if (availableFrom && availableTo) {
      const fromDate = new Date(availableFrom);
      const toDate = new Date(availableTo);

      if (fromDate >= toDate) {
        return res.status(400).json({
          message: 'Available To date must be after Available From date'
        });
      }

      if (toDate <= now) {
        return res.status(400).json({
          message: 'Available To date must be in the future'
        });
      }

      exam.availableFrom = fromDate;
      exam.availableTo = toDate;
    }

    const allowedFields = [
      'skillName', 'title', 'description', 'duration', 'passingScore',
      'questions', 'accessControl', 'proctoring'
    ];

    allowedFields.forEach((field) => {
      if (otherData[field] !== undefined) {
        exam[field] = otherData[field];
      }
    });

    if (exam.accessControl?.allowedEmails) {
      exam.accessControl.allowedEmails = exam.accessControl.allowedEmails.map(normalizeEmail);
    }

    await exam.save();
    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ message: 'Failed to update exam', error: error.message });
  }
};
// Add this function

// @desc    Get exam by ID
// @route   GET /api/exams/:examId
// @access  Private
exports.getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId)
      .populate('teacherId', 'name email profileImage');
    
    if (!exam) {
      return res.status(404).json({ 
        success: false, 
        message: 'Exam not found' 
      });
    }
    
    // Check if user has access to view this exam
    const user = await User.findById(req.user.id);
    const isTeacher = getTeacherId(exam) === req.user.id;
    const isAdmin = user.role === 'admin';
    
    let hasAccess = isTeacher || isAdmin;
    if (!hasAccess) {
      hasAccess = await canStudentAccessExam(exam, user);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this exam' 
      });
    }
    
    // For students, remove correct answers
    if (!isTeacher && !isAdmin) {
      const examObj = exam.toObject();
      examObj.questions = examObj.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
      return res.json({ success: true, exam: examObj });
    }
    
    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam' 
    });
  }
};
exports.runCode = async (req, res) => {
  try {
    const { examId } = req.params;
    const { code, language, questionId, testCases } = req.body;
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const question = exam.questions.id(questionId);
    if (!question || question.type !== 'coding') {
      return res.status(400).json({ message: 'Invalid coding question' });
    }
    
    // Run code with provided test cases
    const results = await executeCode(
      code,
      language,
      testCases || question.coding.testCases,
      question.coding.functionName
    );
    
    const output = results.map(r => 
      `Input: ${r.input}\nExpected: ${r.expectedOutput}\nOutput: ${r.actualOutput}\n${r.passed ? '✓ Passed' : '✗ Failed'}`
    ).join('\n\n');
    
    res.json({
      success: true,
      output,
      testResults: results,
      results
    });
  } catch (error) {
    console.error('Error running code:', error);
    res.status(500).json({ message: 'Failed to run code', error: error.message });
  }
};

// @desc    Submit coding solution
// @route   POST /api/exams/:examId/submit-coding
// @access  Private
// backend/controllers/examController.js

// @desc    Submit coding solution
// @route   POST /api/exams/:examId/submit-coding
// @access  Private
exports.submitCoding = async (req, res) => {
  try {
    const { examId } = req.params;
    const { code, language, questionId } = req.body;
    
    console.log('📝 Submitting coding solution for question:', questionId);
    console.log('Code length:', code?.length);
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const question = exam.questions.id(questionId);
    if (!question || question.type !== 'coding') {
      return res.status(400).json({ message: 'Invalid coding question' });
    }
    
    // Find the attempt
    const attempt = await ExamAttempt.findOne({
      examId,
      studentId: req.user.id,
      status: 'in_progress'
    });
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    console.log('Found attempt:', attempt._id);
    console.log('Current obtained marks before:', attempt.obtainedMarks);
    
    // Run code with all test cases
    const testResults = await executeCode(
      code,
      language,
      question.coding.testCases,
      question.coding.functionName
    );
    
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const score = (passedTests / totalTests) * question.marks;
    const allPassed = passedTests === totalTests;
    
    console.log(`Test results: ${passedTests}/${totalTests} passed, Score: ${score}`);
    
    // Check if question already answered
    const existingAnswerIndex = attempt.answers.findIndex(a => a.questionId === questionId);
    
    const answerData = {
      questionId,
      answer: code,
      isCorrect: allPassed,
      marksObtained: score,
      codingResults: {
        testResults,
        passedTests,
        totalTests,
        language,
        code: code.substring(0, 500) // Store first 500 chars
      }
    };
    
    if (existingAnswerIndex !== -1) {
      // Update existing answer
      const oldMarks = attempt.answers[existingAnswerIndex].marksObtained;
      attempt.obtainedMarks -= oldMarks;
      attempt.answers[existingAnswerIndex] = answerData;
      console.log(`Updated existing answer, old marks: ${oldMarks}`);
    } else {
      // Add new answer
      attempt.answers.push(answerData);
      console.log('Added new answer');
    }
    
    attempt.obtainedMarks += score;
    console.log(`New obtained marks: ${attempt.obtainedMarks}`);
    
    await attempt.save();
    
    // Also update the answers state in the frontend by saving to the attempt in session
    // The frontend will get this via the response
    
    res.json({
      success: true,
      passed: allPassed,
      score,
      passedTests,
      totalTests,
      testResults,
      obtainedMarks: attempt.obtainedMarks
    });
  } catch (error) {
    console.error('Error submitting coding solution:', error);
    res.status(500).json({ message: 'Failed to submit solution', error: error.message });
  }
};

// @desc    Get exam for practice mode (no proctoring, no attempt)
// @route   GET /api/exams/:examId/practice
exports.getPracticeExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate('teacherId', 'name profileImage');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const user = await User.findById(req.user.id);
    const isTeacher = getTeacherId(exam) === req.user.id;
    const hasAccess = isTeacher || user.role === 'admin' || (await canStudentAccessExam(exam, user));

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this exam' });
    }

    const examObj = exam.toObject();
    examObj.questions = examObj.questions.map((q) => {
      const base = {
        _id: q._id,
        type: q.type,
        question: q.question,
        marks: q.marks
      };
      if (q.type === 'mcq') {
        base.options = q.options;
      }
      if (q.type === 'coding' && q.coding) {
        base.coding = {
          programmingLanguage: q.coding.programmingLanguage,
          initialCode: q.coding.initialCode,
          functionName: q.coding.functionName,
          testCases: (q.coding.testCases || []).filter((t) => !t.isHidden),
          timeLimit: q.coding.timeLimit,
          memoryLimit: q.coding.memoryLimit
        };
      }
      return base;
    });

    res.json({ success: true, exam: examObj, practiceMode: true });
  } catch (error) {
    console.error('Error loading practice exam:', error);
    res.status(500).json({ message: 'Failed to load practice exam' });
  }
};

// @desc    Grade practice attempt (does not create ExamAttempt)
// @route   POST /api/exams/:examId/practice/submit
exports.submitPractice = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const user = await User.findById(req.user.id);
    const hasAccess = getTeacherId(exam) === req.user.id || user.role === 'admin' || (await canStudentAccessExam(exam, user));
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this exam' });
    }

    const submitted = req.body.answers || [];
    let obtainedMarks = 0;
    const totalMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const breakdown = [];

    for (const q of exam.questions) {
      const entry = submitted.find((a) => String(a.questionId) === String(q._id));
      const userAnswer = entry?.answer || '';
      let isCorrect = false;
      let marksObtained = 0;
      let correctAnswer = null;
      let feedback = '';

      if (q.type === 'mcq') {
        isCorrect = userAnswer === q.correctAnswer;
        correctAnswer = q.correctAnswer;
        marksObtained = isCorrect ? q.marks : 0;
      } else if (q.type === 'theory' || q.type === 'viva') {
        const keywords = q.keywords || [];
        if (keywords.length) {
          const answerLower = String(userAnswer).toLowerCase();
          const matched = keywords.filter((k) => answerLower.includes(k.toLowerCase()));
          isCorrect = matched.length >= Math.ceil(keywords.length * 0.6);
          correctAnswer = keywords.join(', ');
          feedback = isCorrect
            ? 'Good keyword coverage'
            : `Try mentioning: ${keywords.join(', ')}`;
        } else {
          isCorrect = String(userAnswer).trim().length >= 20;
          feedback = isCorrect ? 'Detailed answer' : 'Try a longer, more detailed answer';
        }
        marksObtained = isCorrect ? q.marks : 0;
      } else if (q.type === 'coding' && q.coding?.testCases?.length && userAnswer) {
        const testResults = await executeCode(
          userAnswer,
          q.coding.programmingLanguage,
          q.coding.testCases,
          q.coding.functionName
        );
        const passed = testResults.filter((r) => r.passed).length;
        const total = testResults.length;
        isCorrect = passed === total && total > 0;
        marksObtained = total ? (passed / total) * q.marks : 0;
        feedback = `${passed}/${total} test cases passed`;
      }

      obtainedMarks += marksObtained;
      breakdown.push({
        questionId: q._id,
        question: q.question,
        type: q.type,
        userAnswer: String(userAnswer).slice(0, 500),
        correctAnswer,
        isCorrect,
        marksObtained,
        feedback
      });
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    res.json({
      success: true,
      obtainedMarks,
      totalMarks,
      percentage,
      passingScore: exam.passingScore,
      passed: percentage >= exam.passingScore,
      breakdown
    });
  } catch (error) {
    console.error('Error grading practice:', error);
    res.status(500).json({ message: 'Failed to grade practice' });
  }
};