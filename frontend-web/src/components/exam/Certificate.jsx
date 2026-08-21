// frontend-web/src/components/exam/Certificate.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDownload, FiShare2, FiCheckCircle } from 'react-icons/fi';
import { certificateAPI } from '../../services/api';
import CertificateDisplay from './CertificateDisplay';
import toast from 'react-hot-toast';

const Certificate = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCertificate();
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      const response = await certificateAPI.getCertificate(certificateId);
      setCertificate(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setError(error.response?.data?.message || 'Certificate not found');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await certificateAPI.downloadCertificate(certificateId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate?.certificateId || certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download certificate');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/verify/${certificate?.certificateId}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FiCheckCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The certificate you're looking for does not exist."}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CertificateDisplay certificate={certificate} />

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-md"
            >
              <FiDownload className="w-5 h-5" /> Download PDF
            </button>
            <button
              onClick={handleShare}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
            >
              <FiShare2 className="w-5 h-5" /> Share Verification Link
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Certificate;
