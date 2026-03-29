// frontend-web/src/components/ratings/RatingDisplay.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiThumbsUp, FiMessageSquare, FiCalendar, FiUser } from 'react-icons/fi';

const RatingDisplay = ({ ratings, stats, loading }) => {
  const [expandedReview, setExpandedReview] = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-24 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <FiStar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No ratings yet</p>
        <p className="text-sm text-gray-400">Be the first to leave a review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {stats && stats.totalRatings > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.averageRating || 0}
              </div>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FiStar
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(stats.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalRatings} reviews
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-8">{star}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{
                        width: `${((stats.distribution?.[star] || 0) / stats.totalRatings) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">
                    {stats.distribution?.[star] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Individual Ratings */}
      <div className="space-y-4">
        {ratings.map((rating, index) => (
          <motion.div
            key={rating.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            {/* Rating Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={rating.givenBy?.profileImage || 'https://via.placeholder.com/40'}
                  alt={rating.givenBy?.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                />
                <div>
                  <p className="font-semibold text-gray-900">{rating.givenBy?.name || 'Anonymous'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FiCalendar className="w-3 h-3" />
                    <span>{rating.givenAt ? new Date(rating.givenAt).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-lg">{rating.rating}</span>
                <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>

            {/* Review Text */}
            {rating.review && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FiMessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">Review</span>
                </div>
                <p className={`text-gray-700 text-sm ${!expandedReview === rating.id && rating.review.length > 200 ? 'line-clamp-3' : ''}`}>
                  {rating.review}
                </p>
                {rating.review.length > 200 && (
                  <button
                    onClick={() => setExpandedReview(expandedReview === rating.id ? null : rating.id)}
                    className="text-blue-500 text-sm mt-1 hover:underline"
                  >
                    {expandedReview === rating.id ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RatingDisplay;