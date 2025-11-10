# WebRTC Live Streaming - Frontend Implementation Guide

This guide provides step-by-step instructions for implementing the WebRTC live streaming feature in your frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [API Endpoints](#api-endpoints)
4. [WebSocket Connection](#websocket-connection)
5. [Admin Dashboard Implementation](#admin-dashboard-implementation)
6. [Viewer Implementation](#viewer-implementation)
7. [Complete Example](#complete-example)
8. [Error Handling](#error-handling)
9. [Troubleshooting](#troubleshooting)

## Overview

The live streaming feature allows admins to start a WebRTC stream from their browser for an active competition. The stream is then accessible to viewers via a public URL.

**Flow:**
1. Admin selects an active competition and clicks "Start Stream"
2. Frontend calls `POST /api/v1/admin/streams/:competitionId/start`
3. Backend creates a stream room and returns WebSocket connection details
4. Admin's browser connects to WebSocket and initiates WebRTC offer
5. Server handles signaling and broadcasts to viewers
6. Competition is automatically updated with `live_draw_watching_url`

## Prerequisites

### Required Libraries

Install Socket.io client for WebSocket communication:

```bash
npm install socket.io-client
```

### Browser Compatibility

- Modern browsers with WebRTC support (Chrome, Firefox, Safari, Edge)
- HTTPS required for production (WebRTC requires secure context)
- Camera/microphone permissions required for streaming

## API Endpoints

### Base URL
```
{{base_url}}/api/v1/admin
```

### Authentication
All endpoints require admin authentication:
```
Authorization: Bearer <admin_access_token>
```

### 1. Start Stream
**Endpoint:** `POST /streams/:competitionId/start`

**Request:**
```javascript
const response = await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "message": "Stream started successfully",
  "data": {
    "stream": {
      "roomId": "uuid-room-id",
      "streamUrl": "http://localhost:5000/stream/competition-id",
      "websocketUrl": "ws://localhost:5000/socket.io",
      "rtcConfig": {
        "iceServers": [
          { "urls": "stun:stun.l.google.com:19302" }
        ]
      }
    },
    "competition": {
      "_id": "competition-id",
      "live_draw_watching_url": "http://localhost:5000/stream/competition-id",
      ...
    }
  }
}
```

### 2. Stop Stream
**Endpoint:** `POST /streams/:competitionId/stop`

**Request:**
```javascript
const response = await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/stop`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Get Stream Status
**Endpoint:** `GET /streams/:competitionId/status`

**Request:**
```javascript
const response = await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/status`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## WebSocket Connection

### Connection Setup

```javascript
import { io } from 'socket.io-client';

// Get WebSocket URL from backend (usually same as API base URL)
const wsUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Connect to Socket.io server
const socket = io(wsUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection event handlers
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});
```

### Join Stream Room

```javascript
// Join as admin (when starting stream)
socket.emit('stream:join', {
  roomId: streamData.roomId,
  role: 'admin',
  competitionId: competitionId
});

// Join as viewer (when watching stream)
socket.emit('stream:join', {
  roomId: streamRoomId, // Get from competition.live_draw_watching_url or API
  role: 'viewer',
  competitionId: competitionId
});

// Listen for join confirmation
socket.on('stream:joined', (data) => {
  console.log('Joined stream room:', data);
  // data: { roomId, role: 'admin' | 'viewer' }
});
```

## Admin Dashboard Implementation

### Step 1: Create Stream Manager Hook/Service

```javascript
// hooks/useStreamManager.js or services/streamService.js
import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useStreamManager = (competitionId, accessToken) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIdRef = useRef(null);

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Initialize WebSocket connection
  const initializeSocket = () => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('stream:error', (error) => {
      console.error('Stream error:', error);
      setError(error.message);
    });

    socketRef.current = socket;
    return socket;
  };

  // Start streaming
  const startStream = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Call API to start stream
      const response = await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to start stream');
      }

      const { stream } = result.data;
      roomIdRef.current = stream.roomId;

      // 2. Initialize WebSocket
      const socket = initializeSocket();

      // 3. Join stream room as admin
      socket.emit('stream:join', {
        roomId: stream.roomId,
        role: 'admin',
        competitionId
      });

      // 4. Wait for join confirmation
      await new Promise((resolve) => {
        socket.once('stream:joined', (data) => {
          if (data.role === 'admin') {
            resolve();
          }
        });
      });

      // 5. Get user media (camera/microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;

      // 6. Create RTCPeerConnection
      const rtcConfig = stream.rtcConfig;
      const peerConnection = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('stream:ice-candidate', {
            roomId: stream.roomId,
            candidate: event.candidate
          });
        }
      };

      // Handle ICE connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setIsStreaming(true);
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
          setIsStreaming(false);
        }
      };

      // 7. Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('stream:offer', {
        roomId: stream.roomId,
        offer: peerConnection.localDescription
      });

      // 8. Listen for answer from server/viewers
      socket.on('stream:answer', async (data) => {
        if (data.from !== socket.id) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      // 9. Listen for ICE candidates from viewers
      socket.on('stream:ice-candidate', async (data) => {
        if (data.from !== socket.id && data.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      peerConnectionRef.current = peerConnection;
      setStreamStatus(result.data);
      setIsStreaming(true);
      setLoading(false);

    } catch (err) {
      console.error('Error starting stream:', err);
      setError(err.message);
      setLoading(false);
      setIsStreaming(false);
    }
  };

  // Stop streaming
  const stopStream = async () => {
    try {
      setLoading(true);

      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Emit stop event
      if (socketRef.current && roomIdRef.current) {
        socketRef.current.emit('stream:stop', {
          roomId: roomIdRef.current
        });
      }

      // Call API to stop stream
      await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      setIsStreaming(false);
      setStreamStatus(null);
      roomIdRef.current = null;
      setLoading(false);

    } catch (err) {
      console.error('Error stopping stream:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    isStreaming,
    streamStatus,
    error,
    loading,
    startStream,
    stopStream
  };
};
```

### Step 2: Create Admin Stream Component

```javascript
// components/AdminStreamControl.jsx
import React, { useRef, useEffect } from 'react';
import { useStreamManager } from '../hooks/useStreamManager';

const AdminStreamControl = ({ competitionId, accessToken }) => {
  const {
    isStreaming,
    streamStatus,
    error,
    loading,
    startStream,
    stopStream
  } = useStreamManager(competitionId, accessToken);

  const videoRef = useRef(null);

  // Display local video stream
  useEffect(() => {
    if (isStreaming && videoRef.current) {
      // Get local stream from the hook (you'll need to expose it)
      // For now, this is a placeholder - you'll need to get the stream from useStreamManager
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error('Error accessing media:', err));
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [isStreaming]);

  return (
    <div className="stream-control">
      <h3>Live Stream Control</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="video-preview">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', maxWidth: '640px' }}
        />
      </div>

      <div className="stream-actions">
        {!isStreaming ? (
          <button
            onClick={startStream}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Starting...' : 'Start Stream'}
          </button>
        ) : (
          <>
            <button
              onClick={stopStream}
              disabled={loading}
              className="btn btn-danger"
            >
              {loading ? 'Stopping...' : 'Stop Stream'}
            </button>
            {streamStatus && (
              <div className="stream-info">
                <p>Stream URL: {streamStatus.stream.streamUrl}</p>
                <p>Status: Live</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStreamControl;
```

### Step 3: Integration in Admin Dashboard

```javascript
// pages/AdminCompetitionPage.jsx or similar
import React from 'react';
import AdminStreamControl from '../components/AdminStreamControl';

const AdminCompetitionPage = ({ competition }) => {
  const accessToken = localStorage.getItem('accessToken'); // or from your auth context

  // Only show stream control for active competitions
  const canStream = competition.status === 'active';

  return (
    <div>
      <h1>{competition.title}</h1>
      <p>Status: {competition.status}</p>
      
      {canStream && (
        <AdminStreamControl
          competitionId={competition._id}
          accessToken={accessToken}
        />
      )}
      
      {competition.live_draw_watching_url && (
        <div className="stream-link">
          <p>Live Stream URL: {competition.live_draw_watching_url}</p>
        </div>
      )}
    </div>
  );
};
```

## Viewer Implementation

### Step 1: Create Viewer Stream Hook

```javascript
// hooks/useViewerStream.js
import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useViewerStream = (competitionId, streamRoomId, accessToken) => {
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);

  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const videoRef = useRef(null);

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!streamRoomId) return;

    // Initialize WebSocket
    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('Viewer connected');
      
      // Join stream room as viewer
      socket.emit('stream:join', {
        roomId: streamRoomId,
        role: 'viewer',
        competitionId
      });
    });

    socket.on('stream:joined', (data) => {
      if (data.role === 'viewer') {
        setIsConnected(true);
        initializePeerConnection(socket, streamRoomId);
      }
    });

    socket.on('stream:offer', async (data) => {
      if (data.from !== socket.id) {
        await handleOffer(data.offer, socket, streamRoomId);
      }
    });

    socket.on('stream:ice-candidate', async (data) => {
      if (data.from !== socket.id && data.candidate && peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    socket.on('stream:stopped', () => {
      setError('Stream has been stopped');
      setIsConnected(false);
      cleanup();
    });

    socket.on('stream:viewer-join', (data) => {
      setViewerCount(data.viewerCount);
    });

    socket.on('stream:viewer-leave', (data) => {
      setViewerCount(data.viewerCount);
    });

    socketRef.current = socket;

    return () => {
      cleanup();
      socket.disconnect();
    };
  }, [streamRoomId, competitionId]);

  const initializePeerConnection = (socket, roomId) => {
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(rtcConfig);

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('stream:ice-candidate', {
          roomId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Viewer connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        setError('Connection failed');
      }
    };

    peerConnectionRef.current = peerConnection;
  };

  const handleOffer = async (offer, socket, roomId) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit('stream:answer', {
        roomId,
        answer: peerConnectionRef.current.localDescription
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      setError('Failed to connect to stream');
    }
  };

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setRemoteStream(null);
  };

  return {
    isConnected,
    remoteStream,
    error,
    viewerCount,
    videoRef
  };
};
```

### Step 2: Create Viewer Component

```javascript
// components/StreamViewer.jsx
import React from 'react';
import { useViewerStream } from '../hooks/useViewerStream';

const StreamViewer = ({ competition }) => {
  const streamRoomId = competition.stream_room_id; // or extract from live_draw_watching_url
  const accessToken = localStorage.getItem('accessToken'); // optional for public streams

  const {
    isConnected,
    remoteStream,
    error,
    viewerCount,
    videoRef
  } = useViewerStream(competition._id, streamRoomId, accessToken);

  if (!competition.live_draw_watching_url) {
    return (
      <div className="stream-viewer">
        <p>No live stream available</p>
      </div>
    );
  }

  return (
    <div className="stream-viewer">
      <h3>Live Stream: {competition.title}</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!isConnected && !error && (
        <div className="loading">
          Connecting to stream...
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls
          style={{ width: '100%', maxWidth: '1280px' }}
        />
      </div>

      {isConnected && (
        <div className="stream-info">
          <p>Viewers: {viewerCount}</p>
          <p>Status: Live</p>
        </div>
      )}
    </div>
  );
};

export default StreamViewer;
```

## Complete Example

### React Component with Full Implementation

```javascript
// components/CompleteStreamExample.jsx
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const CompleteStreamExample = ({ competitionId, accessToken, isAdmin = false }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Start stream (Admin only)
  const handleStartStream = async () => {
    try {
      // 1. API call to start stream
      const response = await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      const { stream } = result.data;
      setStreamData(stream);

      // 2. Connect WebSocket
      const socket = io(baseUrl);
      socketRef.current = socket;

      socket.on('connect', async () => {
        // 3. Join room
        socket.emit('stream:join', {
          roomId: stream.roomId,
          role: 'admin',
          competitionId
        });

        // 4. Get user media
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = mediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // 5. Create peer connection
        const pc = new RTCPeerConnection(stream.rtcConfig);
        peerConnectionRef.current = pc;

        mediaStream.getTracks().forEach(track => {
          pc.addTrack(track, mediaStream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('stream:ice-candidate', {
              roomId: stream.roomId,
              candidate: event.candidate
            });
          }
        };

        // 6. Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('stream:offer', {
          roomId: stream.roomId,
          offer: pc.localDescription
        });

        socket.on('stream:answer', async (data) => {
          if (data.from !== socket.id) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });

        socket.on('stream:ice-candidate', async (data) => {
          if (data.from !== socket.id && data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        });

        setIsStreaming(true);
      });

    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    }
  };

  // Stop stream
  const handleStopStream = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    await fetch(`${baseUrl}/api/v1/admin/streams/${competitionId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    setIsStreaming(false);
    setStreamData(null);
  };

  return (
    <div>
      {isAdmin ? (
        <div>
          <h3>Admin Stream Control</h3>
          {!isStreaming ? (
            <button onClick={handleStartStream}>Start Stream</button>
          ) : (
            <button onClick={handleStopStream}>Stop Stream</button>
          )}
          <video ref={localVideoRef} autoPlay muted playsInline />
        </div>
      ) : (
        <div>
          <h3>Viewer Stream</h3>
          <video ref={remoteVideoRef} autoPlay playsInline controls />
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default CompleteStreamExample;
```

## Error Handling

### Common Errors and Solutions

1. **"Competition not found"**
   - Verify the competition ID is correct
   - Ensure the competition exists in the database

2. **"Streaming can only be started for active competitions"**
   - Check competition status before allowing stream start
   - Only show "Start Stream" button for competitions with `status === 'active'`

3. **"Failed to get user media"**
   - Request camera/microphone permissions
   - Check browser permissions settings
   - Ensure HTTPS in production

4. **WebSocket connection errors**
   - Verify WebSocket URL is correct
   - Check CORS settings on backend
   - Ensure Socket.io server is running

5. **WebRTC connection failures**
   - Check STUN/TURN server configuration
   - Verify firewall/NAT settings
   - Test with different networks

### Error Handling Best Practices

```javascript
// Wrap stream operations in try-catch
try {
  await startStream();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // User denied camera/microphone permission
    showError('Camera and microphone access is required for streaming');
  } else if (error.name === 'NotFoundError') {
    // No camera/microphone found
    showError('No camera or microphone found');
  } else {
    // Other errors
    showError(error.message || 'Failed to start stream');
  }
}
```

## Troubleshooting

### Issue: Stream doesn't start
- **Check:** Browser console for errors
- **Check:** Network tab for API/WebSocket requests
- **Check:** Camera/microphone permissions
- **Solution:** Ensure HTTPS in production, check CORS settings

### Issue: Viewers can't see stream
- **Check:** Stream room ID is correct
- **Check:** WebSocket connection is established
- **Check:** WebRTC offer/answer exchange
- **Solution:** Verify STUN server is accessible, check firewall

### Issue: Connection drops frequently
- **Check:** Network stability
- **Check:** TURN server configuration (if behind strict NAT)
- **Solution:** Implement reconnection logic, add TURN server

### Issue: Audio/video quality issues
- **Check:** Network bandwidth
- **Check:** Camera/microphone quality
- **Solution:** Adjust video constraints, implement quality adaptation

## Additional Resources

- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.io Client Documentation](https://socket.io/docs/v4/client-api/)
- [RTCPeerConnection API](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)

## Support

For backend API issues, refer to the main API documentation or contact the backend team.

For frontend implementation questions, refer to this guide or contact the frontend lead.

