const User = require('../../models/User');
const Competition = require('../../models/Competition');
const Ticket = require('../../models/Ticket');
const Winner = require('../../models/Winner');
const PointsHistory = require('../../models/PointsHistory');
const Payment = require('../../models/Payment');

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

/**
 * Get Dashboard Statistics
 * GET /api/v1/admin/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const { month, date } = req.query;

    // Parse month filter (YYYY-MM format, defaults to current month)
    let startOfMonth, endOfMonth;
    if (month) {
      const [year, monthNum] = month.split('-');
      startOfMonth = new Date(year, parseInt(monthNum) - 1, 1);
      endOfMonth = new Date(year, parseInt(monthNum), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Parse date filter for tickets sold today (YYYY-MM-DD format, defaults to today)
    let startOfDay, endOfDay;
    if (date) {
      const [year, monthNum, day] = date.split('-');
      startOfDay = new Date(year, parseInt(monthNum) - 1, parseInt(day), 0, 0, 0, 0);
      endOfDay = new Date(year, parseInt(monthNum) - 1, parseInt(day), 23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    // Previous month for comparison
    const prevMonthStart = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1);
    const prevMonthEnd = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 0, 23, 59, 59, 999);

    // Previous day for comparison
    const prevDayStart = new Date(startOfDay);
    prevDayStart.setDate(prevDayStart.getDate() - 1);
    prevDayStart.setHours(0, 0, 0, 0);
    const prevDayEnd = new Date(prevDayStart);
    prevDayEnd.setHours(23, 59, 59, 999);

    // Get current statistics
    const [
      activeCompetitions,
      totalUsers,
      monthlyRevenue,
      ticketsSoldToday,
      // Previous period for comparison
      prevActiveCompetitions,
      prevTotalUsers,
      prevMonthlyRevenue,
      prevTicketsSoldToday,
    ] = await Promise.all([
      Competition.countDocuments({ status: 'active' }),
      User.countDocuments(),
      Payment.aggregate([
        {
          $match: {
            status: 'succeeded',
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Ticket.countDocuments({
        purchase_date: { $gte: startOfDay, $lte: endOfDay },
      }),
      // Previous period - approximate: count competitions that existed at end of previous month
      // (Since we don't have historical status, we use this as a baseline)
      Competition.countDocuments({
        createdAt: { $lte: prevMonthEnd },
      }),
      User.countDocuments({ createdAt: { $lte: prevMonthEnd } }),
      Payment.aggregate([
        {
          $match: {
            status: 'succeeded',
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Ticket.countDocuments({
        purchase_date: { $gte: prevDayStart, $lte: prevDayEnd },
      }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) {
        return current > 0 ? { value: '+100%', type: 'positive' } : null;
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return {
        value: `${sign}${Math.round(change)}%`,
        type: change >= 0 ? 'positive' : 'negative',
      };
    };

    const changes = {
      activeCompetitions: calculateChange(activeCompetitions, prevActiveCompetitions),
      totalUsers: calculateChange(totalUsers, prevTotalUsers),
      monthlyRevenue: calculateChange(
        monthlyRevenue[0]?.total || 0,
        prevMonthlyRevenue[0]?.total || 0
      ),
      ticketsSoldToday: calculateChange(ticketsSoldToday, prevTicketsSoldToday),
    };

    // Format changes with period description
    if (changes.activeCompetitions) {
      changes.activeCompetitions.value += ' this month';
    }
    if (changes.totalUsers) {
      changes.totalUsers.value += ' this month';
    }
    if (changes.monthlyRevenue) {
      changes.monthlyRevenue.value += ' this month';
    }
    if (changes.ticketsSoldToday) {
      changes.ticketsSoldToday.value += ' vs yesterday';
    }

    const response = {
      activeCompetitions,
      totalUsers,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      ticketsSoldToday,
      changes,
    };

    res.success('Dashboard statistics retrieved successfully', response);
  } catch (error) {
    res.error(error.message || 'Failed to retrieve dashboard statistics', 500);
  }
};

/**
 * Get Revenue Overview Chart Data
 * GET /api/v1/admin/dashboard/revenue
 */
const getRevenue = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;

    let start, end;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Calculate period based on period parameter
      switch (period) {
        case '7d':
          start = new Date(now);
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start = new Date(now);
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start = new Date(now);
          start.setDate(start.getDate() - 90);
          break;
        case '1y':
          start = new Date(now);
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start = new Date(now);
          start.setDate(start.getDate() - 30);
      }
      end = new Date(now);
    }

    // Get revenue data grouped by month
    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Format data with month abbreviations
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = revenueData.map((item) => ({
      month: monthNames[item._id.month - 1],
      revenue: Math.round(item.revenue * 100) / 100, // Round to 2 decimal places
    }));

    // Generate period description
    let periodDescription = 'Last 30 days';
    if (startDate && endDate) {
      periodDescription = `${startDate} to ${endDate}`;
    } else {
      switch (period) {
        case '7d':
          periodDescription = 'Last 7 days';
          break;
        case '30d':
          periodDescription = 'Last 30 days';
          break;
        case '90d':
          periodDescription = 'Last 90 days';
          break;
        case '1y':
          periodDescription = 'Last year';
          break;
      }
    }

    res.success('Revenue data retrieved successfully', {
      data,
      period: periodDescription,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve revenue data', 500);
  }
};

/**
 * Get Competition Status Chart Data
 * GET /api/v1/admin/dashboard/competition-status
 */
const getCompetitionStatus = async (req, res) => {
  try {
    // Map competition statuses to display names and colors
    const statusConfig = {
      active: { name: 'Active', color: '#2ed573' },
      completed: { name: 'Completed', color: '#60A5FA' },
      upcoming: { name: 'Upcoming', color: '#ffa502' },
      closed: { name: 'Closed', color: '#ff4757' },
    };

    // Get competition counts by status
    const statusCounts = await Competition.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format data
    const data = statusCounts
      .map((item) => {
        const config = statusConfig[item._id];
        if (!config) return null;
        return {
          name: config.name,
          value: item.count,
          color: config.color,
        };
      })
      .filter((item) => item !== null);

    // Return with data wrapper to match API requirements format
    // API requirements show { data: [...] } as the response format
    res.success('Competition status data retrieved successfully', { data });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competition status data', 500);
  }
};

/**
 * Get Weekly User Activity Chart Data
 * GET /api/v1/admin/dashboard/user-activity
 */
const getUserActivity = async (req, res) => {
  try {
    const { week, year, startDate, endDate } = req.query;

    let start, end;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Calculate week based on week number and year
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetWeek = week ? parseInt(week) : getWeekNumber(now);

      // Get start of year
      const yearStart = new Date(targetYear, 0, 1);
      // Get first Monday of the year
      const firstMonday = new Date(yearStart);
      const dayOfWeek = firstMonday.getDay();
      const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      firstMonday.setDate(firstMonday.getDate() + daysToAdd);

      // Calculate start of target week
      start = new Date(firstMonday);
      start.setDate(start.getDate() + (targetWeek - 1) * 7);

      // End of week (Sunday)
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    // Get new users per day
    const newUsersData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get active users per day (users who made a purchase - unique users per day)
    const activeUsersData = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            userId: '$user_id',
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $first: '$_id.year' },
            month: { $first: '$_id.month' },
            day: { $first: '$_id.day' },
            dayOfWeek: { $first: '$_id.dayOfWeek' },
          },
          count: { $sum: 1 }, // Count of unique users per day
        },
      },
    ]);

    // Create a map for each day of the week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = {};

    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      const dayName = dayNames[currentDay.getDay()];
      dayMap[dayName] = { newUsers: 0, activeUsers: 0 };
    }

    // Fill in new users data
    newUsersData.forEach((item) => {
      const dayName = dayNames[item._id.dayOfWeek - 1];
      if (dayMap[dayName]) {
        dayMap[dayName].newUsers += item.count;
      }
    });

    // Fill in active users data
    activeUsersData.forEach((item) => {
      const dayName = dayNames[item._id.dayOfWeek - 1];
      if (dayMap[dayName]) {
        dayMap[dayName].activeUsers += item.count;
      }
    });

    // Convert to array format
    const data = Object.keys(dayMap).map((dayName) => ({
      day: dayName,
      newUsers: dayMap[dayName].newUsers,
      activeUsers: dayMap[dayName].activeUsers,
    }));

    // Generate period description
    let periodDescription = '';
    if (startDate && endDate) {
      periodDescription = `${startDate} to ${endDate}`;
    } else {
      const weekNum = week || getWeekNumber(now);
      const yearNum = year || now.getFullYear();
      periodDescription = `Week ${weekNum}, ${yearNum}`;
    }

    res.success('User activity data retrieved successfully', {
      data,
      period: periodDescription,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve user activity data', 500);
  }
};

/**
 * Helper function to get week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = {
  getDashboard,
  getDashboardStats,
  getRevenue,
  getCompetitionStatus,
  getUserActivity,
};

