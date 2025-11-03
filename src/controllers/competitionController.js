const Competition = require('../models/Competition');
const Favorite = require('../models/Favorite');
const Ticket = require('../models/Ticket');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Helper function to format live draw value
const formatLiveDrawValue = (drawTime) => {
  if (!drawTime) return 'TBD';
  
  const now = new Date();
  const drawDate = new Date(drawTime);
  const diffMs = drawDate - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Format time (e.g., "7AM", "2PM", "11:30AM")
  const hours = drawDate.getHours();
  const minutes = drawDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeStr = minutes > 0 ? `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}` : `${displayHours}${ampm}`;
  
  if (diffDays === 0) {
    if (diffHours <= 0 && diffMinutes <= 0) {
      return 'Live Now';
    }
    return `Today, ${timeStr}`;
  } else if (diffDays === 1) {
    return `Tomorrow, ${timeStr}`;
  } else if (diffDays < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[drawDate.getDay()]}, ${timeStr}`;
  } else {
    return drawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + `, ${timeStr}`;
  }
};

const getCompetitions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, category_id } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category_id) query.category_id = category_id;

    const competitions = await Competition.find(query)
      .populate('category_id', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Competition.countDocuments(query);

    res.success('Competitions retrieved successfully', {
      competitions,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competitions', 500);
  }
};

const getRecentCompetitions = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    let competitions;
    
    if (userId) {
      // Get user's favorite competitions first
      const favoriteCompetitions = await Favorite.find({ user_id: userId })
        .select('competition_id')
        .lean();
      
      const favoriteIds = favoriteCompetitions.map(fav => fav.competition_id);
      
      // Get favorite competitions
      const favorites = favoriteIds.length > 0
        ? await Competition.find({ 
            _id: { $in: favoriteIds }, 
            status: 'active' 
          })
          .populate('category_id', 'name slug')
          .sort({ createdAt: -1 })
          .lean()
        : [];
      
      // Get other competitions (excluding favorites)
      const otherCompetitions = await Competition.find({ 
        status: 'active',
        _id: { $nin: favoriteIds }
      })
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .limit(5 - favorites.length)
        .lean();
      
      // Combine: favorites first, then others
      competitions = [...favorites, ...otherCompetitions].slice(0, 5);
    } else {
      // For non-authenticated users, return regular list
      competitions = await Competition.find({ status: 'active' })
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    res.success('Recent competitions retrieved successfully', { competitions });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve recent competitions', 500);
  }
};

const searchCompetitions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.error('Search query is required', 400);
    }

    const competitions = await Competition.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { short_description: { $regex: query, $options: 'i' } },
        { long_description: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('category_id', 'name slug')
      .limit(20);

    res.success('Search results retrieved successfully', { competitions });
  } catch (error) {
    res.error(error.message || 'Search failed', 500);
  }
};

const getCompetitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id; // Optional auth user

    const competition = await Competition.findById(id).populate('category_id', 'name slug image_url');

    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Calculate progress percentage
    const progress_percentage = competition.max_tickets > 0
      ? Math.round((competition.tickets_sold / competition.max_tickets) * 100)
      : 0;

    // Determine status message based on competition status
    let status_message = '';
    const now = new Date();
    
    switch (competition.status) {
      case 'upcoming':
        status_message = 'Competition is upcoming';
        break;
      case 'active':
        if (competition.draw_time && competition.draw_time > now) {
          status_message = 'Competition has started';
        } else {
          status_message = 'Competition is active';
        }
        break;
      case 'closed':
        status_message = 'Competition is closed';
        break;
      case 'completed':
        status_message = 'Competition has finished';
        break;
      default:
        status_message = 'Competition status unknown';
    }

    // Add additional fields to competition object
    const competitionData = competition.toObject();
    competitionData.status_message = status_message;
    competitionData.start_date = competition.createdAt;
    competitionData.end_date = competition.draw_time;
    competitionData.progress_percentage = progress_percentage;
    competitionData.live_draw_value = formatLiveDrawValue(competition.draw_time);
    competitionData.live_draw_watching_url = competition.live_draw_watching_url || null;

    // Add user-specific fields if authenticated
    if (userId) {
      const userTickets = await Ticket.find({
        user_id: userId,
        competition_id: id,
      });

      const total_tickets = userTickets.length;
      const total_paid = userTickets.reduce((sum, ticket) => sum + ticket.price, 0);

      competitionData.total_tickets = total_tickets;
      competitionData.total_paid = total_paid;
    } else {
      competitionData.total_tickets = 0;
      competitionData.total_paid = 0;
    }

    res.success('Competition retrieved successfully', { competition: competitionData });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competition', 500);
  }
};

const addFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if competition exists
    const competition = await Competition.findById(id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ 
      user_id: userId, 
      competition_id: id 
    });

    if (existingFavorite) {
      return res.error('Competition is already in favorites', 400);
    }

    // Add to favorites
    const favorite = new Favorite({
      user_id: userId,
      competition_id: id,
    });

    await favorite.save();

    res.success('Competition added to favorites successfully', { favorite });
  } catch (error) {
    if (error.code === 11000) {
      return res.error('Competition is already in favorites', 400);
    }
    res.error(error.message || 'Failed to add favorite', 500);
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if favorite exists
    const favorite = await Favorite.findOne({ 
      user_id: userId, 
      competition_id: id 
    });

    if (!favorite) {
      return res.error('Competition is not in favorites', 404);
    }

    await Favorite.deleteOne({ _id: favorite._id });

    res.success('Competition removed from favorites successfully');
  } catch (error) {
    res.error(error.message || 'Failed to remove favorite', 500);
  }
};

const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    // Get user's favorite competition IDs
    const favorites = await Favorite.find({ user_id: userId })
      .select('competition_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const favoriteIds = favorites.map(fav => fav.competition_id);

    // Get competitions
    const competitions = favoriteIds.length > 0
      ? await Competition.find({ _id: { $in: favoriteIds } })
          .populate('category_id', 'name slug')
          .sort({ createdAt: -1 })
      : [];

    // Maintain the order of favorites
    const competitionMap = new Map(
      competitions.map(comp => [comp._id.toString(), comp])
    );
    const orderedCompetitions = favoriteIds
      .map(id => competitionMap.get(id))
      .filter(Boolean);

    const total = await Favorite.countDocuments({ user_id: userId });

    res.success('Favorites retrieved successfully', {
      competitions: orderedCompetitions,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve favorites', 500);
  }
};

const getMyCompetitions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    // Get distinct competition IDs from user's tickets
    const ticketCompetitions = await Ticket.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$competition_id',
          ticket_count: { $sum: 1 },
          latest_purchase: { $max: '$purchase_date' },
        },
      },
      { $sort: { latest_purchase: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const competitionIds = ticketCompetitions.map(tc => tc._id);

    // Get competitions
    const competitions = competitionIds.length > 0
      ? await Competition.find({ _id: { $in: competitionIds } })
          .populate('category_id', 'name slug')
          .lean()
      : [];

    // Create a map for ticket counts
    const ticketCountMap = new Map(
      ticketCompetitions.map(tc => [tc._id.toString(), tc.ticket_count])
    );

    // Add ticket_count to each competition and maintain order
    const competitionsWithTicketCount = competitionIds
      .map(id => {
        const competition = competitions.find(c => c._id.toString() === id.toString());
        if (competition) {
          competition.ticket_count = ticketCountMap.get(id.toString()) || 0;
          return competition;
        }
        return null;
      })
      .filter(Boolean);

    // Get total count of unique competitions
    const totalCompetitions = await Ticket.distinct('competition_id', { user_id: userId });
    const total = totalCompetitions.length;

    // Get total purchased tickets count
    const totalPurchasedTickets = await Ticket.countDocuments({ user_id: userId });

    res.success('My competitions retrieved successfully', {
      total_participated_competitions: total,
      total_purchased_tickets: totalPurchasedTickets,
      competitions: competitionsWithTicketCount,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve my competitions', 500);
  }
};

module.exports = {
  getCompetitions,
  getRecentCompetitions,
  searchCompetitions,
  getCompetitionById,
  addFavorite,
  removeFavorite,
  getMyFavorites,
  getMyCompetitions,
};

