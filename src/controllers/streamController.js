const Competition = require('../models/Competition');
const streamingService = require('../services/streamingService');
const logger = require('../utils/logger');

/**
 * Get stream information for viewing
 * GET /stream/:competitionId
 */
const getStreamInfo = async (req, res) => {
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
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const websocketUrl = baseUrl.replace('http', 'ws');

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
};

