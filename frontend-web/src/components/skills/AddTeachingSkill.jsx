// src/components/skills/AddTeachingSkill.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDollarSign, FiClock, FiAward, FiPlus, FiX } from 'react-icons/fi';
import { skillCategories } from '../../data/skillCategories';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AddTeachingSkill = ({ onAdd, existingSkills }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    experience: 'Intermediate',
    yearsOfExperience: 1,
    hourlyRate: 25,
    currency: 'USD'
  });

  const experienceLevels = ['Beginner', 'Intermediate', 'Expert', 'Master'];
  
  // Flatten all skills for suggestions
  const allSkills = skillCategories.flatMap(cat => 
    cat.skills.map(skill => ({
      name: skill,
      category: cat.name
    }))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if skill already added
    if (existingSkills?.some(s => s.name.toLowerCase() === formData.name.toLowerCase())) {
      toast.error('You already teach this skill');
      return;
    }
    
    try {
      await userAPI.addTeachingSkill(formData);
      toast.success('Skill added successfully!');
      onAdd?.();
      setIsOpen(false);
      setFormData({
        name: '',
        category: '',
        experience: 'Intermediate',
        yearsOfExperience: 1,
        hourlyRate: 25,
        currency: 'USD'
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add skill');
    }
  };

  return (
    <div className="mb-6">
      {!isOpen ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(true)}
          className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
        >
          <FiPlus className="w-5 h-5" />
          Add a Skill You Want to Teach
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Teaching Skill</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Skill Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What skill do you want to teach?
              </label>
              <input
                type="text"
                list="skills"
                value={formData.name}
                onChange={(e) => {
                  const selected = allSkills.find(s => s.name === e.target.value);
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    category: selected?.category || ''
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., JavaScript, Guitar, Yoga..."
                required
              />
              <datalist id="skills">
                {allSkills.map((skill, index) => (
                  <option key={index} value={skill.name} />
                ))}
              </datalist>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiAward className="inline mr-1" />
                Experience Level
              </label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({...formData, experience: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {experienceLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiClock className="inline mr-1" />
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({...formData, yearsOfExperience: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 💰 Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiDollarSign className="inline mr-1" />
                Hourly Rate (what students will pay)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value)})}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                You'll receive 90% after platform fees
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                Add Skill
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default AddTeachingSkill;