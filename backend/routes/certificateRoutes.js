// backend/routes/certificateRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Certificate = require('../models/Certificate');

// @desc    Verify certificate by certificateId (public) — MUST be before /:id
// @route   GET /api/certificates/verify/:certificateId
router.get('/verify/:certificateId', async (req, res) => {
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
        certificateId: certificate.certificateId,
        qrCode: certificate.qrCode
      }
    });
  } catch (error) {
    console.error('❌ Error verifying certificate:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// @desc    Download certificate PDF by public certificateId (no auth)
// @route   GET /api/certificates/verify/:certificateId/download
router.get('/verify/:certificateId/download', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId
    });

    if (!certificate || !certificate.certificateUrl) {
      return res.status(404).json({ message: 'Certificate PDF not found' });
    }

    const pdfBuffer = Buffer.from(certificate.certificateUrl.split(',')[1], 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=certificate-${certificate.certificateId}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error downloading certificate:', error);
    res.status(500).json({ message: 'Failed to download certificate' });
  }
});

// @desc    Get certificate by MongoDB _id
// @route   GET /api/certificates/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.params.id === 'verify') {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const certificate = await Certificate.findById(req.params.id)
      .populate('examId', 'title skillName');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (certificate.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('❌ Error fetching certificate:', error);
    res.status(500).json({ message: 'Failed to fetch certificate' });
  }
});

// @desc    Download certificate PDF by MongoDB _id
// @route   GET /api/certificates/:id/download
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

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
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=certificate-${certificate.certificateId}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error downloading certificate:', error);
    res.status(500).json({ message: 'Failed to download certificate' });
  }
});

module.exports = router;
