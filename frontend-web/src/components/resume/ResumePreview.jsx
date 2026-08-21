import React from 'react';
import { linesToBullets } from '../../utils/resumeTemplates';

const Section = ({ title, children, className = '' }) => {
  if (!children) return null;
  return (
    <section className={`resume-section ${className}`}>
      <h2 className="resume-section-title">{title}</h2>
      <div className="resume-section-body">{children}</div>
    </section>
  );
};

const BulletBlock = ({ text }) => {
  const lines = linesToBullets(text);
  if (!lines.length) return null;

  return (
    <div className="space-y-1">
      {lines.map((line, index) => (
        <p key={`${line}-${index}`} className="resume-line whitespace-pre-wrap">
          {line.startsWith('•') ? line : `• ${line}`}
        </p>
      ))}
    </div>
  );
};

const ClassicTemplate = ({ data }) => {
  const { personal } = data;

  return (
    <div className="resume-classic text-[11px] leading-[1.45] text-black bg-white p-8 min-h-[1056px]">
      <header className="text-center mb-4">
        <h1 className="text-[22px] font-bold tracking-wide uppercase">{personal.name || 'Your Name'}</h1>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
          {personal.linkedin && <span>LinkedIn: {personal.linkedin}</span>}
          {personal.email && <span>Email: {personal.email}</span>}
          {personal.github && <span>GitHub: {personal.github}</span>}
          {personal.phone && <span>Mobile: {personal.phone}</span>}
          {personal.portfolio && <span>Portfolio: {personal.portfolio}</span>}
        </div>
      </header>

      <Section title="SKILLS"><BulletBlock text={data.skills} /></Section>
      <Section title="INTERNSHIP"><BulletBlock text={data.internships} /></Section>
      <Section title="PROJECTS"><BulletBlock text={data.projects} /></Section>
      <Section title="CERTIFICATES"><BulletBlock text={data.certificates} /></Section>
      <Section title="ACHIEVEMENTS"><BulletBlock text={data.achievements} /></Section>
      <Section title="EXTRA-CURRICULAR ACTIVITIES"><BulletBlock text={data.activities} /></Section>
      <Section title="EDUCATION"><BulletBlock text={data.education} /></Section>
    </div>
  );
};

const ModernTemplate = ({ data }) => {
  const { personal } = data;

  return (
    <div className="resume-modern text-[11px] leading-[1.45] text-gray-900 bg-white min-h-[1056px]">
      <header className="bg-indigo-700 text-white px-8 py-6">
        <h1 className="text-[24px] font-bold">{personal.name || 'Your Name'}</h1>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] opacity-95">
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <span>{personal.phone}</span>}
          {personal.linkedin && <span>{personal.linkedin}</span>}
          {personal.github && <span>{personal.github}</span>}
          {personal.portfolio && <span>{personal.portfolio}</span>}
        </div>
      </header>
      <div className="p-8 space-y-4">
        <Section title="Skills" className="modern-section"><BulletBlock text={data.skills} /></Section>
        <Section title="Experience & Internships" className="modern-section"><BulletBlock text={data.internships} /></Section>
        <Section title="Projects" className="modern-section"><BulletBlock text={data.projects} /></Section>
        <Section title="Certifications" className="modern-section"><BulletBlock text={data.certificates} /></Section>
        <Section title="Achievements" className="modern-section"><BulletBlock text={data.achievements} /></Section>
        <Section title="Activities" className="modern-section"><BulletBlock text={data.activities} /></Section>
        <Section title="Education" className="modern-section"><BulletBlock text={data.education} /></Section>
      </div>
    </div>
  );
};

const MinimalTemplate = ({ data }) => {
  const { personal } = data;

  return (
    <div className="resume-minimal text-[11px] leading-[1.5] text-black bg-white p-10 min-h-[1056px] font-serif">
      <header className="border-b border-black pb-3 mb-4">
        <h1 className="text-[20px] font-bold">{personal.name || 'Your Name'}</h1>
        <p className="mt-1 text-[10px]">
          {[personal.email, personal.phone, personal.linkedin, personal.github, personal.portfolio]
            .filter(Boolean)
            .join('  |  ')}
        </p>
      </header>

      <Section title="Skills"><BulletBlock text={data.skills} /></Section>
      <Section title="Internship"><BulletBlock text={data.internships} /></Section>
      <Section title="Projects"><BulletBlock text={data.projects} /></Section>
      <Section title="Certificates"><BulletBlock text={data.certificates} /></Section>
      <Section title="Achievements"><BulletBlock text={data.achievements} /></Section>
      <Section title="Activities"><BulletBlock text={data.activities} /></Section>
      <Section title="Education"><BulletBlock text={data.education} /></Section>
    </div>
  );
};

const ResumePreview = ({ templateId, data }) => {
  switch (templateId) {
    case 'modern':
      return <ModernTemplate data={data} />;
    case 'minimal':
      return <MinimalTemplate data={data} />;
    case 'classic':
    default:
      return <ClassicTemplate data={data} />;
  }
};

export default ResumePreview;
