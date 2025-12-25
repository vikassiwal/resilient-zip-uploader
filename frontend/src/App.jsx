import React, { useState, useRef } from 'react';
import { UploadManager } from './utils/UploadManager'; 


function App() {
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState({ percent: 0, speed: 0, eta: 0 });
  const [chunkStatus, setChunkStatus] = useState({});
  const [status, setStatus] = useState('IDLE'); 
  
  // File Input ko reset karne ke liye Reference
  const fileInputRef = useRef(null);

  const handleStart = () => {
    if (!file) return;
    setStatus('UPLOADING');

    const uploader = new UploadManager(file, {
      onChunkStatus: (index, status) => {
        setChunkStatus(prev => ({ ...prev, [index]: status }));
      },
      onProgress: (data) => {
        setStats(data);
      },
      onComplete: () => {
        setStatus('COMPLETED');
        setStats({ percent: 100, speed: 0, eta: 0 });
      }
    });

    uploader.start();
  };

  //  Reset Everything
  const handleReset = () => {
    setFile(null);
    setStats({ percent: 0, speed: 0, eta: 0 });
    setChunkStatus({});
    setStatus('IDLE');
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Input field clear karein
    }
  };

  const totalChunks = file ? Math.ceil(file.size / (5 * 1024 * 1024)) : 0;

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <h1> Resumable ZIP Uploader</h1>
      
      {/* Upload Box */}
      <div style={{ marginBottom: '20px', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
        
        {/* Agar Completed hai to SUCCESS dikhaye, nahi to Input dikhaye */}
        {status === 'COMPLETED' ? (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: 'green', margin: '0 0 10px 0' }}>✅ Upload Successful!</h2>
            <p>Your file <strong>{file?.name}</strong> has been uploaded.</p>
            
            <button 
              onClick={handleReset}
              style={{ 
                marginTop: '15px',
                padding: '10px 20px', 
                cursor: 'pointer',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              Upload Another File
            </button>
          </div>
        ) : (
          <>
            <input 
              type="file" 
              ref={fileInputRef} // Ref joda gaya
              onChange={(e) => setFile(e.target.files[0])} 
              disabled={status === 'UPLOADING'}
            />
            
            <button 
              onClick={handleStart} 
              disabled={!file || status === 'UPLOADING'}
              style={{ 
                marginLeft: '10px', 
                padding: '10px 20px', 
                cursor: status === 'UPLOADING' ? 'not-allowed' : 'pointer',
                backgroundColor: status === 'UPLOADING' ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              {status === 'UPLOADING' ? 'Uploading...' : 'Start Upload'}
            </button>
          </>
        )}
      </div>

      {/* Stats Display */}
      {status !== 'IDLE' && (
        <>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Status: {status}</span>
            <div style={{ textAlign: 'right', fontSize: '14px', color: '#555' }}>
              <div>Speed: {stats.speed} MB/s</div>
              <div>ETA: {stats.eta} sec</div>
            </div>
          </div>

          <div style={{ width: '100%', height: '25px', backgroundColor: '#e0e0e0', marginTop: '10px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: `${stats.percent}%`, 
              height: '100%', 
              backgroundColor: status === 'COMPLETED' ? '#4caf50' : '#2196f3', 
              transition: 'width 0.3s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {stats.percent}%
            </div>
          </div>

          <h3 style={{marginTop: '30px'}}>Chunk Map</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(12px, 1fr))', 
            gap: '2px', 
            marginTop: '10px',
            padding: '10px',
            border: '1px solid #eee'
          }}>
            {Array.from({ length: totalChunks }).map((_, i) => {
              const s = chunkStatus[i];
              let color = '#f0f0f0'; 
              if (s === 'UPLOADING') color = '#ffa500'; 
              if (s === 'SUCCESS') color = '#4caf50'; 
              if (s === 'ERROR') color = '#f44336'; 

              return (
                <div 
                  key={i} 
                  style={{ width: '100%', aspectRatio: '1/1', backgroundColor: color, borderRadius: '2px' }} 
                  title={`Chunk ${i}: ${s || 'Pending'}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default App;