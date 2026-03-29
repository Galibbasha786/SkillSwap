// frontend-web/src/components/profile/ProfileRatingsTab.jsx

import React, { useState, useEffect } from 'react';
import RatingDisplay from '../ratings/RatingDisplay';
import { ratingAPI } from '../../services/api';

const ProfileRatingsTab = ({ userId }) => {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, [userId]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await ratingAPI.getUserRatings(userId);
      setRatings(response.data.ratings);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
        <p className="text-sm text-gray-500">{ratings.length} total reviews</p>
      </div>

      <RatingDisplay
        ratings={ratings}
        stats={stats}
        loading={loading}
      />
    </div>
  );
};

export default ProfileRatingsTab;