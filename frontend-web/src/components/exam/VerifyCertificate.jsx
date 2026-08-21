// frontend-web/src/components/exam/VerifyCertificate.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiDownload, FiShare2 } from 'react-icons/fi';
import { certificateAPI } from '../../services/api';
import CertificateDisplay from './CertificateDisplay';
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
    navigator.clipboard.writeText(window.location.href);
    toast.success('Verification link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center"
        >
          <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Certificate</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Return to Home
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full"
          >
            <FiCheckCircle className="w-5 h-5" />
            <span className="font-medium">Verified Certificate</span>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CertificateDisplay certificate={certificate} />

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
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
