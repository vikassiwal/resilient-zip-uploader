const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs-extra');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || 'PLACEHOLDER_KEY',
    secretAccessKey: process.env.AWS_SECRET_KEY || 'PLACEHOLDER_SECRET',
  },
});

const uploadToCloud = async (filePath, fileName) => {
  try {
    console.log(`Initiating Cloud Upload for: ${fileName}`);
    
    // Check: Agar keys nahi hain to upload skip kar do (Crash nahi hoga)
    if (!process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY === 'PLACEHOLDER_KEY') {
        console.log("No AWS Keys found. Skipping S3 upload (Simulation Mode).");
        return false;
    }

    const fileStream = fs.createReadStream(filePath);
    
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME || 'my-project-bucket',
      Key: fileName,
      Body: fileStream,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    console.log(`Successfully archived to S3: ${fileName}`);
    
    
    
    return true;
  } catch (err) {
    console.error(" Cloud Upload Error:", err.message);
    return false;
  }
};

module.exports = uploadToCloud;