// frontend-web/src/components/exam/CertificatePreview.jsx

import React from 'react';
import { motion } from 'framer-motion';

const CertificatePreview = ({ certificate, onDownload }) => {
  const colors = {
    primary: '#1E3A8A',
    secondary: '#3B82F6',
    accent: '#10B981',
    gold: '#F59E0B'
  };

  const getGrade = (score) => {
    if (score >= 90) return { name: 'EXCELLENT', color: '#10B981', message: 'Outstanding achievement!' };
    if (score >= 80) return { name: 'DISTINCTION', color: '#3B82F6', message: 'Excellent performance!' };
    if (score >= 70) return { name: 'MERIT', color: '#8B5CF6', message: 'Very good performance!' };
    if (score >= 60) return { name: 'CREDIT', color: '#F59E0B', message: 'Good performance!' };
    return { name: 'PASS', color: '#6B7280', message: 'Satisfactory completion!' };
  };

  const grade = getGrade(certificate?.percentage || 0);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Certificate Header with Brand Colors */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 p-8 text-white text-center relative">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,...')]"></div>
        <h1 className="text-4xl font-bold">Certificate of Achievement</h1>
        <p className="text-blue-200 mt-2">SkillSwap Platform</p>
      </div>

      {/* Certificate Content */}
      <div className="p-12 text-center border-8 border-double border-blue-200 m-8">
        <p className="text-lg text-gray-600">This is to proudly certify that</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{certificate?.studentName}</h2>
        <p className="text-lg text-gray-600">has successfully completed</p>
        <h3 className="text-2xl font-semibold text-blue-600 mt-4">{certificate?.skillName}</h3>
        
        <div className="mt-8 flex justify-center">
          <div className="bg-green-500 text-white px-8 py-3 rounded-full">
            <span className="text-3xl font-bold">{certificate?.percentage?.toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="mt-4">
          <span className={`text-2xl font-bold`} style={{ color: grade.color }}>
            {grade.name}
          </span>
          <p className="text-sm text-gray-500 mt-1">{grade.message}</p>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="grid grid-cols-2 gap-8">
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
      </div>

      {/* Actions */}
      <div className="bg-gray-50 p-6 flex gap-4 justify-center">
        <button
          onClick={onDownload}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Certificate
        </button>
      </div>
    </div>
  );
};

export default CertificatePreview;