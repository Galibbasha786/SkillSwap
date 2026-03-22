// backend/routes/certificateRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Certificate = require('../models/Certificate');

// @desc    Get certificate by MongoDB _id
// @route   GET /api/certificates/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 Fetching certificate with ID:', req.params.id);
    
    const certificate = await Certificate.findById(req.params.id)
      .populate('examId', 'title skillName');
    
    if (!certificate) {
      console.log('❌ Certificate not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    // Check if user owns this certificate
    if (certificate.studentId.toString() !== req.user.id) {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    console.log('✅ Certificate found:', certificate._id);
    res.json(certificate);
  } catch (error) {
    console.error('❌ Error fetching certificate:', error);
    res.status(500).json({ message: 'Failed to fetch certificate' });
  }
});

// @desc    Download certificate PDF
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
    
    // Decode base64 PDF
    const pdfBuffer = Buffer.from(certificate.certificateUrl.split(',')[1], 'base64');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error downloading certificate:', error);
    res.status(500).json({ message: 'Failed to download certificate' });
  }
});

// @desc    Verify certificate by certificateId (public)
// @route   GET /api/certificates/verify/:certificateId
// @access  Public
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
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    console.error('❌ Error verifying certificate:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

module.exports = router;