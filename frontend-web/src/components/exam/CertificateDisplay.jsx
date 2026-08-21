import React from 'react';
import { FiAward } from 'react-icons/fi';
import skillswapLogo from '../../assets/skillswaplogo.jpg';

export const getCertificateGrade = (percentage = 0) => {
  if (percentage >= 90) return { name: 'EXCELLENT', color: 'text-emerald-600', bg: 'bg-emerald-50', message: 'Outstanding achievement' };
  if (percentage >= 80) return { name: 'DISTINCTION', color: 'text-blue-600', bg: 'bg-blue-50', message: 'Excellent performance' };
  if (percentage >= 70) return { name: 'MERIT', color: 'text-violet-600', bg: 'bg-violet-50', message: 'Very good performance' };
  if (percentage >= 60) return { name: 'CREDIT', color: 'text-amber-600', bg: 'bg-amber-50', message: 'Good performance' };
  return { name: 'PASS', color: 'text-slate-600', bg: 'bg-slate-50', message: 'Satisfactory completion' };
};

const formatCertId = (certificateId = '') => {
  if (!certificateId || certificateId.length < 24) return certificateId;
  return `${certificateId.slice(0, 8)}-${certificateId.slice(8, 16)}-${certificateId.slice(16, 24)}`;
};

const CertificateDisplay = ({ certificate, compact = false }) => {
  if (!certificate) return null;

  const percentage = Number(certificate.percentage ?? certificate.score ?? 0);
  const grade = getCertificateGrade(percentage);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-inner ${compact ? '' : 'mx-auto max-w-5xl'}`}>
      <div className="absolute inset-3 rounded-xl border-2 border-amber-300/80 pointer-events-none" />
      <div className="absolute inset-5 rounded-lg border border-indigo-200 pointer-events-none" />

      <div className="relative bg-gradient-to-r from-blue-900 via-indigo-700 to-violet-700 px-6 py-5 text-center text-white">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-400" />
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-white p-1 shadow-lg">
          <img src={skillswapLogo} alt="SkillSwap" className="h-full w-full rounded-lg object-cover" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">SkillSwap Platform</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Certificate of Achievement</h1>
      </div>

      <div className="relative px-6 py-8 text-center sm:px-10 sm:py-10">
        <FiAward className="mx-auto mb-4 h-8 w-8 text-amber-500" />

        <p className="text-base text-slate-500">This is to proudly certify that</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{certificate.studentName}</h2>

        <p className="mt-4 text-base text-slate-500">has successfully completed the examination in</p>
        <div className="mx-auto mt-4 inline-block rounded-xl bg-indigo-50 px-6 py-3">
          <h3 className="text-xl font-semibold text-indigo-700 sm:text-2xl">{certificate.skillName}</h3>
        </div>

        <p className="mx-auto mt-5 max-w-2xl text-sm text-slate-500">
          Demonstrating strong knowledge and practical understanding through a proctored assessment on SkillSwap.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
          <div className="rounded-xl bg-emerald-500 px-8 py-3 text-white shadow-md">
            <span className="text-3xl font-bold">{percentage.toFixed(1)}%</span>
          </div>
          <div className={`rounded-xl px-5 py-3 text-left ${grade.bg}`}>
            <p className={`text-lg font-bold ${grade.color}`}>{grade.name}</p>
            <p className="text-xs text-slate-500">{grade.message}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
            <div className="text-left sm:text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Certificate Details</p>
              <p className="mt-2 text-xs text-slate-500">Issued on</p>
              <p className="font-medium text-slate-800">
                {certificate.issueDate
                  ? new Date(certificate.issueDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : '—'}
              </p>
              <p className="mt-3 text-xs text-slate-500">Certificate ID</p>
              <p className="break-all font-mono text-xs text-slate-800">
                {formatCertId(certificate.certificateId)}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Authorized By</p>
              <div className="mx-auto mt-4 h-px w-36 bg-indigo-300" />
              <p className="mt-3 font-semibold text-slate-800">SkillSwap Instructor</p>
              <p className="text-xs text-slate-500">Certifying Authority</p>
            </div>

            <div className="flex flex-col items-center sm:items-end">
              {certificate.qrCode ? (
                <>
                  <img
                    src={certificate.qrCode}
                    alt="Verification QR code"
                    className="h-24 w-24 rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <p className="mt-2 text-xs text-slate-500">Scan to verify authenticity</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">Verification available via certificate link</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateDisplay;
