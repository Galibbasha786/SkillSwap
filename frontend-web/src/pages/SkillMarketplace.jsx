
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList,
  FiChevronDown,
  FiX,
  FiTrendingUp,
  FiStar,
  FiUsers
} from 'react-icons/fi';
import { userAPI, skillAPI } from '../services/api';
import { skillCategories, getSkillCategory } from '../data/skillCategories';
import BackButton from '../components/common/BackButton';
import toast from 'react-hot-toast';

const SkillMarketplace = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['all']);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Get current user ID to filter out self
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUserId(user.id || user._id);
    }
    
    fetchTeachers();
    fetchCategories();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // Fetch all users who have teaching skills
      const response = await userAPI.getAllTeachers();
      console.log('Fetched teachers:', response.data);
      
      // Get current user ID from localStorage
      const savedUser = localStorage.getItem('user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;
      const currentUserId = currentUser?.id || currentUser?._id;
      
      // Filter out current user
      const otherTeachers = response.data.filter(teacher => {
        const teacherId = teacher._id || teacher.id;
        return teacherId !== currentUserId;
      });
      
      console.log('Other teachers:', otherTeachers);
      setTeachers(otherTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
      // Set empty array on error
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await skillAPI.getCategories();
      const apiCategories = response.data && Array.isArray(response.data) ? response.data : [];
      const defaults = skillCategories.map((category) => category.name);
      setCategories(['all', ...new Set([...defaults, ...apiCategories, 'Other'])]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['all', ...skillCategories.map((category) => category.name), 'Other']);
    }
  };

  const resolveSkillCategory = (skill) => skill.category || getSkillCategory(skill.name);

  const filteredTeachers = teachers.filter(teacher => {
    // Search in teacher name and skills
    const matchesSearch = searchTerm === '' || 
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.skillsTeach?.some(skill => 
        skill.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Filter by category
    const matchesCategory = selectedCategory === 'all' || 
      teacher.skillsTeach?.some(skill => resolveSkillCategory(skill) === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'sessions') return (b.totalSessions || 0) - (a.totalSessions || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  const handleTeacherClick = (teacherId) => {
    navigate(`/teacher/${teacherId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="mb-3">
            <BackButton />
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-2xl">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for teachers or skills..."
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
                        <option value="rating">Top Rated</option>
                        <option value="sessions">Most Experienced</option>
                        <option value="name">Name A-Z</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
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
            Found <span className="font-semibold">{sortedTeachers.length}</span> teachers
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

        {/* Teachers Grid/List */}
        {sortedTeachers.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No teachers found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {sortedTeachers.map((teacher, index) => (
                <motion.div
                  key={teacher._id || teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleTeacherClick(teacher._id || teacher.id)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  
                  <div className="px-4 pb-4">
                    <div className="flex justify-center -mt-12 mb-2">
                      <img
                        src={teacher.profileImage || 'https://via.placeholder.com/80'}
                        alt={teacher.name}
                        className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                      />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-center text-gray-900 mb-1">
                      {teacher.name}
                    </h3>
                    
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          {teacher.rating?.toFixed(1) || 'New'}
                        </span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        {teacher.totalSessions || 0} sessions
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Teaches:</p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.skillsTeach?.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                          >
                            {skill.name}
                          </span>
                        ))}
                        {teacher.skillsTeach?.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            +{teacher.skillsTeach.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        From ${Math.min(...(teacher.skillsTeach?.map(s => s.hourlyRate) || [0]))}/hr
                      </span>
                      <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                        View Profile →
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedTeachers.map((teacher, index) => (
                <motion.div
                  key={teacher._id || teacher.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleTeacherClick(teacher._id || teacher.id)}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow border border-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={teacher.profileImage || 'https://via.placeholder.com/60'}
                      alt={teacher.name}
                      className="w-16 h-16 rounded-full"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                        <div className="flex items-center gap-2">
                          <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">{teacher.rating?.toFixed(1) || 'New'}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">{teacher.bio}</p>
                      
                      <div className="flex flex-wrap gap-2">
                        {teacher.skillsTeach?.map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                          >
                            {skill.name} (${skill.hourlyRate}/hr)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMarketplace;
