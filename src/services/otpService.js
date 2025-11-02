/**
 * OTP Service (Mocked for demo)
 * In production, this would send actual OTP via SMS or Email
 */

const generateOTP = () => {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (email, otp) => {
  // Mock implementation - return static demo response
  console.log(`[MOCK] Sending OTP ${otp} to ${email}`);
  return {
    success: true,
    message: `OTP has been sent to ${email}`,
    otp: otp, // Only for demo/testing - remove in production
  };
};

const verifyOTP = (storedOTP, providedOTP, expiresAt) => {
  if (!storedOTP || !providedOTP) {
    return false;
  }

  if (new Date() > new Date(expiresAt)) {
    return false;
  }

  return storedOTP === providedOTP;
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
};

