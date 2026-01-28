const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: {expires: 0}, // Auto-delete after expiration
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
storySchema.index({user: 1, createdAt: -1});
storySchema.index({expiresAt: 1});

module.exports = mongoose.model('Story', storySchema);

