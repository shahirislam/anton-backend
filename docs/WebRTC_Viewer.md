# Viewer Stream Connection Fix Guide

## Problem
Viewer connects to WebSocket and joins the room, but doesn't receive the video stream. The page shows "Connecting to Stream" indefinitely.

## Root Cause
The viewer page (on the backend) is not properly handling the WebRTC offer/answer exchange. The admin sends an offer when the stream starts, but if a viewer joins after the offer was sent, they won't receive it unless the backend re-broadcasts it.

## Solution for Backend Viewer Page

The backend viewer page needs to implement the following:

### 1. Initialize Peer Connection When Joining

```javascript
socket.on('stream:joined', (data) => {
  if (data.role === 'viewer') {
    console.log('Joined as viewer, initializing peer connection...');
    
    // Initialize peer connection
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('✅ Received video track!');
      const stream = event.streams[0];
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
        // Update UI to show video instead of "Connecting to Stream"
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('stream:ice-candidate', {
          roomId: streamRoomId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log('✅ WebRTC connected!');
      } else if (peerConnection.connectionState === 'failed') {
        console.error('❌ WebRTC connection failed');
      }
    };
    
    // Store peer connection
    window.peerConnection = peerConnection;
    
    // Request offer if not received within 2 seconds
    setTimeout(() => {
      if (peerConnection.signalingState === 'stable') {
        console.log('Requesting offer from admin...');
        socket.emit('stream:request-offer', {
          roomId: streamRoomId
        });
      }
    }, 2000);
  }
});
```

### 2. Handle Incoming Offers

```javascript
socket.on('stream:offer', async (data) => {
  console.log('📥 Received offer from admin');
  
  if (!window.peerConnection) {
    console.error('Peer connection not initialized!');
    return;
  }
  
  try {
    // Set remote description (the offer)
    await window.peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    console.log('✅ Set remote description');
    
    // Create answer
    const answer = await window.peerConnection.createAnswer();
    await window.peerConnection.setLocalDescription(answer);
    console.log('✅ Created answer');
    
    // Send answer back to admin
    socket.emit('stream:answer', {
      roomId: data.roomId,
      answer: window.peerConnection.localDescription
    });
    console.log('✅ Sent answer to admin');
    
  } catch (error) {
    console.error('❌ Error handling offer:', error);
  }
});
```

### 3. Handle ICE Candidates

```javascript
socket.on('stream:ice-candidate', async (data) => {
  if (data.from !== socket.id && data.candidate && window.peerConnection) {
    try {
      await window.peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
      console.log('✅ Added ICE candidate');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }
});
```

### 4. Complete Viewer Implementation

```javascript
// Complete viewer implementation
const streamRoomId = '584f16de-9660-4453-9244-0012269ed9a3'; // From URL
const competitionId = '...'; // From URL or API

const socket = io('https://anton-backend.onrender.com', {
  transports: ['websocket', 'polling'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('WebSocket connected');
  
  // Join stream room as viewer
  socket.emit('stream:join', {
    roomId: streamRoomId,
    role: 'viewer',
    competitionId: competitionId
  });
});

socket.on('stream:joined', async (data) => {
  if (data.role === 'viewer') {
    console.log('Joined as viewer');
    
    // Initialize peer connection
    const rtcConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    window.peerConnection = peerConnection;
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('✅ Received video track!');
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.srcObject = event.streams[0];
        videoElement.play();
        // Hide "Connecting to Stream" message
        document.querySelector('.connecting-message')?.remove();
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('stream:ice-candidate', {
          roomId: streamRoomId,
          candidate: event.candidate
        });
      }
    };
    
    // Request offer if not received
    setTimeout(() => {
      if (peerConnection.signalingState === 'stable') {
        socket.emit('stream:request-offer', { roomId: streamRoomId });
      }
    }, 2000);
  }
});

socket.on('stream:offer', async (data) => {
  console.log('📥 Received offer');
  
  if (!window.peerConnection) {
    console.error('Peer connection not initialized!');
    return;
  }
  
  try {
    await window.peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    
    const answer = await window.peerConnection.createAnswer();
    await window.peerConnection.setLocalDescription(answer);
    
    socket.emit('stream:answer', {
      roomId: data.roomId,
      answer: window.peerConnection.localDescription
    });
    
    console.log('✅ Sent answer');
  } catch (error) {
    console.error('❌ Error handling offer:', error);
  }
});

socket.on('stream:ice-candidate', async (data) => {
  if (data.from !== socket.id && data.candidate && window.peerConnection) {
    try {
      await window.peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }
});
```

## Testing Checklist

1. ✅ Admin starts stream - should see offer created and sent
2. ✅ Viewer joins - should see "Joined as viewer" in console
3. ✅ Viewer receives offer - should see "Received offer" in console
4. ✅ Viewer creates answer - should see "Created answer" in console
5. ✅ Viewer sends answer - should see "Sent answer" in console
6. ✅ Admin receives answer - should see "Received answer" in admin console
7. ✅ ICE candidates exchanged - should see multiple ICE candidate messages
8. ✅ Video track received - should see "Received video track" and video should play

## Debugging Commands

In the viewer page console, run:

```javascript
// Check if peer connection exists
console.log('Peer connection:', window.peerConnection);

// Check connection state
if (window.peerConnection) {
  console.log('Signaling state:', window.peerConnection.signalingState);
  console.log('ICE connection state:', window.peerConnection.iceConnectionState);
  console.log('Connection state:', window.peerConnection.connectionState);
}

// Check if video element exists
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video srcObject:', video?.srcObject);
```

## Expected Console Output (Viewer)

```
WebSocket connected
Joined as viewer
📥 Received offer
✅ Set remote description
✅ Created answer
✅ Sent answer
✅ Added ICE candidate (multiple times)
✅ Received video track!
```

## Common Issues

1. **No offer received**: Backend not broadcasting offers to new viewers
   - Solution: Implement `stream:request-offer` handler or backend should re-broadcast on viewer join

2. **Peer connection not initialized**: `stream:joined` handler not setting up peer connection
   - Solution: Initialize peer connection in `stream:joined` handler

3. **Video not playing**: `ontrack` event not firing or video element not updated
   - Solution: Ensure `ontrack` handler sets `video.srcObject` and calls `video.play()`

4. **ICE connection fails**: Network/firewall issues
   - Solution: Check STUN server accessibility, may need TURN server

