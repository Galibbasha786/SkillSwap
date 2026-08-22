const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get skill categories for marketplace filters
// @route   GET /api/skills/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await User.aggregate([
      { $unwind: '$skillsTeach' },
      { $match: { 'skillsTeach.category': { $nin: [null, ''] } } },
      { $group: { _id: '$skillsTeach.category' } },
      { $sort: { _id: 1 } }
    ]);

    res.json([...new Set([
      'Programming',
      'Web Development',
      'Mobile Development',
      'Data Science',
      'Music',
      'Languages',
      'Design',
      'Fitness',
      'Business',
      'Art',
      'Cooking',
      'Photography',
      'Other',
      ...categories.map((item) => item._id).filter(Boolean)
    ])].sort());
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// @desc    Search teachers by skill
// @route   GET /api/skills/teachers
// @access  Public
router.get('/teachers', async (req, res) => {
  try {
    const { skill, city } = req.query;

    let filter = {
      'skillsTeach': { $elemMatch: { name: new RegExp(skill || '', 'i') } }
    };

    // Add city filter if provided
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }

    const teachers = await User.find(filter)
      .select('name bio profileImage location skillsTeach rating totalSessions')
      .limit(20);

    res.json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    console.error('Error searching teachers:', error);
    res.status(500).json({ message: 'Failed to search teachers' });
  }
});

// @desc    Get all skills being taught
// @route   GET /api/skills
// @access  Public
router.get('/', async (req, res) => {
  try {
    const skills = await User.aggregate([
      { $unwind: '$skillsTeach' },
      { $group: { _id: '$skillsTeach.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
});

// @desc    Search skills
// @route   GET /api/skills/search
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const results = await User.find({
      'skillsTeach': { $elemMatch: { name: new RegExp(query, 'i') } }
    })
      .select('name bio profileImage location skillsTeach rating totalSessions hourlyRate')
      .limit(20);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;