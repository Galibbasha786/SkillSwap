// frontend-web/src/components/skills/SkillCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiUsers, FiClock, FiBookOpen } from 'react-icons/fi';

const SkillCard = ({ skill, onSelect, isSelected, userCount }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(skill)}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
          : 'bg-white hover:shadow-md border border-gray-100'
        }
      `}
    >
      {/* Popularity indicator */}
      {userCount > 0 && (
        <div className={`absolute top-2 right-2 flex items-center text-xs gap-1
          ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}
        >
          <FiUsers className="w-3 h-3" />
          <span>{userCount}</span>
        </div>
      )}

      <h3 className={`font-semibold mb-2 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
        {skill.name || skill}
      </h3>
      
      {skill.description && (
        <p className={`text-sm mb-3 ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
          {skill.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        {skill.category && (
          <span className={`text-xs px-2 py-1 rounded-full
            ${isSelected 
              ? 'bg-white/20 text-white' 
              : 'bg-gray-100 text-gray-600'
            }`}
          >
            {skill.category}
          </span>
        )}
        
        {skill.rating && (
          <div className="flex items-center gap-1">
            <FiStar className={`w-4 h-4 ${isSelected ? 'text-yellow-300' : 'text-yellow-500'}`} />
            <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>
              {skill.rating}
            </span>
          </div>
        )}
      </div>

      {/* Experience level indicator (for teaching skills) */}
      {skill.experience && (
        <div className={`mt-3 flex items-center gap-1 text-xs
          ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}
        >
          <FiClock className="w-3 h-3" />
          <span>{skill.experience}</span>
        </div>
      )}

      {/* Students count (for popular skills) */}
      {skill.students && (
        <div className={`mt-2 flex items-center gap-1 text-xs
          ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}
        >
          <FiBookOpen className="w-3 h-3" />
          <span>{skill.students} learners</span>
        </div>
      )}
    </motion.div>
  );
};

export default SkillCard;