const uploadToCloud = require('../utils/s3Uploader');
const fs = require('fs-extra');
const { Worker } = require('worker_threads'); // Worker import kiya
const path = require('path');
// crypto yahan se hata sakte hain kyunki ab worker use karega, but rakhne me nuksan nahi
const Upload = require('../models/Upload');
const yauzl = require('yauzl');

const UPLOAD_DIR = path.join(__dirname, '../../storage');

// --- HELPER FUNCTION: Worker Thread Wrapper ---
// Ye function hashing ko main thread se hata kar worker thread par dalega
const calculateHashWithWorker = (filePath) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/hashWorker.js'), {
      workerData: { filePath },
    });

    worker.on('message', (hash) => {
      resolve(hash);
    });

    worker.on('error', (err) => {
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};

exports.initUpload = async (req, res) => {
  try {
    const { filename, totalSize, totalChunks, fileId } = req.body;
    
    let upload = await Upload.findOne({ uploadId: fileId });

    if (upload) {
      return res.json({ 
        status: 'RESUMING', 
        uploadId: upload.uploadId, 
        uploadedChunks: upload.uploadedChunks 
      });
    }

    const filePath = path.join(UPLOAD_DIR, `${fileId}.tmp`);
    await fs.ensureFile(filePath);

    upload = new Upload({
      uploadId: fileId,
      filename,
      totalSize,
      totalChunks,
      chunkSize: 5 * 1024 * 1024, // 5MB
      filePath
    });

    await upload.save();
    res.json({ status: 'NEW', uploadId: fileId, uploadedChunks: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Initialization failed' });
  }
};

exports.uploadChunk = async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const chunkIdx = parseInt(chunkIndex);
    
    const upload = await Upload.findOne({ uploadId });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    if (upload.uploadedChunks.includes(chunkIdx)) {
      return res.status(200).json({ message: 'Chunk already received' });
    }

    const chunkBuffer = req.file.buffer;
    const offset = chunkIdx * upload.chunkSize;

    const fd = await fs.open(upload.filePath, 'r+');
    await fs.write(fd, chunkBuffer, 0, chunkBuffer.length, offset);
    await fs.close(fd);

    const updatedUpload = await Upload.findOneAndUpdate(
      { uploadId },
      { $addToSet: { uploadedChunks: chunkIdx } },
      { new: true }
    );

    // --- FINALIZATION LOGIC ---
    if (updatedUpload.uploadedChunks.length === updatedUpload.totalChunks) {
      console.log(`Finalizing Upload: ${uploadId}`);
      
      const lock = await Upload.findOneAndUpdate(
        { uploadId, status: 'UPLOADING' },
        { status: 'PROCESSING' }
      );

      if (!lock) {
        return res.json({ message: 'Chunk uploaded (Already processing)' });
      }

      // 1. Calculate Hash using WORKER THREAD (Performance Optimization)
      console.log("Starting hashing in background worker...");
      let fileHash;
      try {
        fileHash = await calculateHashWithWorker(upload.filePath);
        console.log(`Worker calculated Hash: ${fileHash}`);
      } catch (err) {
        console.error("Hashing failed:", err);
        // Fallback or error handling logic
        return res.status(500).json({ error: 'Integrity check failed' });
      }

      // 2. Peek inside ZIP using yauzl
      const fileNames = [];
      await new Promise((resolve) => {
        yauzl.open(upload.filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            console.log("Not a valid zip or error opening:", err?.message);
            return resolve();
          }
          zipfile.readEntry();
          zipfile.on('entry', (entry) => {
            fileNames.push(entry.fileName);
            zipfile.readEntry();
          });
          zipfile.on('end', resolve);
          zipfile.on('error', resolve); 
        });
      });

      console.log("Files inside ZIP:", fileNames);

      // 3. Rename File
      const finalPath = path.join(UPLOAD_DIR, upload.filename);
      await fs.rename(upload.filePath, finalPath);

      // 4. Update DB
      await Upload.updateOne(
        { uploadId }, 
        { 
            status: 'COMPLETED', 
            filePath: finalPath,
            finalHash: fileHash 
        }
      );
      
      console.log(`Upload Fully Completed: ${upload.filename}`);
      uploadToCloud(finalPath, upload.filename).then((success) => {
          if (success) {
              console.log("Archiving process completed.");
          }
      });
    }

    res.json({ message: 'Chunk uploaded successfully' });
  } catch (error) {
    console.error(`Chunk ${req.body.chunkIndex} failed:`, error);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
};