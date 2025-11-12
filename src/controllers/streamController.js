const Competition = require('../models/Competition');
const streamingService = require('../services/streamingService');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Get stream information for viewing (HTML page)
 * GET /stream/:competitionId
 */
const getStreamInfo = async (req, res) => {
  try {
    const { competitionId } = req.params;

    // Generate nonce for CSP (more secure than unsafe-inline)
    const nonce = crypto.randomBytes(16).toString('base64');

    // Set Content Security Policy headers for stream viewer
    // This allows Socket.io CDN, inline scripts (via nonce), WebSocket connections, and media streams
    const cspHeader = [
      "script-src 'self' https://cdn.socket.io 'nonce-" + nonce + "'",
      "connect-src 'self' ws://* wss://* http://* https://*",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "default-src 'self'"
    ].join('; ');

    res.setHeader('Content-Security-Policy', cspHeader);

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Stream Not Found</title></head>
        <body>
          <h1>Competition not found</h1>
          <p>The competition you're looking for does not exist.</p>
        </body>
        </html>
      `);
    }

    // Check if stream is active
    const streamStatus = streamingService.getStreamStatus(competitionId);

    if (!streamStatus || !streamStatus.isActive) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Stream Not Active</title></head>
        <body>
          <h1>Stream is not currently active</h1>
          <p>The live stream for "${competition.title}" is not currently active.</p>
        </body>
        </html>
      `);
    }

    // Get WebRTC configuration
    const rtcConfig = streamingService.getRTCConfiguration();

    // Get base URL for WebSocket connection
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || 
      `${req.protocol}://${req.get('host')}`;
    const websocketUrl = baseUrl.replace(/^http/, 'ws');

    // Generate HTML page with stream viewer
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Stream - ${competition.title}</title>
    <script src="https://cdn.socket.io/4.7.0/socket.io.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #000;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1280px;
            width: 100%;
        }
        h1 {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .video-container {
            position: relative;
            width: 100%;
            background: #111;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 16/9;
        }
        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
        }
        .status {
            text-align: center;
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }
        .status.live {
            color: #ff4444;
        }
        .status.connecting {
            color: #ffaa00;
        }
        .status.error {
            color: #ff4444;
        }
        .viewer-count {
            margin-top: 10px;
            font-size: 14px;
            opacity: 0.8;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 18px;
            color: #fff;
        }
        .error-message {
            color: #ff4444;
            text-align: center;
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 68, 68, 0.1);
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${competition.title}</h1>
        <div class="video-container">
            <video id="remoteVideo" autoplay playsinline controls></video>
            <div id="loading" class="loading">Connecting to stream...</div>
        </div>
        <div id="status" class="status connecting">Connecting...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <script nonce="${nonce}">
        const competitionId = '${competitionId}';
        const roomId = '${streamStatus.roomId}';
        const websocketUrl = '${websocketUrl}';
        const rtcConfig = ${JSON.stringify(rtcConfig)};

        const videoElement = document.getElementById('remoteVideo');
        const statusElement = document.getElementById('status');
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');

        let socket = null;
        let peerConnection = null;

        function updateStatus(message, className = '') {
            statusElement.textContent = message;
            statusElement.className = 'status ' + className;
        }

        function showError(message) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            loadingElement.style.display = 'none';
            updateStatus('Connection Failed', 'error');
        }

        function initializeSocket() {
            socket = io(websocketUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });

            socket.on('connect', () => {
                console.log('WebSocket connected');
                socket.emit('stream:join', {
                    roomId: roomId,
                    role: 'viewer',
                    competitionId: competitionId
                });
            });

            socket.on('stream:joined', (data) => {
                if (data.role === 'viewer') {
                    console.log('✅ Joined as viewer, initializing peer connection...');
                    initializePeerConnection();
                    
                    // Request offer if not received within 2 seconds
                    setTimeout(() => {
                        if (peerConnection && peerConnection.signalingState === 'stable') {
                            console.log('📤 Requesting offer from admin...');
                            socket.emit('stream:request-offer', {
                                roomId: roomId
                            });
                        }
                    }, 2000);
                }
            });

            socket.on('stream:offer', async (data) => {
                console.log('📥 Received offer from admin');
                
                if (!peerConnection) {
                    console.error('❌ Peer connection not initialized!');
                    return;
                }
                
                if (data.from !== socket.id) {
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        console.log('✅ Set remote description');
                        
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        console.log('✅ Created answer');
                        
                        socket.emit('stream:answer', {
                            roomId: roomId,
                            answer: peerConnection.localDescription
                        });
                        console.log('✅ Sent answer to admin');
                    } catch (error) {
                        console.error('❌ Error handling offer:', error);
                        showError('Failed to connect to stream');
                    }
                }
            });

            socket.on('stream:ice-candidate', async (data) => {
                if (data.from !== socket.id && data.candidate && peerConnection) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                        console.log('✅ Added ICE candidate');
                    } catch (error) {
                        console.error('❌ Error adding ICE candidate:', error);
                    }
                }
            });
            
            socket.on('stream:request-offer-response', async (data) => {
                if (data.offer && peerConnection) {
                    console.log('📥 Received offer in response to request');
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        console.log('✅ Set remote description');
                        
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        console.log('✅ Created answer');
                        
                        socket.emit('stream:answer', {
                            roomId: roomId,
                            answer: peerConnection.localDescription
                        });
                        console.log('✅ Sent answer to admin');
                    } catch (error) {
                        console.error('❌ Error handling offer:', error);
                        showError('Failed to connect to stream');
                    }
                }
            });

            socket.on('stream:stopped', () => {
                showError('Stream has been stopped');
            });

            socket.on('stream:viewer-join', (data) => {
                const viewerText = data.viewerCount === 1 ? 'viewer' : 'viewers';
                updateStatus('Live - ' + data.viewerCount + ' ' + viewerText, 'live');
            });

            socket.on('stream:viewer-leave', (data) => {
                const viewerText = data.viewerCount === 1 ? 'viewer' : 'viewers';
                updateStatus('Live - ' + data.viewerCount + ' ' + viewerText, 'live');
            });

            socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                showError('Failed to connect to server');
            });

            socket.on('stream:error', (error) => {
                console.error('Stream error:', error);
                showError(error.message || 'Stream error occurred');
            });
        }

        function initializePeerConnection() {
            console.log('🔧 Initializing peer connection...');
            peerConnection = new RTCPeerConnection(rtcConfig);
            
            // Store globally for debugging
            window.peerConnection = peerConnection;

            peerConnection.ontrack = (event) => {
                console.log('✅ Received video track!');
                const stream = event.streams[0];
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.play().catch(err => {
                        console.error('Error playing video:', err);
                    });
                    loadingElement.style.display = 'none';
                    updateStatus('Live', 'live');
                }
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    console.log('📤 Sending ICE candidate');
                    socket.emit('stream:ice-candidate', {
                        roomId: roomId,
                        candidate: event.candidate
                    });
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnection.iceConnectionState);
                if (peerConnection.iceConnectionState === 'connected' || 
                    peerConnection.iceConnectionState === 'completed') {
                    console.log('✅ ICE connection established');
                } else if (peerConnection.iceConnectionState === 'failed') {
                    console.error('❌ ICE connection failed');
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
                if (peerConnection.connectionState === 'connected') {
                    console.log('✅ WebRTC connected!');
                    updateStatus('Live', 'live');
                } else if (peerConnection.connectionState === 'failed' || 
                          peerConnection.connectionState === 'disconnected') {
                    console.error('❌ WebRTC connection failed');
                    showError('Connection lost. Please refresh the page.');
                }
            };
            
            peerConnection.onsignalingstatechange = () => {
                console.log('Signaling state:', peerConnection.signalingState);
            };
        }

        // Start connection
        initializeSocket();

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (peerConnection) {
                peerConnection.close();
            }
            if (socket) {
                socket.disconnect();
            }
        });
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Failed to get stream info', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>Error loading stream</h1>
        <p>${error.message || 'An error occurred while loading the stream.'}</p>
      </body>
      </html>
    `);
  }
};

/**
 * Get stream information as JSON (for API access)
 * GET /api/v1/streams/:competitionId
 */
const getStreamInfoJSON = async (req, res) => {
  try {
    const { competitionId } = req.params;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Check if stream is active
    const streamStatus = streamingService.getStreamStatus(competitionId);

    if (!streamStatus || !streamStatus.isActive) {
      return res.error('Stream is not currently active', 404);
    }

    // Get WebRTC configuration
    const rtcConfig = streamingService.getRTCConfiguration();

    // Get base URL for WebSocket connection
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || 
      `${req.protocol}://${req.get('host')}`;
    const websocketUrl = baseUrl.replace(/^http/, 'ws');

    res.success('Stream information retrieved successfully', {
      competition: {
        _id: competition._id,
        title: competition.title,
        draw_time: competition.draw_time,
      },
      stream: {
        roomId: streamStatus.roomId,
        websocketUrl: `${websocketUrl}/socket.io`,
        rtcConfig,
        isActive: streamStatus.isActive,
        viewerCount: streamStatus.viewerCount || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get stream info', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.error(error.message || 'Failed to get stream information', 500);
  }
};

module.exports = {
  getStreamInfo,
  getStreamInfoJSON,
};

