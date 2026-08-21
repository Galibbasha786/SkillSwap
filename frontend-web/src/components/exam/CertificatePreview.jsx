// frontend-web/src/components/exam/CertificatePreview.jsx

import React from 'react';
import CertificateDisplay from './CertificateDisplay';

const CertificatePreview = ({ certificate, onDownload }) => (
  <div className="max-w-5xl mx-auto">
    <CertificateDisplay certificate={certificate} />

    {onDownload && (
      <div className="mt-6 flex justify-center">
        <button
          onClick={onDownload}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all flex items-center gap-2 shadow-md"
        >
          Download Certificate
        </button>
      </div>
    )}
  </div>
);

export default CertificatePreview;
