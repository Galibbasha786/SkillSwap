import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDollarSign, FiTarget, FiPlus, FiX, FiTrendingUp } from 'react-icons/fi';
import { skillCategories } from '../../data/skillCategories';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AddLearningSkill = ({ onAdd, existingSkills }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    priority: 'Medium',
    budget: 50, // Maximum budget they're willing to pay per hour
    currency: 'USD'
  });

  const priorityLevels = [
    { value: 'Low', color: 'bg-green-100 text-green-600' },
    { value: 'Medium', color: 'bg-yellow-100 text-yellow-600' },
    { value: 'High', color: 'bg-red-100 text-red-600' }
  ];

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
      toast.error('You already want to learn this skill');
      return;
    }
    
    try {
      await userAPI.addLearningSkill(formData);
      toast.success('Learning goal added successfully!');
      onAdd?.();
      setIsOpen(false);
      setFormData({
        name: '',
        category: '',
        priority: 'Medium',
        budget: 50,
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
          className="w-full p-6 border-2 border-dashed border-purple-300 rounded-xl text-purple-500 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 bg-purple-50/50"
        >
          <FiPlus className="w-5 h-5" />
          Add a Skill You Want to Learn
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-purple-200"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiTarget className="text-purple-500" />
              Add Learning Goal
            </h3>
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
                What do you want to learn?
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., JavaScript, Guitar, Yoga..."
                required
              />
              <datalist id="skills">
                {allSkills.map((skill, index) => (
                  <option key={index} value={skill.name} />
                ))}
              </datalist>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <div className="flex gap-2">
                {priorityLevels.map(({ value, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({...formData, priority: value})}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                      formData.priority === value
                        ? `${color} ring-2 ring-offset-2 ring-${color.split(' ')[0].replace('bg-', '')}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* 💰 Maximum Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiDollarSign className="inline mr-1" />
                Maximum Budget (per hour)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <FiTrendingUp className="text-purple-500" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(formData.budget / 500) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {formData.budget >= 100 ? 'Premium' : formData.budget >= 50 ? 'Standard' : 'Budget'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This helps us find teachers within your price range
              </p>
            </div>

            {/* Submit Buttons */}
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
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
              >
                Add Learning Goal
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default AddLearningSkill;
