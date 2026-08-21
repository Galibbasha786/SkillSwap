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

router.get('/meta/categories', getCategories);
router.get('/', getPosts);
router.post('/', upload.single('image'), createPost);
router.get('/:id', getPostById);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);

module.exports = router;
