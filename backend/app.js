const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const uploadRoutes = require('./src/routes/uploadRoutes'); // Import routes
const cleanupOldUploads = require('./src/utils/cleanup');

const app = express();
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