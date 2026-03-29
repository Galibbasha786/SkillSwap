// frontend-web/src/components/ratings/RatingModal.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiX, FiSend } from 'react-icons/fi';
import { ratingAPI } from '../../services/api';
import toast from 'react-hot-toast';

const RatingModal = ({ isOpen, onClose, session, role, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(false);

  // Category definitions based on role
  const categoryOptions = role === 'teacher' 
    ? [
        { key: 'engagement', label: 'Student Engagement', description: 'How engaged was the student?' },
        { key: 'respectfulness', label: 'Respectfulness', description: 'Was the student respectful?' },
        { key: 'preparation', label: 'Preparation', description: 'Did the student come prepared?' }
      ]
    : [
        { key: 'communication', label: 'Communication', description: 'How clear was the explanation?' },
        { key: 'expertise', label: 'Expertise', description: 'Knowledge of the subject?' },
        { key: 'punctuality', label: 'Punctuality', description: 'Started and ended on time?' },
        { key: 'teachingStyle', label: 'Teaching Style', description: 'Was the teaching style effective?' }
      ];

  const handleCategoryRating = (category, value) => {
    setCategories(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await ratingAPI.rateSession(session._id, {
        rating,
        review,
        categories,
        role
      });
      
      toast.success('Rating submitted successfully!');
      onRatingSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {role === 'teacher' ? 'Rate Your Student' : 'Rate Your Teacher'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Session Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Session</p>
              <p className="font-semibold text-gray-900">{session?.title}</p>
              <p className="text-sm text-gray-500">
                {new Date(session?.date).toLocaleDateString()} • {session?.duration} min
              </p>
              <p className="text-sm text-gray-500">Skill: {session?.skillName}</p>
            </div>

            {/* Star Rating */}
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <FiStar
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {rating === 1 && 'Poor - Needs improvement'}
                {rating === 2 && 'Fair - Could be better'}
                {rating === 3 && 'Good - Satisfactory'}
                {rating === 4 && 'Very Good - Impressive'}
                {rating === 5 && 'Excellent - Outstanding!'}
              </p>
            </div>

            {/* Category Ratings */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Detailed Ratings
              </label>
              {categoryOptions.map((cat) => (
                <div key={cat.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleCategoryRating(cat.key, star)}
                          className="focus:outline-none"
                        >
                          <FiStar
                            className={`w-5 h-5 ${
                              star <= (categories[cat.key] || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Written Review */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write a Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows="4"
                placeholder={role === 'teacher' 
                  ? "What did you think about the student's engagement and participation?"
                  : "What did you like about the session? Any suggestions for improvement?"
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right mt-1">
                {review.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              Submit Rating
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RatingModal;