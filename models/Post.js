const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Tweet content (text is primary, image/video optional)
    text: {
      type: String,
      default: '',
      maxlength: 280, // Twitter character limit
    },
    image: {
      type: String,
      default: '',
    },
    video: {
      type: String,
      default: '',
    },
    // For retweets
    originalPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    retweetedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    retweets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    // Legacy support for caption (maps to text)
    caption: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
postSchema.index({user: 1, createdAt: -1});
postSchema.index({originalPost: 1});
postSchema.index({text: 'text'}); // For text search

// Virtual for tweet text (use text or caption)
postSchema.virtual('tweetText').get(function() {
  return this.text || this.caption || '';
});

module.exports = mongoose.model('Post', postSchema);

