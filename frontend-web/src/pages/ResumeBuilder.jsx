// frontend-web/src/pages/ResumeBuilder.jsx

import React, { useEffect, useRef, useState } from 'react';
import { FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import ResumePreview from '../components/resume/ResumePreview';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/api';
import {
  EMPTY_RESUME,
  RESUME_TEMPLATES,
  SAMPLE_RESUME,
  profileToResumeDefaults
} from '../utils/resumeTemplates';
import referenceResume from '../assets/FINAL_RESUME.pdf';

const SECTION_FIELDS = [
  { key: 'skills', label: 'Skills', rows: 5, placeholder: 'One skill group per line...' },
  { key: 'internships', label: 'Internship / Experience', rows: 5, placeholder: 'Role – Company | location | dates\n• bullet point...' },
  { key: 'projects', label: 'Projects', rows: 6, placeholder: 'Project Name | links | dates\n• bullet point...' },
  { key: 'certificates', label: 'Certificates', rows: 4, placeholder: 'Certificate name – provider | date' },
  { key: 'achievements', label: 'Achievements', rows: 4, placeholder: 'Achievement | date' },
  { key: 'activities', label: 'Extra-Curricular Activities', rows: 3, placeholder: 'Activity | date' },
  { key: 'education', label: 'Education', rows: 4, placeholder: 'Institution | location\nDegree; score | dates' }
];

const ResumeBuilder = () => {
  const { getUserId } = useAuth();
  const previewRef = useRef(null);
  const [templateId, setTemplateId] = useState('classic');
  const [resumeData, setResumeData] = useState(EMPTY_RESUME);

  useEffect(() => {
    const loadProfile = async () => {
      const userId = getUserId();
      if (!userId) return;
      try {
        const response = await userAPI.getProfile(userId);
        setResumeData((prev) => ({
          ...prev,
          ...profileToResumeDefaults(response.data),
          personal: {
            ...prev.personal,
            ...profileToResumeDefaults(response.data).personal
          }
        }));
      } catch (_) {
        // optional profile preload
      }
    };
    loadProfile();
  }, [getUserId]);

  const updatePersonal = (field, value) => {
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  const updateSection = (key, value) => {
    setResumeData((prev) => ({ ...prev, [key]: value }));
  };

  const loadSample = () => {
    setResumeData(SAMPLE_RESUME);
    setTemplateId('classic');
    toast.success('Loaded reference resume sample');
  };

  const resetForm = () => {
    setResumeData(EMPTY_RESUME);
    toast.success('Form cleared');
  };

  const handleDownload = () => {
    const preview = previewRef.current;
    if (!preview) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      toast.error('Allow pop-ups to download PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${resumeData.personal.name || 'Resume'}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }
            .resume-section { margin-bottom: 14px; }
            .resume-section-title {
              font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
              border-bottom: 1px solid #000; margin-bottom: 6px; padding-bottom: 2px;
            }
            .resume-line { margin: 0; font-size: 11px; line-height: 1.45; }
            .space-y-1 > * + * { margin-top: 4px; }
            .modern-section .resume-section-title { border-bottom-color: #4338ca; color: #312e81; }
            @page { size: A4; margin: 12mm; }
          </style>
        </head>
        <body>${preview.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Resume Builder</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              Build a professional resume using our reference template from{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">FINAL_RESUME</code> or choose an online-style layout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={referenceResume}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <FiFileText className="w-4 h-4" />
              View reference PDF
            </a>
            <button
              type="button"
              onClick={loadSample}
              className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm hover:bg-indigo-50"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              <FiDownload className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {RESUME_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setTemplateId(template.id)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                templateId === template.id
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              {template.reference === 'FINAL_RESUME' && (
                <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-indigo-600 font-medium">
                  Reference template
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your details</h2>
                <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                  <FiRefreshCw className="w-4 h-4" />
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['name', 'Full name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['linkedin', 'LinkedIn'],
                  ['github', 'GitHub'],
                  ['portfolio', 'Portfolio URL']
                ].map(([field, label]) => (
                  <div key={field} className={field === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="text"
                      value={resumeData.personal[field]}
                      onChange={(e) => updatePersonal(field, e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            {SECTION_FIELDS.map((section) => (
              <div
                key={section.key}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
              >
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {section.label}
                </label>
                <textarea
                  value={resumeData[section.key]}
                  onChange={(e) => updateSection(section.key, e.target.value)}
                  rows={section.rows}
                  placeholder={section.placeholder}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 resize-y font-mono"
                />
              </div>
            ))}
          </div>

          <div className="xl:sticky xl:top-24 h-fit">
            <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Live preview</p>
              <div className="overflow-auto max-h-[80vh] rounded-lg border border-gray-300 shadow-inner bg-white">
                <div ref={previewRef}>
                  <ResumePreview templateId={templateId} data={resumeData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ResumeBuilder;
