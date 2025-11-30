const NodeMediaServer = require('node-media-server');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class MediaServerService {
  constructor() {
    this.nms = null;
    this.initialized = false;
    this.rtmpPort = parseInt(process.env.RTMP_PORT || '1935', 10);
    this.httpPort = parseInt(process.env.MEDIA_SERVER_HTTP_PORT || '8000', 10);
    this.mediaRoot = path.join(__dirname, '../../media');
  }

  /**
   * Initialize Node Media Server
   */
  initialize() {
    try {
      // Create media directory if it doesn't exist
      if (!fs.existsSync(this.mediaRoot)) {
        fs.mkdirSync(this.mediaRoot, { recursive: true });
        logger.info('Created media directory', { path: this.mediaRoot });
      }

      const config = {
        rtmp: {
          port: this.rtmpPort,
          chunk_size: 60000,
          gop_cache: true,
          ping: 30,
          ping_timeout: 60,
        },
        http: {
          port: this.httpPort,
          allow_origin: '*', // Allow CORS for mobile apps
          mediaroot: this.mediaRoot,
        },
        trans: {
          // FFmpeg path - will be auto-detected or set via env
          ffmpeg: process.env.FFMPEG_PATH || this.findFFmpeg(),
          tasks: [
            {
              app: 'live',
              hls: true,
              hlsFlags: '[hls_time=2:hls_list_size=10:hls_flags=delete_segments:hls_segment_type=mpegts]',
              hlsKeep: false, // Don't keep segments after stream ends
              mp4: false, // Don't generate MP4 files
              mp4Flags: '[movflags=frag_keyframe+empty_moov]',
            },
          ],
        },
      };

      this.nms = new NodeMediaServer(config);

      // Event handlers
      this.nms.on('preConnect', (id, args) => {
        logger.info('RTMP client connecting', { id, args });
      });

      this.nms.on('postConnect', (id, args) => {
        logger.info('RTMP client connected', { id });
      });

      this.nms.on('prePublish', (id, StreamPath, args) => {
        logger.info('RTMP stream starting', { id, StreamPath, args });
      });

      this.nms.on('postPublish', (id, StreamPath, args) => {
        logger.info('RTMP stream started', { id, StreamPath });
      });

      this.nms.on('donePublish', (id, StreamPath, args) => {
        logger.info('RTMP stream ended', { id, StreamPath });
      });

      this.nms.on('prePlay', (id, StreamPath, args) => {
        logger.info('HLS stream requested', { id, StreamPath });
      });

      // Start the server
      this.nms.run();
      this.initialized = true;

      logger.info('Node Media Server initialized', {
        rtmpPort: this.rtmpPort,
        httpPort: this.httpPort,
        mediaRoot: this.mediaRoot,
      });
    } catch (error) {
      logger.error('Failed to initialize Node Media Server', {
        error: error.message,
        stack: error.stack,
      });
      this.initialized = false;
    }
  }

  /**
   * Find FFmpeg executable
   */
  findFFmpeg() {
    // Common FFmpeg paths
    const commonPaths = [
      'ffmpeg', // In PATH
      '/usr/local/bin/ffmpeg', // macOS/Linux
      '/usr/bin/ffmpeg', // Linux
      'C:\\ffmpeg\\bin\\ffmpeg.exe', // Windows
    ];

    for (const ffmpegPath of commonPaths) {
      try {
        // Try to execute ffmpeg to see if it exists
        const { execSync } = require('child_process');
        execSync(`${ffmpegPath} -version`, { stdio: 'ignore' });
        logger.info('FFmpeg found', { path: ffmpegPath });
        return ffmpegPath;
      } catch (e) {
        // Continue searching
      }
    }

    logger.warn('FFmpeg not found. HLS conversion will not work. Install FFmpeg or set FFMPEG_PATH environment variable.');
    return 'ffmpeg'; // Default, will fail gracefully if not found
  }

  /**
   * Get RTMP URL for streaming
   * @param {string} competitionId - Competition ID
   * @returns {string} RTMP URL
   */
  getRTMPUrl(competitionId) {
    const rtmpHost = process.env.RTMP_HOST || process.env.APP_URL?.replace(/^https?:\/\//, '') || 'localhost';
    // Remove port from host if present
    const host = rtmpHost.split(':')[0];
    return `rtmp://${host}:${this.rtmpPort}/live/${competitionId}`;
  }

  /**
   * Get HLS manifest URL
   * @param {string} competitionId - Competition ID
   * @returns {string} HLS manifest URL
   */
  getHLSUrl(competitionId) {
    // Use main server URL instead of separate media server port
    // HLS files are served through Express /live route
    const baseUrl = process.env.APP_URL || 
                   process.env.BASE_URL || 
                   'http://localhost:5000';
    return `${baseUrl.replace(/\/$/, '')}/live/${competitionId}/index.m3u8`;
  }

  /**
   * Check if media server is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Stop the media server
   */
  stop() {
    if (this.nms) {
      this.nms.stop();
      this.initialized = false;
      logger.info('Node Media Server stopped');
    }
  }
}

// Export singleton instance
const mediaServerService = new MediaServerService();

module.exports = mediaServerService;

