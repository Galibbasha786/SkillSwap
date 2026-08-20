// frontend-web/src/components/exam/VerifyCertificate.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiDownload, FiShare2, FiAward } from 'react-icons/fi';
import { certificateAPI } from '../../services/api';
import toast from 'react-hot-toast';

const VerifyCertificate = () => {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyCertificate();
  }, [certificateId]);

  const verifyCertificate = async () => {
    try {
      const response = await certificateAPI.verifyCertificate(certificateId);
      setCertificate(response.data.certificate);
      setLoading(false);
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.response?.data?.message || 'Certificate not found or invalid');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await certificateAPI.downloadPublicCertificate(certificateId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Certificate downloaded!');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center"
        >
          <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Certificate</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Return to Home
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Verification Badge */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full"
          >
            <FiCheckCircle className="w-5 h-5" />
            <span className="font-medium">Verified Certificate</span>
          </motion.div>
        </div>

        {/* Certificate Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Certificate Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-8 text-white text-center">
            <FiAward className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Certificate of Achievement</h1>
            <p className="text-blue-100 mt-2">SkillSwap Platform</p>
          </div>

          {/* Certificate Content */}
          <div className="p-12 text-center border-8 border-double border-blue-100 m-8">
            <p className="text-lg text-gray-600 mb-4">This is to certify that</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{certificate?.studentName}</h2>
            <p className="text-lg text-gray-600 mb-6">has successfully completed the</p>
            <h3 className="text-2xl font-semibold text-blue-600 mb-6">{certificate?.skillName}</h3>
            <p className="text-gray-600 mb-2">with a score of</p>
            <p className="text-4xl font-bold text-green-600 mb-6">{certificate?.percentage}%</p>
            
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Issued on</p>
                  <p className="font-medium">{new Date(certificate?.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Certificate ID</p>
                  <p className="font-mono text-sm">{certificate?.certificateId?.slice(0, 16)}...</p>
                </div>
              </div>
            </div>

            {/* QR Code (if available) */}
            {certificate?.qrCode && (
              <div className="mt-8">
                <img src={certificate.qrCode} alt="QR Code" className="w-32 h-32 mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Scan to verify authenticity</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 p-6 flex gap-4 justify-center">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <FiDownload /> Download PDF
            </button>
            <button
              onClick={handleShare}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <FiShare2 /> Share
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyCertificate;