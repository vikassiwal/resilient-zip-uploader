import axios from 'axios';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const CONCURRENCY = 3;


const API_BASE_URL = 'http://localhost:3000/api/upload'; 

export class UploadManager {
  constructor(file, options) {
    this.file = file;
    this.options = options; // callbacks: onProgress, onStatusChange
    this.chunks = [];
    this.queue = [];
    this.activeUploads = 0;
    this.uploadedChunks = new Set();
    this.uploadId = `${file.name}-${file.size}-${file.lastModified}`; // Added lastModified for better uniqueness
    this.startTime = Date.now();
    this.bytesUploaded = 0;
  }

  async start() {
    const totalChunks = Math.ceil(this.file.size / CHUNK_SIZE);

    // 1. Handshake (Using the fixed API URL)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/init`, {
        fileId: this.uploadId,
        filename: this.file.name,
        totalSize: this.file.size,
        totalChunks
      });

      // Resume logic
      if (data.uploadedChunks) {
        data.uploadedChunks.forEach(idx => this.uploadedChunks.add(idx));
      }

      // 2. Prepare Queue
      for (let i = 0; i < totalChunks; i++) {
        if (!this.uploadedChunks.has(i)) {
          this.queue.push(i);
        }
      }

      // If file is already fully uploaded
      if (this.queue.length === 0) {
        this.options.onProgress({ percent: 100, speed: 0, eta: 0 });
        this.options.onComplete();
      } else {
        this.processQueue();
      }
      
    } catch (error) {
      console.error("Handshake failed:", error);
      alert("Backend connection failed. Is the server running on port 3000?");
    }
  }

  processQueue() {
    while (this.activeUploads < CONCURRENCY && this.queue.length > 0) {
      const chunkIdx = this.queue.shift();
      this.uploadChunk(chunkIdx);
    }
  }

  async uploadChunk(chunkIdx, retryCount = 0) {
    this.activeUploads++;
    this.options.onChunkStatus(chunkIdx, 'UPLOADING');

    const start = chunkIdx * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);
    const blob = this.file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', this.uploadId);
    formData.append('chunkIndex', chunkIdx);
    formData.append('chunk', blob);

    try {
      // Using the fixed API URL
      await axios.post(`${API_BASE_URL}/chunk`, formData);
      
      this.activeUploads--;
      this.uploadedChunks.add(chunkIdx);
      this.bytesUploaded += blob.size;
      this.options.onChunkStatus(chunkIdx, 'SUCCESS');
      
      this.updateProgress();

      if (this.queue.length === 0 && this.activeUploads === 0) {
        this.options.onComplete();
      } else {
        this.processQueue(); // Trigger next
      }

    } catch (error) {
      console.error(`Chunk ${chunkIdx} failed`, error);
      
      if (retryCount < 3) {
        // Exponential Backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
            this.activeUploads--; 
            this.uploadChunk(chunkIdx, retryCount + 1);
        }, delay);
      } else {
        this.options.onChunkStatus(chunkIdx, 'ERROR');
        this.activeUploads--;
      }
    }
  }

  updateProgress() {
    // Avoid division by zero
    const elapsed = (Date.now() - this.startTime) / 1000; 
    const speed = elapsed > 0 ? (this.bytesUploaded / 1024 / 1024) / elapsed : 0; 
    
    // ETA
    const remainingBytes = this.file.size - (this.uploadedChunks.size * CHUNK_SIZE);
    const eta = speed > 0 ? (remainingBytes / 1024 / 1024) / speed : 0;

    this.options.onProgress({
      percent: Math.min(100, Math.round((this.uploadedChunks.size / (this.file.size / CHUNK_SIZE)) * 100)),
      speed: speed.toFixed(2),
      eta: eta.toFixed(1)
    });
  }
}