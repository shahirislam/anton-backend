const Competition = require('../../models/Competition');
const streamingService = require('../../services/streamingService');
const notificationService = require('../../services/notificationService');
const mediaServerService = require('../../services/mediaServerService');
const logger = require('../../utils/logger');
const { getFileUrl } = require('../../utils/fileHelper');

/**
 * Start streaming for a competition
 * POST /api/v1/admin/streams/:competitionId/start
 */
const startStream = async (req, res) => {
  try {
    const { competitionId } = req.params;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Validate competition is in 'active' status
    if (competition.status !== 'active') {
      return res.error('Streaming can only be started for active competitions', 400);
    }

    // Check if stream already exists
    const existingStream = streamingService.getStreamStatus(competitionId);
    if (existingStream && existingStream.isActive) {
      return res.success('Stream already active', {
        stream: existingStream,
        competition: {
          ...competition.toObject(),
          live_draw_watching_url: competition.live_draw_watching_url,
        },
      });
    }

    // Create stream room
    const streamInfo = streamingService.createStream(competitionId);

    // Get WebRTC configuration
    const rtcConfig = streamingService.getRTCConfiguration();

    // Update competition with live_draw_watching_url and stream tracking fields
    try {
      competition.live_draw_watching_url = streamInfo.streamUrl;
      competition.stream_room_id = streamInfo.roomId;
      competition.stream_started_at = new Date();
      
      // Automatically generate HLS URL if media server is available
      if (mediaServerService.isInitialized()) {
        const hlsUrl = mediaServerService.getHLSUrl(competitionId);
        competition.hls_stream_url = hlsUrl;
        logger.info('HLS URL generated automatically', {
          competitionId,
          hlsUrl,
          rtmpUrl: mediaServerService.getRTMPUrl(competitionId),
        });
      }
      
      await competition.save();

      // Convert image_url to full URL if needed
      if (competition.image_url && !competition.image_url.startsWith('http')) {
        competition.image_url = getFileUrl(competition.image_url, req);
      }
    } catch (updateError) {
      logger.error('Failed to update competition with stream URL', {
        error: updateError.message,
        competitionId,
      });
      // Continue anyway - stream is created, URL update can be retried
    }

    logger.info('Stream started for competition', {
      competitionId,
      roomId: streamInfo.roomId,
      streamUrl: streamInfo.streamUrl,
    });

    // Send notifications to users about live stream starting (async, don't wait)
    notificationService.notifyLiveStreamStarted(competition, streamInfo.streamUrl)
      .then((result) => {
        logger.info('Live stream notifications sent', {
          competitionId,
          result,
        });
      })
      .catch((error) => {
        logger.error('Failed to send live stream notifications', {
          competitionId,
          error: error.message,
        });
      });

    res.success('Stream started successfully', {
      stream: {
        roomId: streamInfo.roomId,
        streamUrl: streamInfo.streamUrl,
        websocketUrl: streamInfo.websocketUrl,
        rtcConfig,
        hls_url: competition.hls_stream_url || null, // Include HLS URL
        rtmp_url: mediaServerService.isInitialized() 
          ? mediaServerService.getRTMPUrl(competitionId) 
          : null, // Include RTMP URL for streaming
      },
      competition: {
        ...competition.toObject(),
        live_draw_watching_url: streamInfo.streamUrl,
        hls_stream_url: competition.hls_stream_url || null, // Include HLS URL
      },
    });
  } catch (error) {
    logger.error('Failed to start stream', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.error(error.message || 'Failed to start stream', 500);
  }
};

/**
 * Stop streaming for a competition
 * POST /api/v1/admin/streams/:competitionId/stop
 */
const stopStream = async (req, res) => {
  try {
    const { competitionId } = req.params;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Stop the stream
    const stopped = streamingService.stopStream(competitionId);

    if (!stopped) {
      return res.error('No active stream found for this competition', 404);
    }

    // Clear stream tracking fields
    competition.stream_room_id = null;
    competition.stream_started_at = null;
    competition.live_draw_watching_url = null;
    competition.hls_stream_url = null; // Clear HLS URL when stream stops
    await competition.save();

    logger.info('Stream stopped for competition', { competitionId });

    res.success('Stream stopped successfully', {
      competition: {
        ...competition.toObject(),
        live_draw_watching_url: competition.live_draw_watching_url,
      },
    });
  } catch (error) {
    logger.error('Failed to stop stream', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.error(error.message || 'Failed to stop stream', 500);
  }
};

/**
 * Get stream status for a competition
 * GET /api/v1/admin/streams/:competitionId/status
 */
const getStreamStatus = async (req, res) => {
  try {
    const { competitionId } = req.params;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Get stream status
    const streamStatus = streamingService.getStreamStatus(competitionId);

    if (!streamStatus) {
      return res.success('No active stream found', {
        stream: null,
        competition: {
          ...competition.toObject(),
          live_draw_watching_url: competition.live_draw_watching_url,
        },
      });
    }

    // Get WebRTC configuration
    const rtcConfig = streamingService.getRTCConfiguration();

    res.success('Stream status retrieved successfully', {
      stream: {
        ...streamStatus,
        rtcConfig,
      },
      competition: {
        ...competition.toObject(),
        live_draw_watching_url: competition.live_draw_watching_url,
      },
    });
  } catch (error) {
    logger.error('Failed to get stream status', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.error(error.message || 'Failed to get stream status', 500);
  }
};

/**
 * Set HLS stream URL for a competition
 * PATCH /api/v1/admin/streams/:competitionId/hls-url
 */
const setHLSStreamUrl = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { hls_url } = req.body;

    // Validate competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Validate HLS URL format
    if (hls_url && !hls_url.match(/\.m3u8/i) && !hls_url.includes('hls')) {
      return res.error('Invalid HLS URL. Must point to an .m3u8 manifest file', 400);
    }

    // Update HLS URL
    competition.hls_stream_url = hls_url || null;
    await competition.save();

    logger.info('HLS stream URL updated', {
      competitionId,
      hls_url: hls_url || 'removed',
    });

    res.success('HLS stream URL updated successfully', {
      competition: {
        _id: competition._id,
        title: competition.title,
        hls_stream_url: competition.hls_stream_url,
        live_draw_watching_url: competition.live_draw_watching_url,
      },
    });
  } catch (error) {
    logger.error('Failed to set HLS stream URL', {
      error: error.message,
      stack: error.stack,
      competitionId: req.params.competitionId,
    });
    res.error(error.message || 'Failed to set HLS stream URL', 500);
  }
};

module.exports = {
  startStream,
  stopStream,
  getStreamStatus,
  setHLSStreamUrl,
};

