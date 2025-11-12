const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const Competition = require('../models/Competition');

class StreamingService {
  constructor() {
    this.io = null;
    this.activeStreams = new Map(); // competitionId -> streamInfo
    this.rooms = new Map(); // roomId -> { competitionId, adminSocketId, viewers: Set }
  }

  /**
   * Initialize Socket.io server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      // Handle stream room join
      socket.on('stream:join', (data) => {
        this.handleStreamJoin(socket, data);
      });

      // Handle WebRTC offer from admin
      socket.on('stream:offer', (data) => {
        this.handleStreamOffer(socket, data);
      });

      // Handle WebRTC answer from viewer
      socket.on('stream:answer', (data) => {
        this.handleStreamAnswer(socket, data);
      });

      // Handle ICE candidate
      socket.on('stream:ice-candidate', (data) => {
        this.handleIceCandidate(socket, data);
      });

      // Handle stream stop
      socket.on('stream:stop', (data) => {
        this.handleStreamStop(socket, data);
      });

      // Handle request for offer (viewer requests offer from admin)
      socket.on('stream:request-offer', (data) => {
        this.handleRequestOffer(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message });
      });
    });

    logger.info('Streaming service initialized');
  }

  /**
   * Handle stream room join
   */
  handleStreamJoin(socket, data) {
    const { roomId, role, competitionId } = data;

    if (!roomId) {
      socket.emit('stream:error', { message: 'Room ID is required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('stream:error', { message: 'Stream room not found' });
      return;
    }

    socket.join(roomId);

    if (role === 'admin') {
      room.adminSocketId = socket.id;
      logger.info('Admin joined stream room', { roomId, competitionId, socketId: socket.id });
      socket.emit('stream:joined', { roomId, role: 'admin' });
    } else if (role === 'viewer') {
      if (!room.viewers) {
        room.viewers = new Set();
      }
      room.viewers.add(socket.id);
      logger.info('Viewer joined stream room', { roomId, competitionId, socketId: socket.id });
      socket.emit('stream:joined', { roomId, role: 'viewer' });

      // Notify admin that a viewer joined
      if (room.adminSocketId) {
        this.io.to(room.adminSocketId).emit('stream:viewer-join', {
          viewerId: socket.id,
          viewerCount: room.viewers.size,
        });
      }
    }
  }

  /**
   * Handle WebRTC offer from admin
   */
  handleStreamOffer(socket, data) {
    const { roomId, offer, targetViewerId } = data;

    if (!roomId || !offer || !targetViewerId) {
      socket.emit('stream:error', { message: 'Room ID, offer, and targetViewerId are required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room || room.adminSocketId !== socket.id) {
      socket.emit('stream:error', { message: 'Unauthorized or room not found' });
      return;
    }

    // Store the offer for late-joining viewers if needed, though targeted sending is preferred
    room.lastOffer = offer;

    // Send offer to the specific target viewer
    this.io.to(targetViewerId).emit('stream:offer', { offer, from: socket.id, roomId });

    logger.info('Stream offer sent to specific viewer', { roomId, from: socket.id, targetViewerId });
  }

  /**
   * Handle WebRTC answer from viewer
   */
  handleStreamAnswer(socket, data) {
    const { roomId, answer } = data;

    if (!roomId || !answer) {
      socket.emit('stream:error', { message: 'Room ID and answer are required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('stream:error', { message: 'Stream room not found' });
      return;
    }

    // Send answer to admin
    if (room.adminSocketId) {
      this.io.to(room.adminSocketId).emit('stream:answer', {
        answer,
        from: socket.id,
      });
      logger.info('Stream answer forwarded to admin', { roomId, from: socket.id });
    }
  }

  /**
   * Handle ICE candidate exchange
   */
  handleIceCandidate(socket, data) {
    const { roomId, candidate, target } = data;

    if (!roomId || !candidate) {
      socket.emit('stream:error', { message: 'Room ID and candidate are required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('stream:error', { message: 'Stream room not found' });
      return;
    }

    const isAdmin = room.adminSocketId === socket.id;

    if (isAdmin) {
      // Admin is sending a candidate to a specific viewer
      if (!target) {
        socket.emit('stream:error', { message: 'Target viewer ID is required for admin candidates' });
        return;
      }
      this.io.to(target).emit('stream:ice-candidate', {
        candidate,
        from: socket.id,
      });
      logger.debug('ICE candidate forwarded from admin to viewer', { roomId, from: socket.id, target });
    } else {
      // Viewer is sending a candidate to the admin
      if (room.adminSocketId) {
        this.io.to(room.adminSocketId).emit('stream:ice-candidate', {
          candidate,
          from: socket.id,
        });
        logger.debug('ICE candidate forwarded from viewer to admin', { roomId, from: socket.id, target: room.adminSocketId });
      }
    }
  }

  /**
   * Handle stream stop
   */
  async handleStreamStop(socket, data) {
    const { roomId } = data;

    if (!roomId) {
      socket.emit('stream:error', { message: 'Room ID is required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room || room.adminSocketId !== socket.id) {
      socket.emit('stream:error', { message: 'Unauthorized or room not found' });
      return;
    }

    const competitionId = room.competitionId;

    // Notify all viewers
    this.io.to(roomId).emit('stream:stopped', { message: 'Stream has been stopped' });

    // Clean up in-memory state
    this.stopStream(competitionId);

    // Update database to clear stream fields
    try {
      await Competition.findByIdAndUpdate(
        competitionId,
        {
          $set: {
            live_draw_watching_url: null,
            hls_stream_url: null,
            stream_room_id: null,
            stream_started_at: null,
          },
        },
        { new: true }
      );
      logger.info('Database updated after stream stop', { roomId, competitionId });
    } catch (error) {
      logger.error('Failed to update database after stream stop', {
        error: error.message,
        competitionId,
      });
    }

    logger.info('Stream stopped', { roomId, competitionId });
  }

  /**
   * Handle request for offer from viewer
   * When a viewer joins after the admin has already sent an offer,
   * they can request the admin to re-send the offer
   */
  handleRequestOffer(socket, data) {
    const { roomId } = data;

    if (!roomId) {
      socket.emit('stream:error', { message: 'Room ID is required' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('stream:error', { message: 'Stream room not found' });
      return;
    }

    // Check if this is a viewer requesting
    if (room.viewers && room.viewers.has(socket.id)) {
      // If we have a stored offer, send it directly to the viewer
      if (room.lastOffer) {
        socket.emit('stream:request-offer-response', {
          offer: room.lastOffer,
          roomId: roomId,
        });
        logger.info('Sent stored offer to viewer', { roomId, viewerId: socket.id });
      } else if (room.adminSocketId) {
        // No stored offer, notify admin to create and send one
        this.io.to(room.adminSocketId).emit('stream:viewer-request-offer', {
          viewerId: socket.id,
          roomId: roomId,
        });
        logger.info('Viewer requested offer from admin', { roomId, viewerId: socket.id });
      } else {
        socket.emit('stream:error', { message: 'Admin is not connected and no offer available' });
      }
    } else {
      socket.emit('stream:error', { message: 'Only viewers can request offers' });
    }
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(socket) {
    // Find and clean up rooms where this socket was admin or viewer
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.adminSocketId === socket.id) {
        // Admin disconnected, stop the stream
        const competitionId = room.competitionId;
        this.io.to(roomId).emit('stream:stopped', { message: 'Stream ended' });
        this.stopStream(competitionId);
        
        // Update database to clear stream fields
        try {
          await Competition.findByIdAndUpdate(
            competitionId,
            {
              $set: {
                live_draw_watching_url: null,
                hls_stream_url: null,
                stream_room_id: null,
                stream_started_at: null,
              },
            },
            { new: true }
          );
          logger.info('Database updated after admin disconnect', { roomId, competitionId });
        } catch (error) {
          logger.error('Failed to update database after admin disconnect', {
            error: error.message,
            competitionId,
          });
        }
        
        logger.info('Admin disconnected, stream stopped', { roomId, competitionId });
      } else if (room.viewers && room.viewers.has(socket.id)) {
        // Viewer disconnected
        room.viewers.delete(socket.id);
        if (room.adminSocketId) {
          this.io.to(room.adminSocketId).emit('stream:viewer-leave', {
            viewerId: socket.id,
            viewerCount: room.viewers.size,
          });
        }
        logger.debug('Viewer disconnected', { roomId, socketId: socket.id });
      }
    }

    logger.info('WebSocket client disconnected', { socketId: socket.id });
  }

  /**
   * Create a new stream room for a competition
   * @param {string} competitionId - Competition ID
   * @returns {Object} Stream information
   */
  createStream(competitionId) {
    // Check if stream already exists
    if (this.activeStreams.has(competitionId)) {
      const existing = this.activeStreams.get(competitionId);
      return {
        roomId: existing.roomId,
        streamUrl: existing.streamUrl,
        websocketUrl: existing.websocketUrl,
        alreadyExists: true,
      };
    }

    const roomId = uuidv4();
    const streamBaseUrl = process.env.STREAM_BASE_URL || process.env.APP_URL || 'http://localhost:5000';
    const streamUrl = `${streamBaseUrl}/stream/${competitionId}`;
    const websocketUrl = `${streamBaseUrl.replace('http', 'ws')}/socket.io`;

    const streamInfo = {
      roomId,
      competitionId,
      streamUrl,
      websocketUrl,
      createdAt: new Date(),
    };

    this.activeStreams.set(competitionId, streamInfo);
    this.rooms.set(roomId, {
      competitionId,
      adminSocketId: null,
      viewers: new Set(),
      lastOffer: null, // Store last offer to send to late-joining viewers
    });

    logger.info('Stream room created', { roomId, competitionId, streamUrl });

    return {
      roomId,
      streamUrl,
      websocketUrl,
      alreadyExists: false,
    };
  }

  /**
   * Stop a stream for a competition
   * @param {string} competitionId - Competition ID
   */
  stopStream(competitionId) {
    const streamInfo = this.activeStreams.get(competitionId);
    if (!streamInfo) {
      return false;
    }

    const room = this.rooms.get(streamInfo.roomId);
    if (room) {
      // Notify all clients in the room
      this.io.to(streamInfo.roomId).emit('stream:stopped', { message: 'Stream has been stopped' });
      this.rooms.delete(streamInfo.roomId);
    }

    this.activeStreams.delete(competitionId);
    logger.info('Stream stopped and cleaned up', { competitionId, roomId: streamInfo.roomId });

    return true;
  }

  /**
   * Get stream status for a competition
   * @param {string} competitionId - Competition ID
   * @returns {Object|null} Stream information or null
   */
  getStreamStatus(competitionId) {
    const streamInfo = this.activeStreams.get(competitionId);
    if (!streamInfo) {
      return null;
    }

    const room = this.rooms.get(streamInfo.roomId);
    const viewerCount = room && room.viewers ? room.viewers.size : 0;
    const isActive = room && room.adminSocketId !== null;

    return {
      ...streamInfo,
      isActive,
      viewerCount,
    };
  }

  /**
   * Get WebRTC configuration (STUN/TURN servers)
   * @returns {Object} RTCConfiguration
   */
  getRTCConfiguration() {
    const config = {
      iceServers: [],
    };

    // Add STUN server
    const stunServer = process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302';
    config.iceServers.push({ urls: stunServer });

    // Add TURN server if configured
    if (process.env.TURN_SERVER_URL) {
      const turnConfig = {
        urls: process.env.TURN_SERVER_URL,
      };

      if (process.env.TURN_USERNAME) {
        turnConfig.username = process.env.TURN_USERNAME;
      }

      if (process.env.TURN_CREDENTIAL) {
        turnConfig.credential = process.env.TURN_CREDENTIAL;
      }

      config.iceServers.push(turnConfig);
    }

    return config;
  }
}

// Export singleton instance
const streamingService = new StreamingService();

module.exports = streamingService;

