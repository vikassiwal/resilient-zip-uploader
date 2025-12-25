const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Configure Multer to keep chunks in memory briefly
// We strictly limit chunk size to 6MB to prevent memory overload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB limit (safe for 5MB chunks)
});

router.post('/init', uploadController.initUpload);
router.post('/chunk', upload.single('chunk'), uploadController.uploadChunk);

module.exports = router;