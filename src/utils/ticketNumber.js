/**
 * Ticket number generation utility
 */

const generateTicketNumber = () => {
  // Generate unique ticket number: TMG + timestamp + random string
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TMG-${timestamp}-${random}`;
};

module.exports = {
  generateTicketNumber,
};

