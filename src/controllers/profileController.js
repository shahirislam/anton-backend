const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Competition = require('../models/Competition');
const PointsHistory = require('../models/PointsHistory');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { getFileUrl, deleteFile } = require('../utils/fileHelper');
const logger = require('../utils/logger');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    // Convert profile_image to full URL if it's a local file
    const userData = user.toObject();
    if (userData.profile_image && !userData.profile_image.startsWith('http')) {
      userData.profile_image = getFileUrl(userData.profile_image, req);
    }

    res.success('Profile retrieved successfully', { user: userData });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve profile', 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone_number, location } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.error('User not found', 404);
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.error('Email already in use', 409);
      }
      user.email = email;
      user.verified = false; // Require re-verification if email changed
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if it exists and is a local file
      if (user.profile_image && !user.profile_image.startsWith('http')) {
        await deleteFile(user.profile_image);
      }
      user.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    if (name) user.name = name;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (location !== undefined) user.location = location;

    await user.save();

    // Convert profile_image to full URL if it's a local file
    const userData = user.toObject();
    if (userData.profile_image && !userData.profile_image.startsWith('http')) {
      userData.profile_image = getFileUrl(userData.profile_image, req);
    }

    res.success('Profile updated successfully', { user: userData });
  } catch (error) {
    res.error(error.message || 'Failed to update profile', 500);
  }
};

const getProfilePoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('total_points total_earned total_spent total_redeemed');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('Profile points retrieved successfully', {
      total_points: user.total_points,
      total_earned: user.total_earned,
      total_spent: user.total_spent,
      total_redeemed: user.total_redeemed || 0,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve profile points', 500);
  }
};

const getProfileTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const transactions = await PointsHistory.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PointsHistory.countDocuments({ user_id: userId });

    res.success('Transactions retrieved successfully', {
      transactions,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve transactions', 500);
  }
};

/**
 * Get user purchase history
 * Groups payments by competition and shows purchase details
 * Also includes direct ticket purchases (without Payment records)
 */
const getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    // Get all payments for the user, sorted by creation date (newest first)
    // Note: Using lean() but populate should still work
    const payments = await Payment.find({ user_id: userId })
      .populate({
        path: 'competition_id',
        select: 'title slug image_url ticket_price',
      })
      .populate({
        path: 'cart_items.competition_id',
        select: 'title slug image_url ticket_price',
      })
      .sort({ createdAt: -1 })
      .lean();

    const totalPayments = await Payment.countDocuments({ user_id: userId });

    logger.info('Fetching purchase history', {
      userId,
      paymentsFound: payments.length,
      totalPayments,
    });

    // Format purchase history from Payment records
    const purchaseHistory = [];

    for (const payment of payments) {
      logger.debug('Processing payment', {
        payment_id: payment._id,
        payment_type: payment.payment_type,
        has_competition_id: !!payment.competition_id,
        competition_id_type: typeof payment.competition_id,
        has_cart_items: !!(payment.cart_items && payment.cart_items.length > 0),
        cart_items_count: payment.cart_items ? payment.cart_items.length : 0,
      });
      // Convert payment status to UI status
      // 'succeeded' and 'completed' -> 'completed'
      // 'pending' and 'processing' -> 'pending'
      // Others -> 'pending' (default)
      let status = 'pending';
      if (payment.status === 'succeeded' || payment.status === 'completed') {
        status = 'completed';
      } else if (payment.status === 'pending' || payment.status === 'processing') {
        status = 'pending';
      }

      // Skip if payment_type is missing or invalid
      if (!payment.payment_type) {
        logger.warn('Payment missing payment_type', { payment_id: payment._id });
        continue;
      }

      // Handle single purchase
      if (payment.payment_type === 'single_purchase') {
        // Check if competition_id exists (could be string ID or populated object)
        const competitionId = typeof payment.competition_id === 'object' && payment.competition_id !== null
          ? payment.competition_id._id || payment.competition_id
          : payment.competition_id;
        
        if (!competitionId) {
          // Skip if no competition_id
          continue;
        }

        // Get competition - if not populated, fetch it
        let competition = payment.competition_id;
        if (typeof competition !== 'object' || competition === null || !competition.title) {
          // Competition not populated or invalid, fetch it
          competition = await Competition.findById(competitionId).select('title slug image_url ticket_price').lean();
          if (!competition) {
            // Competition not found, skip this payment
            logger.warn('Competition not found for payment', {
              payment_id: payment._id,
              competition_id: competitionId,
            });
            continue;
          }
        }
        
        logger.debug('Processing single purchase', {
          payment_id: payment._id,
          competition_title: competition.title,
          ticket_count: actualTicketCount,
        });
        const ticketCount = payment.quantity || 1;
        
        // Get actual ticket count from ticket_ids if available
        const actualTicketCount = payment.ticket_ids ? payment.ticket_ids.length : ticketCount;
        
        // Amount is stored in dollars (not cents) in the Payment model
        // Convert USD to GBP if needed (approximate rate: 1 USD = 0.79 GBP)
        // Frontend should ideally use real-time exchange rates
        const amountInPounds = payment.currency === 'usd' 
          ? payment.amount * 0.79 // Convert USD to GBP
          : payment.amount; // Already in GBP or other currency

        purchaseHistory.push({
          _id: payment._id,
          competition: {
            _id: competition._id || competitionId || null,
            title: competition.title || 'Unknown Competition',
            slug: competition.slug || null,
            image_url: competition.image_url || null,
          },
          tickets: actualTicketCount,
          amount: parseFloat(amountInPounds.toFixed(2)),
          date: payment.createdAt,
          status: status,
          payment_intent_id: payment.payment_intent_id,
          transaction_id: payment.transaction_id,
        });
      }
      // Handle cart checkout (multiple competitions)
      else if (payment.payment_type === 'cart_checkout') {
        if (!payment.cart_items || payment.cart_items.length === 0) {
          // Skip if no cart items
          continue;
        }
        // For cart checkout, create separate entries for each competition
        const ticketIds = payment.ticket_ids || [];
        
        // Group tickets by competition
        const ticketsByCompetition = {};
        if (ticketIds.length > 0) {
          const tickets = await Ticket.find({ _id: { $in: ticketIds } })
            .select('competition_id')
            .lean();
          
          tickets.forEach(ticket => {
            const compId = ticket.competition_id.toString();
            if (!ticketsByCompetition[compId]) {
              ticketsByCompetition[compId] = 0;
            }
            ticketsByCompetition[compId]++;
          });
        }

        // Create entry for each competition in cart
        for (const cartItem of payment.cart_items) {
          // Get competition - handle both populated and non-populated cases
          let competition = cartItem.competition_id;
          const competitionId = typeof competition === 'object' && competition !== null
            ? competition._id || competition
            : competition;
          
          if (!competitionId) {
            continue;
          }

          // If competition not populated or invalid, fetch it
          if (typeof competition !== 'object' || competition === null || !competition.title) {
            competition = await Competition.findById(competitionId).select('title slug image_url ticket_price').lean();
            if (!competition) {
              // Competition not found, skip this cart item
              continue;
            }
          }

          const ticketCount = ticketsByCompetition[competition._id?.toString()] || cartItem.quantity || 1;
          
          // Calculate amount per competition (proportional to quantity)
          // Get the competition's ticket price to calculate accurate amount
          let competitionAmount = 0;
          if (competition.ticket_price) {
            // Use actual ticket price if available
            competitionAmount = competition.ticket_price * ticketCount;
          } else {
            // Fallback: divide total amount proportionally
            const totalItems = payment.cart_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const amountPerItem = payment.amount / totalItems;
            competitionAmount = amountPerItem * ticketCount;
          }
          
          const amountInPounds = payment.currency === 'usd'
            ? competitionAmount * 0.79 // Convert USD to GBP
            : competitionAmount; // Already in GBP or other currency

          purchaseHistory.push({
            _id: `${payment._id}-${competition._id || competitionId}`,
            competition: {
              _id: competition._id || competitionId || null,
              title: competition.title || 'Unknown Competition',
              slug: competition.slug || null,
              image_url: competition.image_url || null,
            },
            tickets: ticketCount,
            amount: parseFloat(amountInPounds.toFixed(2)),
            date: payment.createdAt,
            status: status,
            payment_intent_id: payment.payment_intent_id,
            transaction_id: payment.transaction_id,
          });
        }
      }
      // If payment doesn't match any type, log it for debugging
      else {
        logger.warn('Payment does not match expected types', {
          payment_id: payment._id,
          payment_type: payment.payment_type,
          has_competition_id: !!payment.competition_id,
          has_cart_items: !!(payment.cart_items && payment.cart_items.length > 0),
        });
      }
    }

    // Now get direct ticket purchases (tickets not associated with Payment records)
    // Get all payment ticket IDs to exclude (flatten the array of arrays)
    const paymentsWithTickets = await Payment.find(
      { user_id: userId, ticket_ids: { $exists: true, $ne: [] } },
      { ticket_ids: 1 }
    ).lean();
    const paymentTicketIds = paymentsWithTickets
      .flatMap(payment => payment.ticket_ids || [])
      .filter(id => id); // Remove null/undefined
    
    // Group tickets by competition and purchase_date (within same minute)
    // Exclude tickets that are in payment records
    const directTicketPurchases = await Ticket.aggregate([
      {
        $match: {
          user_id: userId,
          _id: { $nin: paymentTicketIds }, // Exclude tickets linked to payments
        },
      },
      {
        $group: {
          _id: {
            competition_id: '$competition_id',
            purchase_date_minute: {
              $dateToString: {
                format: '%Y-%m-%dT%H:%M',
                date: '$purchase_date',
              },
            },
          },
          tickets: { $push: '$_id' },
          ticket_count: { $sum: 1 },
          total_amount: { $sum: '$price' },
          purchase_date: { $first: '$purchase_date' },
        },
      },
      {
        $sort: { purchase_date: -1 },
      },
    ]);

    logger.info('Direct ticket purchases found', {
      count: directTicketPurchases.length,
    });

    // Process direct ticket purchases
    for (const purchase of directTicketPurchases) {
      const competitionId = purchase._id.competition_id;
      const competition = await Competition.findById(competitionId)
        .select('title slug image_url ticket_price')
        .lean();

      if (!competition) {
        logger.warn('Competition not found for direct ticket purchase', {
          competition_id: competitionId,
        });
        continue;
      }

      // Amount is stored in dollars, convert to GBP if needed
      const amountInPounds = purchase.total_amount * 0.79; // Convert USD to GBP

      purchaseHistory.push({
        _id: `direct-${competitionId}-${purchase._id.purchase_date}`,
        competition: {
          _id: competition._id || competitionId,
          title: competition.title || 'Unknown Competition',
          slug: competition.slug || null,
          image_url: competition.image_url || null,
        },
        tickets: purchase.ticket_count,
        amount: parseFloat(amountInPounds.toFixed(2)),
        date: purchase.purchase_date,
        status: 'completed', // Direct purchases are always completed
        payment_intent_id: null,
        transaction_id: null,
      });
    }

    // Sort by date (newest first)
    purchaseHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply pagination to the combined results
    const totalItems = purchaseHistory.length;
    const paginatedHistory = purchaseHistory.slice(skip, skip + limit);

    // Convert image URLs to full URLs
    const formattedHistory = paginatedHistory.map(item => {
      if (item.competition.image_url && !item.competition.image_url.startsWith('http')) {
        item.competition.image_url = getFileUrl(item.competition.image_url, req);
      }
      return item;
    });

    res.success('Purchase history retrieved successfully', {
      purchase_history: formattedHistory,
      pagination: getPaginationMeta(page, limit, totalItems),
    });
  } catch (error) {
    logger.error('Failed to retrieve purchase history', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
    });
    res.error(error.message || 'Failed to retrieve purchase history', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfilePoints,
  getProfileTransactions,
  getPurchaseHistory,
};

