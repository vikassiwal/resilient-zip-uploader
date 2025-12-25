# Resilient Zip Uploader

A robust, fault-tolerant file upload system designed to handle large ZIP files (>1GB) with network resilience, chunked uploading, and automated integrity verification.

**Submitted by:** Vikas Siwal  
**Assignment:** WebDev Assignment - VizExperts


##  Features

### Core Functionality
- **Smart Chunking:** Splits large files into 5MB chunks for efficient uploading.
- **Resumability:** Automatically handles network failures (WiFi disconnects, Refreshes) and resumes uploads from the last successful chunk.
- **Concurrency Control:** Limits parallel chunk uploads (Max 3) to prevent network congestion.

### Backend & Integrity
- **Stream-Based Processing:** Writes chunks directly to disk using streams, keeping memory usage low (RAM efficient).
- **Deep Inspection (Peek):** Lists files inside the ZIP archive using `yauzl` without extracting the full content.
- **Data Integrity:** Calculates **SHA-256 Hash** of the assembled file to verify upload success.
- **Automated Cleanup:** Cron jobs (`node-cron`) automatically delete stale/incomplete fragments older than 24 hours.

### User Interface
- **Visual Grid:** Real-time visualization of chunk status (Pending, Uploading, Success).
- **Live Metrics:** Displays current Upload Speed (MB/s) and Estimated Time of Arrival (ETA).

---

##  Tech Stack

- **Frontend:** React.js (Vite), Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose) for tracking upload state
- **DevOps:** Docker, Docker Compose
- **Libraries:** `fs-extra` (File Ops), `yauzl` (Zip Peek), `node-cron` (Cleanup)

---

## How to Run (Using Docker)

The easiest way to run the application is using Docker Compose. This will set up the Frontend, Backend, and MongoDB database automatically.

### Prerequisites
- Docker Desktop installed and running.

### Steps to Run

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd resilient-zip-uploader

2. **Start the application:**   
    ```bash
    docker-compose up --build
  
3. **Access the Application:**   
    - Frontend (UI): http://localhost:5173
    - Backend API: http://localhost:3000
4. **Stop the application:** 
    ```bash
     docker-compose down

##  Project Structure

```bash
zip-uploader/
├── backend/             # Node.js Express Server
│   ├── src/
│   │   ├── controllers/ # Upload logic (Chunking, Hashing, Peeking)
│   │   ├── models/      # MongoDB Schema
│   │   └── utils/       # Cleanup logic
│   └── storage/         # Stores uploaded files (Mapped Volume)
├── frontend/            # React Vite Client
│   └── src/
│   │   └── utils/       # Upload Manager (Client-side chunking)
└── docker-compose.yml   # Orchestration for Frontend, Backend & Mongo

