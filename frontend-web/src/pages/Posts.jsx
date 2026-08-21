// frontend-web/src/pages/Posts.jsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiHeart,
  FiTrash2,
  FiExternalLink,
  FiLoader,
  FiSend,
  FiTag,
  FiImage,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { postAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'education', label: 'Education' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'opportunities', label: 'Opportunities' }
];

const CATEGORY_STYLES = {
  education: 'bg-blue-100 text-blue-700',
  knowledge: 'bg-purple-100 text-purple-700',
  jobs: 'bg-emerald-100 text-emerald-700',
  opportunities: 'bg-orange-100 text-orange-700'
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const Posts = () => {
  const { getUserId } = useAuth();
  const userId = getUserId();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [form, setForm] = useState({
    category: 'education',
    title: '',
    content: '',
    tags: '',
    link: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fetchPosts = async (category = activeCategory) => {
    try {
      setLoading(true);
      const params = category !== 'all' ? { category } : {};
      const response = await postAPI.getAll(params);
      setPosts(response.data.posts || []);
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(activeCategory);
  }, [activeCategory]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.content.trim()) {
      toast.error('Write something to post');
      return;
    }

    try {
      setSubmitting(true);

      const postData = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags,
        link: form.link.trim()
      };

      if (imageFile) {
        const payload = new FormData();
        Object.entries(postData).forEach(([key, value]) => payload.append(key, value));
        payload.append('image', imageFile);
        await postAPI.create(payload);
      } else {
        await postAPI.create(postData);
      }

      toast.success('Post shared!');
      setForm({ category: form.category, title: '', content: '', tags: '', link: '' });
      clearImage();
      fetchPosts(activeCategory);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await postAPI.toggleLike(postId);
      const updated = response.data.post;
      setPosts((prev) => prev.map((post) => (post._id === postId ? updated : post)));
    } catch (error) {
      toast.error('Could not update like');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      await postAPI.delete(postId);
      setPosts((prev) => prev.filter((post) => post._id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Community Board</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Share education tips, knowledge, jobs, and opportunities with the SkillSwap community.
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create a post</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Free Python workshop this weekend"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                maxLength={200}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              What do you want to share?
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Share study resources, job openings, internship tips, learning advice..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 resize-none"
              maxLength={5000}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (optional)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="python, internship, remote"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link (optional)
              </label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image (optional)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                <FiImage className="w-4 h-4" />
                Choose image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                >
                  <FiX className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-3 max-h-48 rounded-lg border border-gray-200 object-cover"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </motion.form>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.article
                key={post._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={post.author?.profileImage || 'https://via.placeholder.com/40'}
                    alt={post.author?.name || 'User'}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {post.author?.name || 'User'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          CATEGORY_STYLES[post.category] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
                    </div>

                    {post.title && (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {post.title}
                      </h3>
                    )}

                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {post.content}
                    </p>

                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title || 'Post image'}
                        className="mt-3 rounded-lg max-h-80 w-full object-cover border border-gray-100"
                      />
                    )}

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                          >
                            <FiTag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.link && (
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        View link
                      </a>
                    )}

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleLike(post._id)}
                        className={`inline-flex items-center gap-1 text-sm ${
                          post.likedByMe ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <FiHeart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
                        {post.likeCount || 0}
                      </button>

                      {(post.isOwner || String(post.author?._id) === String(userId)) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(post._id)}
                          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 ml-auto"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Posts;
