const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  uploadId: { type: String, required: true, unique: true, index: true },
  filename: String,
  totalSize: Number,
  chunkSize: Number,
  totalChunks: Number,
  uploadedChunks: { type: [Number], default: [] }, // Array of completed chunk indexes
  status: { 
    type: String, 
    enum: ['UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
    default: 'UPLOADING' 
  },
  filePath: String, // Location of the temp file on disk
  finalHash: String,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Upload', UploadSchema);