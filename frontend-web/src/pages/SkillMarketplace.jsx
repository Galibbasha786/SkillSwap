// frontend-web/src/pages/SkillMarketplace.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList,
  FiChevronDown,
  FiX,
  FiTrendingUp,
  FiStar
} from 'react-icons/fi';
import SkillCard from '../components/skills/SkillCard';
import { skillCategories, allSkills } from '../data/skillCategories';

const SkillMarketplace = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortBy, setSortBy] = useState('popular');
  
  // Mock data - will be replaced with real API calls
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockSkills = allSkills.map((skill, index) => ({
        id: index,
        name: skill,
        category: getSkillCategory(skill),
        rating: (Math.random() * 2 + 3).toFixed(1),
        students: Math.floor(Math.random() * 1000),
        experience: ['Beginner', 'Intermediate', 'Expert'][Math.floor(Math.random() * 3)],
        description: `Learn ${skill} from expert teachers`
      }));
      setSkills(mockSkills);
      setLoading(false);
    }, 1000);
  }, []);

  const getSkillCategory = (skill) => {
    for (const cat of skillCategories) {
      if (cat.skills.includes(skill)) {
        return cat.name;
      }
    }
    return 'Other';
  };

  const categories = ['all', ...skillCategories.map(c => c.name)];

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedSkills = [...filteredSkills].sort((a, b) => {
    if (sortBy === 'popular') return b.students - a.students;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const handleSkillSelect = (skill) => {
    if (selectedSkills.find(s => s.id === skill.id)) {
      setSelectedSkills(selectedSkills.filter(s => s.id !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-2xl">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for skills to learn or teach..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX />
                </button>
              )}
            </div>

            {/* View Toggle & Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFilter className={`w-5 h-5 ${showFilters ? 'text-blue-500' : 'text-gray-600'}`} />
              </button>
              
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <FiGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <FiList className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category === 'all' ? 'All Categories' : category}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>

                    {/* Sort By */}
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="popular">Most Popular</option>
                        <option value="rating">Highest Rated</option>
                        <option value="name">Name A-Z</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>

                    {/* Active Filters */}
                    {selectedSkills.length > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-gray-600">
                          {selectedSkills.length} selected
                        </span>
                        <button
                          onClick={() => setSelectedSkills([])}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{sortedSkills.length}</span> skills
          </p>
          
          {/* Trending Tags */}
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-blue-500" />
            <div className="flex gap-2">
              {['JavaScript', 'Python', 'Guitar', 'Yoga'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchTerm(tag)}
                  className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {sortedSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SkillCard
                    skill={skill}
                    onSelect={handleSkillSelect}
                    isSelected={selectedSkills.some(s => s.id === skill.id)}
                    userCount={skill.students}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sortedSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{skill.name}</h3>
                      <p className="text-sm text-gray-600">{skill.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                          {skill.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <FiStar className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-700">{skill.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FiUsers className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{skill.students} learners</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSkillSelect(skill)}
                      className={`ml-4 px-4 py-2 rounded-lg transition-colors ${
                        selectedSkills.some(s => s.id === skill.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {selectedSkills.some(s => s.id === skill.id) ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Selected Skills Bar (for adding to profile) */}
        <AnimatePresence>
          {selectedSkills.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Selected skills ({selectedSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map(skill => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                        >
                          {skill.name}
                          <button
                            onClick={() => handleSkillSelect(skill)}
                            className="ml-1 hover:text-blue-800"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-4">
                    <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors">
                      Add to Profile
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SkillMarketplace;