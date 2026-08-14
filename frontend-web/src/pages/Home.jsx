// frontend-web/src/pages/Home.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiUsers, FiBook, FiAward, FiMessageCircle, FiTrendingUp, FiStar } from 'react-icons/fi';
import skillswapLogo from '../assets/skillswaplogo.jpg';
import LearningScene from '../components/common/LearningScene';

const Home = () => {
  const features = [
    {
      icon: FiUsers,
      title: 'Connect with Experts',
      description: 'Meet skilled professionals ready to teach you'
    },
    {
      icon: FiBook,
      title: 'Learn New Skills',
      description: 'Master skills through one-on-one sessions'
    },
    {
      icon: FiStar,
      title: 'Share Your Expertise',
      description: 'Teach others and earn rewards'
    },
    {
      icon: FiAward,
      title: 'Get Certified',
      description: 'Earn certificates after completing courses'
    },
    {
      icon: FiTrendingUp,
      title: 'Track Progress',
      description: 'Monitor your learning journey with analytics'
    },
    {
      icon: FiMessageCircle,
      title: 'Real-time Chat',
      description: 'Connect instantly with your learning partners'
    }
  ];

  const stats = [
    { number: '50+', label: 'Active Learners' },
    { number: '50+', label: 'Expert Teachers' },
    { number: '50+', label: 'Skills Available' },
    { number: '99.9%', label: 'Satisfaction Rate' }
  ];

  const testimonials = [
    {
      name: 'Sai Kiran',
      role: 'Data Science Learner',
      text: 'SkillSwap helped me learn Python from an expert. The personalized sessions were incredibly helpful!'
    },
    {
      name: 'Tej Deepak Chandra',
      role: 'Web Development Teacher',
      text: 'I love teaching on SkillSwap. The platform makes it easy to connect with eager learners.'
    },
    {
      name: 'Karthik',
      role: 'AI/ML',
      text: 'I learned ML through SkillSwap and got certified. Best investment in my skills!'
    }
  ];

  return (
    <div className="w-full">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
              <img src={skillswapLogo} alt="SkillSwap" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SkillSwap
            </h1>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Learn. Share. Grow.
                </span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Exchange skills with experts around the world. Master new abilities through one-on-one personalized learning sessions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-xl transition flex items-center justify-center gap-2 font-semibold"
                >
                  Get Started <FiArrowRight />
                </Link>
                <Link
                  to="/marketplace"
                  className="px-8 py-4 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
                >
                  Explore Skills
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-blue-600">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block"
            >
              <LearningScene />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Why SkillSwap?</h2>
            <p className="text-xl text-gray-600">Everything you need to learn and teach</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl font-bold text-center mb-16"
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 items-center mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { step: '1', title: 'Sign Up', desc: 'Create your free account' },
                { step: '2', title: 'Choose Skills', desc: 'Pick what you want to learn' },
                { step: '3', title: 'Find Teacher', desc: 'Connect with an expert' },
                { step: '4', title: 'Start Learning', desc: 'Begin your journey' }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-lg border border-white/70 bg-white/80 p-6 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-xl flex items-center justify-center mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="hidden lg:block"
            >
              <LearningScene compact />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl font-bold text-center mb-16"
          >
            What Our Users Say
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of learners and teachers on SkillSwap today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:shadow-xl transition font-semibold flex items-center justify-center gap-2"
              >
                Get Started Now <FiArrowRight />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition font-semibold"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-white font-semibold mb-4">SkillSwap</h4>
            <p className="text-sm">Learn and share skills with experts worldwide</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">Features</Link></li>
              <li><Link to="/" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/" className="hover:text-white">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">About</Link></li>
              <li><Link to="/" className="hover:text-white">Blog</Link></li>
              <li><Link to="/" className="hover:text-white">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">Privacy</Link></li>
              <li><Link to="/" className="hover:text-white">Terms</Link></li>
              <li><Link to="/" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; 2026 SkillSwap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
