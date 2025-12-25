const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const Upload = require('../models/Upload');
const yauzl = require('yauzl'); // ZIP reader

const UPLOAD_DIR = path.join(__dirname, '../../storage');


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

    // Create a new empty file placeholder
    const filePath = path.join(UPLOAD_DIR, `${fileId}.tmp`);
    await fs.ensureFile(filePath); // Creates empty file

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

    // If we already have this chunk, ignore it
    if (upload.uploadedChunks.includes(chunkIdx)) {
      return res.status(200).json({ message: 'Chunk already received' });
    }

    const chunkBuffer = req.file.buffer; // Data from Multer
    const offset = chunkIdx * upload.chunkSize; // Calculate position

    
    const fd = await fs.open(upload.filePath, 'r+');
    await fs.write(fd, chunkBuffer, 0, chunkBuffer.length, offset);
    await fs.close(fd);

    
    const updatedUpload = await Upload.findOneAndUpdate(
      { uploadId },
      { $addToSet: { uploadedChunks: chunkIdx } }, // $addToSet prevents duplicates
      { new: true }
    );

    // Check if upload is complete 
    // Check if upload is complete (Finalization Logic)
    if (updatedUpload.uploadedChunks.length === updatedUpload.totalChunks) {
      console.log(` Finalizing Upload: ${uploadId}`);
      
      // 1. Lock the status
      const lock = await Upload.findOneAndUpdate(
        { uploadId, status: 'UPLOADING' },
        { status: 'PROCESSING' }
      );

      if (!lock) {
        return res.json({ message: 'Chunk uploaded (Already processing)' });
      }

      
      const hash = crypto.createHash('sha256');
      const fileStream = fs.createReadStream(upload.filePath);
      
      const fileHash = await new Promise((resolve, reject) => {
        fileStream.on('data', (data) => hash.update(data));
        fileStream.on('end', () => resolve(hash.digest('hex')));
        fileStream.on('error', reject);
      });
      console.log(`File Hash: ${fileHash}`);
      

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

      console.log(" Files inside ZIP:", fileNames);

      // 3. Rename File
      const finalPath = path.join(UPLOAD_DIR, upload.filename);
      await fs.rename(upload.filePath, finalPath);

      // 4. Update DB as COMPLETED with Hash
      await Upload.updateOne(
        { uploadId }, 
        { 
            status: 'COMPLETED', 
            filePath: finalPath,
            finalHash: fileHash 
        }
      );
      
      console.log(`Upload Fully Completed: ${upload.filename}`);
    }

    res.json({ message: 'Chunk uploaded successfully' });
  } catch (error) {
    console.error(` Chunk ${req.body.chunkIndex} failed:`, error);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
};