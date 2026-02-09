const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { uploadBuffer, isR2Configured } = require('../utils/r2');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  },
});

// POST /api/upload — upload image for post/profile (multipart form field: image)
// Optional query: ?folder=posts | profiles (default: uploads)
router.post('/', auth, (req, res) => {
  if (!isR2Configured()) {
    return res.status(503).json({
      message: 'Image upload is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.',
    });
  }

  const folder = req.query.folder === 'profiles' ? 'profiles' : req.query.folder === 'posts' ? 'posts' : 'uploads';

  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image too large (max 10MB)' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image file sent. Use form field "image".' });
    }

    try {
      const url = await uploadBuffer(req.file.buffer, req.file.mimetype, folder);
      return res.json({ url });
    } catch (e) {
      console.error('R2 upload error:', e);
      return res.status(500).json({ message: 'Failed to store image' });
    }
  });
});

module.exports = router;
