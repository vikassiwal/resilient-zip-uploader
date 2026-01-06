const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const fs = require('fs');

// This code runs in a separate thread
const calculateHash = () => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(workerData.filePath);

  stream.on('data', (data) => {
    hash.update(data);
  });

  stream.on('end', () => {
    const fileHash = hash.digest('hex');
    parentPort.postMessage(fileHash); // Send result back to main thread
  });

  stream.on('error', (err) => {
    throw err;
  });
};

calculateHash();