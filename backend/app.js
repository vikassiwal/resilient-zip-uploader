const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const uploadRoutes = require('./src/routes/uploadRoutes'); // Import routes
const cleanupOldUploads = require('./src/utils/cleanup');
const startCleanupJob = require('./src/utils/cleanupScheduler');

// Start the cron job when server starts
startCleanupJob();

const app = express();
const rateLimit = require('express-rate-limit');

// Define the limiter: Max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


app.use('/api', limiter);
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ensure storage exists
const UPLOAD_DIR = path.join(__dirname, 'storage');
fs.ensureDirSync(UPLOAD_DIR);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zip-uploader';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    cleanupOldUploads(); //  Server start hote hi safai karega
  })
  .catch(err => console.error(err));

// Use the upload routes
app.use('/api/upload', uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});