const mongoose = require('mongoose');

const POST_CATEGORIES = ['education', 'knowledge', 'jobs', 'opportunities'];

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: POST_CATEGORIES,
      required: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    tags: {
      type: [String],
      default: []
    },
    link: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    imagePublicId: {
      type: String,
      default: ''
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
module.exports.POST_CATEGORIES = POST_CATEGORIES;
