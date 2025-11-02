const User = require('../../models/User');
const Competition = require('../../models/Competition');
const Ticket = require('../../models/Ticket');
const Winner = require('../../models/Winner');
const PointsHistory = require('../../models/PointsHistory');

const getDashboard = async (req, res) => {
  try {
    // Get statistics
    const [
      totalUsers,
      totalAdminUsers,
      totalCompetitions,
      activeCompetitions,
      totalTicketsSold,
      totalWinners,
      totalPointsEarned,
      totalPointsSpent,
      recentUsers,
      recentTickets,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Competition.countDocuments(),
      Competition.countDocuments({ status: 'active' }),
      Ticket.countDocuments(),
      Winner.countDocuments(),
      PointsHistory.aggregate([
        { $match: { type: 'earned' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PointsHistory.aggregate([
        { $match: { type: 'spent' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.find().select('name email createdAt role').sort({ createdAt: -1 }).limit(5),
      Ticket.find()
        .populate('user_id', 'name email')
        .populate('competition_id', 'title')
        .sort({ purchase_date: -1 })
        .limit(5),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        admins: totalAdminUsers,
        regular: totalUsers - totalAdminUsers,
      },
      competitions: {
        total: totalCompetitions,
        active: activeCompetitions,
      },
      tickets: {
        total_sold: totalTicketsSold,
      },
      winners: {
        total: totalWinners,
      },
      points: {
        total_earned: totalPointsEarned[0]?.total || 0,
        total_spent: totalPointsSpent[0]?.total || 0,
      },
      recent_users: recentUsers,
      recent_tickets: recentTickets,
    };

    res.success('Dashboard data retrieved successfully', { stats });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve dashboard data', 500);
  }
};

module.exports = {
  getDashboard,
};

