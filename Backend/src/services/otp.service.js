const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Otp = require("../models/Otp");

/**
 * Generate a 6-digit random numeric OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  // Generates a random number between 100000 and 999999
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Creates an OTP, hashes it, and saves it to the database for an email
 * @param {string} email
 * @param {string} type 'registration' | 'login'
 * @returns {string} the plaintext OTP that needs to be emailed
 */
const createOTP = async (email, type) => {
  // 1. Check if there's an existing OTP for this email/type and remove it to prevent spam piling
  await Otp.deleteMany({ email, type });

  // 2. Generate a fresh 6-digit code
  const plaintextOtp = generateOTP();

  // 3. Hash it for secure stored
  const salt = await bcrypt.genSalt(8);
  const hashedOtp = await bcrypt.hash(plaintextOtp, salt);

  // 4. Save to database (will auto-expire in 5 mins due to TTL index)
  await Otp.create({
    email,
    otp: hashedOtp,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins from now
  });

  return plaintextOtp;
};

/**
 * Verifies a given OTP for a specific email
 * @param {string} email
 * @param {string} otp The plaintext OTP given by the user
 * @param {string} type 'registration' | 'login'
 * @returns {Promise<boolean>} True if valid, throws error otherwise
 */
const verifyOTP = async (email, otp, type) => {
  // Find the OTP document
  const otpRecord = await Otp.findOne({ email, type });

  if (!otpRecord) {
    const error = new Error("Invalid or expired OTP. Please request a new one.");
    error.statusCode = 400;
    throw error;
  }

  // Compare the provided OTP with the hashed OTP in the db
  const isValid = await bcrypt.compare(otp.toString(), otpRecord.otp);

  if (!isValid) {
    const error = new Error("Incorrect OTP.");
    error.statusCode = 400;
    throw error;
  }

  // If valid, delete the OTP to prevent reuse
  await Otp.deleteOne({ _id: otpRecord._id });

  return true;
};

module.exports = {
  generateOTP,
  createOTP,
  verifyOTP,
};
