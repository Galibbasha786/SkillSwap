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
  FiX,
  FiMaximize2,
  FiChevronDown,
  FiChevronUp,
  FiMessageCircle,
  FiShare2,
  FiVideo
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

const CONTENT_PREVIEW_LENGTH = 280;

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
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [expandedPosts, setExpandedPosts] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const togglePostExpanded = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

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

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB');
      return;
    }

    clearImage();
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview('');
  };

  const loadComments = async (postId) => {
    try {
      const response = await postAPI.getComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: response.data.comments || [] }));
    } catch (error) {
      toast.error('Failed to load comments');
    }
  };

  const toggleComments = async (postId) => {
    const isOpen = openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  };

  const handleAddComment = async (postId) => {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;

    try {
      const response = await postAPI.addComment(postId, content);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), response.data.comment]
      }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, commentCount: (post.commentCount || 0) + 1 }
            : post
        )
      );
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleShare = async (post) => {
    try {
      const response = await postAPI.share(post._id);
      toast.success('Post reshared!');
      if (response.data.post) {
        setPosts((prev) => [response.data.post, ...prev]);
      }
    } catch (error) {
      toast.error('Failed to reshare post');
    }
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

      if (imageFile || videoFile) {
        const payload = new FormData();
        Object.entries(postData).forEach(([key, value]) => payload.append(key, value));
        if (imageFile) payload.append('image', imageFile);
        if (videoFile) payload.append('video', videoFile);
        await postAPI.create(payload);
      } else {
        await postAPI.create(postData);
      }

      toast.success('Post shared!');
      setForm({ category: form.category, title: '', content: '', tags: '', link: '' });
      clearImage();
      clearVideo();
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
                className="mt-3 max-h-64 w-full rounded-lg border border-gray-200 object-contain bg-gray-50 cursor-zoom-in"
                onClick={() => setLightboxImage(imagePreview)}
              />
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Video (optional)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                <FiVideo className="w-4 h-4" />
                Choose video
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </label>
              {videoPreview && (
                <button
                  type="button"
                  onClick={clearVideo}
                  className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                >
                  <FiX className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
            {videoPreview && (
              <video
                src={videoPreview}
                controls
                className="mt-3 max-h-64 w-full rounded-lg border border-gray-200 bg-black"
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

                    {(() => {
                      const isExpanded = expandedPosts[post._id];
                      const isLong = post.content.length > CONTENT_PREVIEW_LENGTH;
                      const displayContent =
                        isLong && !isExpanded
                          ? `${post.content.slice(0, CONTENT_PREVIEW_LENGTH).trim()}…`
                          : post.content;

                      return (
                        <>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {displayContent}
                          </p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => togglePostExpanded(post._id)}
                              className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <FiChevronUp className="w-4 h-4" /> Show less
                                </>
                              ) : (
                                <>
                                  <FiChevronDown className="w-4 h-4" /> Read more
                                </>
                              )}
                            </button>
                          )}
                        </>
                      );
                    })()}

                    {post.videoUrl && (
                      <video
                        src={post.videoUrl}
                        controls
                        className="mt-3 max-h-96 w-full rounded-lg border border-gray-100 bg-black"
                      />
                    )}

                    {post.originalPost && (
                      <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                        Reshared from another post
                      </div>
                    )}

                    {post.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(post.imageUrl)}
                        className="mt-3 block w-full text-left group"
                      >
                        <img
                          src={post.imageUrl}
                          alt={post.title || 'Post image'}
                          className="rounded-lg max-h-96 w-full object-contain border border-gray-100 bg-gray-50 group-hover:opacity-95 transition-opacity"
                        />
                        <span className="mt-1 text-xs text-indigo-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <FiMaximize2 className="w-3.5 h-3.5" /> Click to expand
                        </span>
                      </button>
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

                      <button
                        type="button"
                        onClick={() => toggleComments(post._id)}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
                      >
                        <FiMessageCircle className="w-4 h-4" />
                        {post.commentCount || 0}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(post)}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600"
                      >
                        <FiShare2 className="w-4 h-4" />
                        {post.shareCount || 0}
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

                    {openComments[post._id] && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {(commentsByPost[post._id] || []).map((comment) => (
                          <div key={comment._id} className="flex gap-2">
                            <img
                              src={comment.author?.profileImage || 'https://via.placeholder.com/32'}
                              alt={comment.author?.name || 'User'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">{comment.author?.name}</p>
                              <p className="text-sm text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentDrafts[post._id] || ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))
                            }
                            placeholder="Write a comment..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post._id)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <FiX className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Expanded post"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default Posts;
