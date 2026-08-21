import React from 'react';
import { motion } from 'framer-motion';
import skillswapLogo from '../../assets/skillswaplogo.jpg';

const QUOTES = [
  'You are now part of the SkillSwap family — learn together, grow together.',
  'Every skill shared makes our community stronger. Welcome home!',
  'Teaching one, learning one — that is the SkillSwap way.'
];

const SkillSwapFamilyCard = ({ name, profileImage }) => {
  const quote = QUOTES[Math.abs((name || 'user').length) % QUOTES.length];
  const avatar = profileImage || 'https://via.placeholder.com/120';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full min-h-[280px] rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white flex flex-col"
    >
      <div className="p-6 h-full flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100 mb-4">
          SkillSwap Family
        </p>

        <div className="flex items-center justify-center gap-0 mb-5">
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full ring-4 ring-white/30 overflow-hidden bg-white shadow-xl">
              <img src={avatar} alt={name || 'You'} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="relative -mx-3 z-20 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/40">
              <span className="text-lg">🤝</span>
            </div>
            <div className="h-0.5 w-14 bg-gradient-to-r from-amber-300 via-white to-amber-300 rounded-full mt-1" />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full ring-4 ring-amber-300/50 overflow-hidden bg-white shadow-xl">
              <img src={skillswapLogo} alt="SkillSwap" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="text-center flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold">{name || 'SkillSwap Member'}</h3>
          <p className="text-sm text-indigo-100 mt-1">+ SkillSwap</p>
          <blockquote className="mt-4 text-sm leading-relaxed text-white/90 italic border-l-2 border-amber-300/70 pl-3 text-left">
            &ldquo;{quote}&rdquo;
          </blockquote>
        </div>
      </div>
    </motion.div>
  );
};

export default SkillSwapFamilyCard;
