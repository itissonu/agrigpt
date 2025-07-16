const express = require('express');
const multer = require('multer');
const router = express.Router();
const imageDiagnoseController = require('../controllers/imageDiagnoseController.js');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post('/image-diagnose', upload.single('image'), imageDiagnoseController.diagnoseImage);

module.exports = router;