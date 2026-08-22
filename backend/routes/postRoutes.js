const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { postMediaUpload } = require('../config/cloudinary');
const {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  toggleLike,
  getCategories,
  addComment,
  getComments,
  sharePost
} = require('../controllers/postController');

router.use(auth);

const optionalMediaUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  postMediaUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Media must be under 50MB'
          : err.message || 'Invalid media upload';
      return res.status(400).json({ message });
    }
    next();
  });
};

router.get('/meta/categories', getCategories);
router.get('/', getPosts);
router.post('/', optionalMediaUpload, createPost);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.post('/:id/share', sharePost);
router.get('/:id', getPostById);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);

module.exports = router;
