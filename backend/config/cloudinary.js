// backend/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const VIDEO_TYPES = /mp4|webm|mov|quicktime|mpeg/;

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const ok =
    IMAGE_TYPES.test(ext) &&
    (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream');
  if (ok) return cb(null, true);
  cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
};

const videoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const ok =
    VIDEO_TYPES.test(ext) ||
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/octet-stream';
  if (ok) return cb(null, true);
  cb(new Error('Only videos are allowed (mp4, webm, mov)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const postMediaUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      return videoFilter(req, file, cb);
    }
    if (file.fieldname === 'image') {
      return imageFilter(req, file, cb);
    }
    cb(new Error('Unexpected upload field'));
  },
});

module.exports = {
  cloudinary,
  upload,
  postMediaUpload,
  isCloudinaryConfigured: () =>
    Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    ),
};
