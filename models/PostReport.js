const mongoose = require('mongoose');

const postReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true }
);

postReportSchema.index({ reporter: 1, post: 1 }, { unique: true });
postReportSchema.index({ reporter: 1 });

module.exports = mongoose.model('PostReport', postReportSchema);
