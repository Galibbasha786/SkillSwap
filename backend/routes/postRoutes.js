const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  toggleLike,
  getCategories
} = require('../controllers/postController');

router.use(auth);

const optionalImageUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be under 5MB'
          : err.message || 'Invalid image upload';
      return res.status(400).json({ message });
    }
    next();
  });
};

router.get('/meta/categories', getCategories);
router.get('/', getPosts);
router.post('/', optionalImageUpload, createPost);
router.get('/:id', getPostById);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);

module.exports = router;
