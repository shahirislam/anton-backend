const fs = require('fs');
const path = require('path');
const Competition = require('../models/Competition');
const streamingService = require('../services/streamingService');
const logger = require('../utils/logger');

/**
 * Handle OPTIONS request for CORS preflight
 */
const handleOptions = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
};

/**
 * Serve HLS files
 * GET /live/:competitionId/:filename
 */
const serveHLSFile = async (req, res) => {
  try {
    const { competitionId, filename } = req.params;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Build file path
    const mediaPath = path.join(__dirname, '../../media');
    const filePath = path.join(mediaPath, 'live', competitionId, filename);

    // Check if file exists first (HLS files only exist if RTMP stream is active)
    if (!fs.existsSync(filePath)) {
      // Check if stream is active (WebRTC might be active but HLS not available)
      const streamStatus = streamingService.getStreamStatus(competitionId);
      if (!streamStatus || !streamStatus.isActive) {
        return res.error('Stream is not currently active', 404);
      }
      
      // Stream is active (WebRTC) but HLS file doesn't exist
      // This means no one is streaming to RTMP yet
      return res.error('HLS stream not available. The stream is active via WebRTC, but HLS files are only generated when streaming via RTMP. Please use the WebRTC viewer URL instead.', 404);
    }

    // Check if stream is active (for validation, but don't block if file exists)
    const streamStatus = streamingService.getStreamStatus(competitionId);
    if (!streamStatus || !streamStatus.isActive) {
      // File exists but stream is not active - might be stale file
      // Still serve it, but log a warning
      logger.warn('Serving HLS file for inactive stream', { competitionId, filename });
    }

    // Set proper content types and headers
    if (filename.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      // Add CORS headers for HLS manifest
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    } else if (filename.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Add CORS headers for TS segments
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    } else {
      // CORS headers for other files
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Failed to serve HLS file', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
      filename: req.params.filename,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to serve HLS file',
    });
  }
};

module.exports = {
  serveHLSFile,
  handleOptions,
};

