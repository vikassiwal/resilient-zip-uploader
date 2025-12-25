const fs = require('fs-extra');
const Upload = require('../models/Upload');

const cleanupOldUploads = async () => {
    console.log('Running Cleanup Job...');
    
    // 24 ghante purani files jo abhi bhi 'UPLOADING' hain
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oldUploads = await Upload.find({
        status: { $in: ['UPLOADING', 'PROCESSING'] },
        lastUpdated: { $lt: oneDayAgo }
    });

    for (const upload of oldUploads) {
        try {
            // Disk se delete karein
            if (await fs.pathExists(upload.filePath)) {
                await fs.unlink(upload.filePath);
                console.log(`Deleted file: ${upload.filePath}`);
            }
            // Database se delete karein
            await Upload.deleteOne({ _id: upload._id });
            console.log(`Removed record: ${upload.uploadId}`);
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    }
    console.log('Cleanup Finished.');
};

module.exports = cleanupOldUploads;