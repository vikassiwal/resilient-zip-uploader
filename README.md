#  Resumable ZIP Uploader (>1GB)

A robust, fault-tolerant file upload system capable of handling large ZIP files (>1GB) with chunking, concurrency control, and automatic resumability. Built with **React.js**, **Node.js (Express)**, and **MongoDB**.

## Key Features

### 🔹 Frontend (React)
- **Smart Chunking:** Splits large files into **5MB chunks** using `Blob.slice()`.
- **Resumability:** Automatically resumes uploads from the last successful chunk after network failure or page refresh.
- **Concurrency Control:** Limits active uploads to **3 concurrent requests** to prevent browser freezing.
- **Visual Feedback:** Live **Speed (MB/s)**, **ETA**, and a **Chunk Map** showing real-time status (Pending, Uploading, Success).

### 🔹 Backend (Node.js)
- **Streaming I/O:** Writes binary chunks directly to specific offsets in the file using `fs.write` (No high memory usage).
- **Idempotency:** Handles duplicate chunk uploads gracefully without corrupting the file.
- **Crash Recovery:** Stores upload state in MongoDB. If the server restarts, it knows exactly which chunks are missing.
- **ZIP Peeking:** Uses `yauzl` to inspect ZIP contents immediately after upload without extracting the whole archive.
- **Auto Cleanup:** A background job deletes orphaned/incomplete files older than 24 hours.

---

## Tech Stack
- **Frontend:** React + Vite, Axios
- **Backend:** Node.js, Express, fs-extra
- **Database:** MongoDB (Mongoose)
- **Utilities:** Yauzl (ZIP reading), Multer (Handling binary data)

---

##  How to Run Locally

### Prerequisites
- Node.js installed
- MongoDB running locally (or Atlas URI)

### 1. Setup Backend
```bash
cd backend
npm install
node app.js
# Server runs on http://localhost:3000