import React from 'react';
import skillswapLogo from '../../assets/skillswaplogo.jpg';

const MARQUEE_ITEMS = [
  'SkillSwap',
  'Learn • Share • Grow',
  'Peer-to-Peer Learning',
  'Free Skill Exchange',
  'Live Sessions & Exams'
];

const BrandMarquee = ({ className = '' }) => {
  const slides = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className={`brand-marquee ${className}`} aria-hidden="true">
      <div className="brand-marquee-track">
        {slides.map((text, index) => (
          <div key={`${text}-${index}`} className="brand-marquee-item">
            <img src={skillswapLogo} alt="" className="brand-marquee-logo" />
            <span className="brand-marquee-title">SkillSwap</span>
            <span className="brand-marquee-divider">•</span>
            <span className="brand-marquee-text">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandMarquee;
