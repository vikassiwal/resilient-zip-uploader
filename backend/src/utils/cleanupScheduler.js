const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');

const storageDir = path.join(__dirname, '../../storage');

// Run every day at midnight (00:00)
const startCleanupJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running scheduled cleanup for old temporary files...');
    
    try {
      const files = await fs.readdir(storageDir);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(storageDir, file);
        const stats = await fs.stat(filePath);

        // Delete files older than 24 hours
        if (now - stats.mtimeMs > ONE_DAY) {
            // Check logic: Only delete if it's a temporary chunk or partial file
            // You can add logic here to check DB if upload is 'COMPLETED' before deleting
            await fs.remove(filePath);
            console.log(`Deleted stale file: ${file}`);
        }
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  });
};

module.exports = startCleanupJob;