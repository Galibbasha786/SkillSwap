const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { POST_CATEGORIES } = require('../models/Post');
const { cloudinary, upload, isCloudinaryConfigured } = require('../config/cloudinary');

const uploadPostImage = async (file) => {
  if (!file) {
    return { imageUrl: '', imagePublicId: '' };
  }

  if (!isCloudinaryConfigured()) {
    throw new Error('Image upload is not configured on the server');
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

const uploadPostVideo = async (file) => {
  if (!file) {
    return { videoUrl: '', videoPublicId: '' };
  }

  if (!isCloudinaryConfigured()) {
    throw new Error('Video upload is not configured on the server');
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'skillswap-posts/videos',
        resource_type: 'video'
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      }
    );
    stream.end(file.buffer);
  });

  return {
    videoUrl: result.secure_url,
    videoPublicId: result.public_id
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

const formatPost = (post, userId, meta = {}) => {
  const doc = post.toObject ? post.toObject() : post;
  const likedByMe = userId
    ? (doc.likes || []).some((id) => String(id) === String(userId) || String(id?._id) === String(userId))
    : false;
  const sharedByMe = userId
    ? (doc.shares || []).some((id) => String(id) === String(userId) || String(id?._id) === String(userId))
    : false;

  return {
    ...doc,
    likeCount: doc.likes?.length || 0,
    shareCount: doc.shares?.length || 0,
    commentCount: meta.commentCount || 0,
    likedByMe,
    sharedByMe,
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
    let videoUrl = req.body.videoUrl?.trim() || '';
    let videoPublicId = req.body.videoPublicId?.trim() || '';
    let mediaType = 'none';

    if (req.files?.image?.[0]) {
      try {
        const uploaded = await uploadPostImage(req.files.image[0]);
        imageUrl = uploaded.imageUrl;
        imagePublicId = uploaded.imagePublicId;
        mediaType = 'image';
      } catch (uploadError) {
        console.error('Post image upload error:', uploadError);
        return res.status(503).json({ message: 'Failed to upload image.' });
      }
    } else if (req.file && req.file.mimetype?.startsWith('image/')) {
      try {
        const uploaded = await uploadPostImage(req.file);
        imageUrl = uploaded.imageUrl;
        imagePublicId = uploaded.imagePublicId;
        mediaType = 'image';
      } catch (uploadError) {
        console.error('Post image upload error:', uploadError);
        return res.status(503).json({ message: 'Failed to upload image.' });
      }
    }

    if (req.files?.video?.[0]) {
      try {
        const uploaded = await uploadPostVideo(req.files.video[0]);
        videoUrl = uploaded.videoUrl;
        videoPublicId = uploaded.videoPublicId;
        mediaType = 'video';
      } catch (uploadError) {
        console.error('Post video upload error:', uploadError);
        return res.status(503).json({ message: 'Failed to upload video.' });
      }
    }

    const post = await Post.create({
      author: req.user.id,
      category,
      title: title?.trim() || '',
      content: content.trim(),
      tags: normalizeTags(tags),
      link: link?.trim() || '',
      imageUrl,
      imagePublicId,
      videoUrl,
      videoPublicId,
      mediaType
    });

    await post.populate('author', 'name profileImage email');

    res.status(201).json({
      success: true,
      post: formatPost(post, req.user.id)
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      message: error.name === 'ValidationError'
        ? 'Invalid post data'
        : 'Failed to create post'
    });
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

    const [posts, total, commentCounts] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name profileImage email')
        .populate('originalPost', 'content title author'),
      Post.countDocuments(filter),
      Comment.aggregate([
        { $match: { post: { $exists: true } } },
        { $group: { _id: '$post', count: { $sum: 1 } } }
      ])
    ]);

    const commentCountMap = Object.fromEntries(
      commentCounts.map((item) => [String(item._id), item.count])
    );

    res.json({
      success: true,
      posts: posts.map((post) =>
        formatPost(post, req.user.id, { commentCount: commentCountMap[String(post._id)] || 0 })
      ),
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

    if (post.videoPublicId) {
      try {
        await cloudinary.uploader.destroy(post.videoPublicId, { resource_type: 'video' });
      } catch (videoError) {
        console.warn('Post video cleanup failed:', videoError.message);
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

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    const post = await Post.findOne({ _id: req.params.id, isActive: true });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user.id,
      content: content.trim()
    });

    await comment.populate('author', 'name profileImage email');

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'name profileImage email');

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Failed to load comments' });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const original = await Post.findOne({ _id: req.params.id, isActive: true });
    if (!original) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyShared = (original.shares || []).some(
      (id) => String(id) === String(req.user.id)
    );
    if (!alreadyShared) {
      original.shares.push(req.user.id);
      await original.save();
    }

    const message = req.body.message?.trim();
    const reshare = await Post.create({
      author: req.user.id,
      category: original.category,
      title: original.title,
      content: message || original.content,
      tags: original.tags,
      link: original.link,
      imageUrl: original.imageUrl,
      imagePublicId: original.imagePublicId,
      videoUrl: original.videoUrl,
      videoPublicId: original.videoPublicId,
      mediaType: original.mediaType,
      originalPost: original._id
    });

    await reshare.populate('author', 'name profileImage email');
    await reshare.populate('originalPost', 'content title author');

    res.status(201).json({
      success: true,
      post: formatPost(reshare, req.user.id),
      originalPost: formatPost(original, req.user.id, {
        commentCount: await Comment.countDocuments({ post: original._id })
      })
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Failed to reshare post' });
  }
};
