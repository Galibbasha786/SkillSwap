const Post = require('../models/Post');
const { POST_CATEGORIES } = require('../models/Post');
const { cloudinary } = require('../config/cloudinary');

const uploadPostImage = async (file) => {
  if (!file) {
    return { imageUrl: '', imagePublicId: '' };
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'skillswap-posts',
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      }
    );
    stream.end(file.buffer);
  });

  return {
    imageUrl: result.secure_url,
    imagePublicId: result.public_id
  };
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
  }
  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const formatPost = (post, userId) => {
  const doc = post.toObject ? post.toObject() : post;
  const likedByMe = userId
    ? (doc.likes || []).some((id) => String(id) === String(userId) || String(id?._id) === String(userId))
    : false;

  return {
    ...doc,
    likeCount: doc.likes?.length || 0,
    likedByMe,
    isOwner: userId ? String(doc.author?._id || doc.author) === String(userId) : false
  };
};

// @desc    Create a community post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { category, title, content, tags, link } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (!category || !POST_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `Category must be one of: ${POST_CATEGORIES.join(', ')}`
      });
    }

    let imageUrl = req.body.imageUrl?.trim() || '';
    let imagePublicId = req.body.imagePublicId?.trim() || '';

    if (req.file) {
      const uploaded = await uploadPostImage(req.file);
      imageUrl = uploaded.imageUrl;
      imagePublicId = uploaded.imagePublicId;
    }

    const post = await Post.create({
      author: req.user.id,
      category,
      title: title?.trim() || '',
      content: content.trim(),
      tags: normalizeTags(tags),
      link: link?.trim() || '',
      imageUrl,
      imagePublicId
    });

    await post.populate('author', 'name profileImage email');

    res.status(201).json({
      success: true,
      post: formatPost(post, req.user.id)
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

// @desc    Get community feed
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.category && POST_CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name profileImage email'),
      Post.countDocuments(filter)
    ]);

    res.json({
      success: true,
      posts: posts.map((post) => formatPost(post, req.user.id)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Failed to load posts' });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isActive: true }).populate(
      'author',
      'name profileImage email'
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({
      success: true,
      post: formatPost(post, req.user.id)
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Failed to load post' });
  }
};

// @desc    Delete own post (admin can delete any)
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || !post.isActive) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isOwner = String(post.author) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed to delete this post' });
    }

    if (post.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(post.imagePublicId);
      } catch (imageError) {
        console.warn('Post image cleanup failed:', imageError.message);
      }
    }

    post.isActive = false;
    await post.save();

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

// @desc    Like or unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isActive: true });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.id;
    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(userId));
    } else {
      post.likes.push(userId);
    }

    await post.save();
    await post.populate('author', 'name profileImage email');

    res.json({
      success: true,
      post: formatPost(post, userId)
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Failed to update like' });
  }
};

// @desc    Get post categories
// @route   GET /api/posts/meta/categories
// @access  Private
exports.getCategories = async (_req, res) => {
  res.json({
    success: true,
    categories: POST_CATEGORIES
  });
};
