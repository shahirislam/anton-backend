/**
 * Email Service (Mocked for demo)
 * In production, this would integrate with actual email service (SendGrid, AWS SES, etc.)
 */

const sendEmail = async (to, subject, html) => {
  // Mock implementation - return static demo response
  console.log(`[MOCK] Sending email to ${to}`);
  console.log(`[MOCK] Subject: ${subject}`);
  console.log(`[MOCK] Body: ${html}`);

  return {
    success: true,
    message: `Email sent successfully to ${to}`,
  };
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 1 hour.</p>
  `;

  return sendEmail(email, 'Password Reset Request', html);
};

const sendWelcomeEmail = async (email, name) => {
  const html = `
    <h2>Welcome to TMG Competitions, ${name}!</h2>
    <p>Thank you for joining us. Start exploring our exciting competitions and win amazing prizes!</p>
  `;

  return sendEmail(email, 'Welcome to TMG Competitions', html);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};

