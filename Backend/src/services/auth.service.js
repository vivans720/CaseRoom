const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

const extractPublicId = (url) => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const uploadIndex = pathParts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) return null;

    let startIndex = uploadIndex + 1;
    if (pathParts[startIndex] && /^v\d+$/.test(pathParts[startIndex])) {
      startIndex += 1;
    }

    const relevantParts = pathParts.slice(startIndex);
    const lastPart = relevantParts[relevantParts.length - 1];
    const lastPartWithoutExt =
      lastPart.substring(0, lastPart.lastIndexOf(".")) || lastPart;
    relevantParts[relevantParts.length - 1] = lastPartWithoutExt;

    return relevantParts.join("/");
  } catch (_error) {
    return null;
  }
};

const toUserResponse = (user) => {
  const userResponse = user.toObject();
  delete userResponse.passwordHash;
  return userResponse;
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const generateTempToken = (userId, email) => {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
    expiresIn: "15m", // Short lived token for OTP step
  });
};

const validateRegistrationData = async (employeeId, email) => {
  //checking if user already exists
  const existingUser = await User.findOne({
    $or: [{ employeeId }, { email }],
  });

  if (existingUser) {
    const errorMsg =
      existingUser.employeeId === employeeId
        ? "User with this Employee ID already exists"
        : "User with this Email already exists";

    const error = new Error(errorMsg);
    error.statusCode = 400;
    throw error;
  }

  // checking if the employeeId belongs to a valid employee of the company
  const EmployeeRecord = require("../models/EmployeeRecord");
  const isValidEmployee = await EmployeeRecord.findOne({ employeeId });

  if (!isValidEmployee) {
    const error = new Error(
      "Invalid Employee ID. Not found in company records.",
    );
    error.statusCode = 400;
    throw error;
  }

  return true;
};

const registerUser = async (userData) => {
  const { employeeId, name, email, phone, password } = userData;

  // We assume validateRegistrationData was already called prior to sending OTP.
  // But doing a double check is safe.
  await validateRegistrationData(employeeId, email);

  //hashing the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  //creating user
  const newUser = await User.create({
    employeeId,
    name,
    email,
    phone,
    passwordHash,
  });

  //Generate token

  const token = generateToken(newUser._id);

  return { user: toUserResponse(newUser), token };
};

const loginUser = async (employeeId, password) => {
  const cleanId = employeeId ? employeeId.trim() : "";
  // check user (case-insensitive employeeId)
  const user = await User.findOne({
    employeeId: { $regex: new RegExp(`^${cleanId}$`, "i") },
  });

  if (!user) {
    const error = new Error("Invalid Employee ID or Password");
    error.statusCode = 401;
    throw error;
  }

  //compare password

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    const error = new Error("Invalid Employee ID or Password");
    error.statusCode = 401;
    throw error;
  }

  //Generate Temp Token for OTP step
  const tempToken = generateTempToken(user._id, user.email);

  return { user: toUserResponse(user), tempToken };
};

const verifyLoginOtp = (userId) => {
  // Generate the final auth token
  return generateToken(userId);
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return toUserResponse(user);
};

const updateUserPhone = async (userId, phone) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.phone = phone;
  await user.save();

  return toUserResponse(user);
};

const updateUserProfilePicture = async (userId, fileData) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const nextUrl = fileData?.url;
  const nextPublicId = fileData?.publicId || extractPublicId(nextUrl);

  if (!nextUrl || !nextPublicId) {
    const error = new Error("Invalid profile picture upload");
    error.statusCode = 400;
    throw error;
  }

  const previousPublicId = user.profilePicturePublicId;

  user.profilePictureUrl = nextUrl;
  user.profilePicturePublicId = nextPublicId;
  await user.save();

  if (previousPublicId && previousPublicId !== nextPublicId) {
    try {
      await cloudinary.uploader.destroy(previousPublicId, {
        resource_type: "image",
      });
    } catch (_error) {
      // Best effort cleanup.
    }
  }

  return toUserResponse(user);
};

const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  //verify current password

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Incorrect current password");
    error.statusCode = 401;
    throw error;
  }

  //Hash the new password

  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  //Update and save

  user.passwordHash = newPasswordHash;
  await user.save();

  return true;
};

const resetUserPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("No account found with this email address");
    error.statusCode = 404;
    throw error;
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update and save
  user.passwordHash = passwordHash;
  await user.save();

  return true;
};
module.exports = {
  validateRegistrationData,
  registerUser,
  loginUser,
  verifyLoginOtp,
  getUserProfile,
  updateUserPhone,
  changeUserPassword,
  resetUserPassword,
  updateUserProfilePicture,
  generateToken, // Exported if controllers need to manually sign final token
};
