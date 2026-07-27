const authService = require("../services/auth.service");
const otpService = require("../services/otp.service");
const emailService = require("../services/email.service");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// --- Validation Helpers ---
const isValidEmail = (email) =>
  /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
const isValidPhone = (phone) => /^\+?[0-9]{10,15}$/.test(phone);
const isValidPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password); // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
const isValidEmployeeId = (id) =>
  typeof id === "string" && id.trim().length > 0;
const isValidName = (name) =>
  typeof name === "string" && name.trim().length > 1;

const throwValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const sendRegisterOtp = async (req, res, next) => {
  try {
    const { employeeId, name, email, phone, password } = req.body;

    if (!employeeId || !name || !email || !phone || !password) {
      throwValidationError("All fields are required!");
    }

    if (!isValidEmployeeId(employeeId))
      throwValidationError("Employee ID must be a non-empty string");
    if (!isValidName(name))
      throwValidationError("Name must be at least 2 characters long");
    if (!isValidEmail(email))
      throwValidationError("Invalid email address format");
    if (!isValidPhone(phone))
      throwValidationError("Phone number must be valid (10 to 15 digits)");
    if (!isValidPassword(password))
      throwValidationError(
        "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number",
      );

    // Validate if the employee can register
    await authService.validateRegistrationData(employeeId, email);

    // Create and send OTP
    const otp = await otpService.createOTP(email, "registration");
    await emailService.sendOTP(email, otp, "registration");

    res
      .status(200)
      .json({ success: true, message: "OTP sent to email successfully" });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { employeeId, name, email, phone, password, otp } = req.body;

    // validating input existence
    if (!employeeId || !name || !email || !phone || !password || !otp) {
      throwValidationError("All fields and OTP are required!");
    }

    // validating input constraints
    if (!isValidEmployeeId(employeeId)) {
      throwValidationError("Employee ID must be a non-empty string");
    }
    if (!isValidName(name)) {
      throwValidationError("Name must be at least 2 characters long");
    }
    if (!isValidEmail(email)) {
      throwValidationError("Invalid email address format");
    }
    if (!isValidPhone(phone)) {
      throwValidationError("Phone number must be valid (10 to 15 digits)");
    }
    if (!isValidPassword(password)) {
      throwValidationError(
        "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number",
      );
    }

    // verify OTP first
    await otpService.verifyOTP(email, otp, "registration");

    // pass data to service layer
    const result = await authService.registerUser({
      employeeId,
      name,
      email,
      phone,
      password,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      ...result,
    });
  } catch (error) {
    next(error); // forward to global error handler
  }
};

const login = async (req, res, next) => {
  try {
    const { employeeId, password } = req.body;

    // validate inputs
    if (!employeeId || !password) {
      throwValidationError("Employee ID and password are required");
    }

    // call service layer
    const result = await authService.loginUser(employeeId, password);

    // generate OTP and send
    const otp = await otpService.createOTP(result.user.email, "login");
    await emailService.sendOTP(result.user.email, otp, "login");

    // return response with requireOtp mode
    res.status(200).json({
      success: true,
      message: "Credentials verified, OTP sent to email",
      requireOtp: true,
      tempToken: result.tempToken,
      email: result.user.email,
    });
  } catch (error) {
    next(error); // forward to global error handler
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const { tempToken, otp } = req.body;

    if (!tempToken || !otp) {
      throwValidationError("Temporary token and OTP are required");
    }

    // Decode tempToken
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      const error = new Error("Invalid or expired temporary session");
      error.statusCode = 401;
      throw error;
    }

    // Verify OTP
    await otpService.verifyOTP(decoded.email, otp, "login");

    // Get final auth token
    const token = authService.verifyLoginOtp(decoded.id);

    // Fetch user to return
    const user = await authService.getUserProfile(decoded.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    next(error); // forward to global error handler
  }
};

const signout = async (req, res, next) => {
  try {
    res.clearCookie("token");

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const userProfile = await authService.getUserProfile(req.user._id);

    res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // validate inputs
    if (!currentPassword || !newPassword) {
      throwValidationError("Current password and new password are required");
    }

    if (currentPassword === newPassword) {
      throwValidationError(
        "New password must be different from current password",
      );
    }

    // Add strength validation for the new password as well
    if (!isValidPassword(newPassword)) {
      throwValidationError(
        "New password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number",
      );
    }

    // call service layer
    await authService.changeUserPassword(userId, currentPassword, newPassword);

    // return success response
    res.status(200).json({
      success: true,
      message: "Password change successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      throwValidationError("Profile picture file is required");
    }

    const user = await authService.updateUserProfilePicture(req.user._id, {
      url: req.file.path,
      publicId: req.file.filename,
    });

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

const sendForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throwValidationError("Email is required");
    }

    if (!isValidEmail(email)) {
      throwValidationError("Invalid email address format");
    }

    // Verify user exists first to prevent sending OTPs to unregistered emails
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throwValidationError("No account found with this email address");
    }

    // Generate and send OTP
    const otp = await otpService.createOTP(email, "reset_password");
    await emailService.sendOTP(email, otp, "reset_password");

    res
      .status(200)
      .json({ success: true, message: "OTP sent to email successfully" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throwValidationError("Email, OTP, and new password are required");
    }

    if (!isValidPassword(newPassword)) {
      throwValidationError(
        "New password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number",
      );
    }

    // Verify OTP first
    const isOtpValid = await otpService.verifyOTP(email, otp, "reset_password");

    if (!isOtpValid) {
      throwValidationError("Invalid or expired OTP");
    }

    // Reset password via service layer
    await authService.resetUserPassword(email, newPassword);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      throwValidationError("Email and type are required");
    }

    if (!isValidEmail(email)) {
      throwValidationError("Invalid email address format");
    }

    // For login and reset_password, verify user exists
    if (type === "login" || type === "reset_password") {
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        throwValidationError("No account found with this email address");
      }
    }

    // Create and send OTP
    const otp = await otpService.createOTP(email, type);
    await emailService.sendOTP(email, otp, type);

    res.status(200).json({
      success: true,
      message: "OTP resent to email successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updatePhone = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throwValidationError("Phone number is required");
    }

    if (!isValidPhone(phone)) {
      throwValidationError("Phone number must be valid (10 to 15 digits)");
    }

    const user = await authService.updateUserPhone(req.user._id, phone);

    res.status(200).json({
      success: true,
      message: "Phone number updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendRegisterOtp,
  register,
  login,
  verifyLoginOtp,
  sendForgotPasswordOtp,
  resendOtp,
  resetPassword,
  signout,
  getMe,
  updatePhone,
  changePassword,
  updateProfilePicture,
};
