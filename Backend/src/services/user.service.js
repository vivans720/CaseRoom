const mongoose = require("mongoose");
const User = require("../models/User");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeExcludeIds = (excludeIds = []) => {
  if (!Array.isArray(excludeIds)) {
    return [];
  }

  return excludeIds
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
};

const searchUsers = async (query, excludeIds = []) => {
  const searchTerm = typeof query === "string" ? query.trim() : "";
  const escapedSearchTerm = escapeRegex(searchTerm);
  const searchRegex = new RegExp(escapedSearchTerm, "i");
  const validExcludeIds = normalizeExcludeIds(excludeIds);

  const filter = {
    $or: [{ name: searchRegex }, { employeeId: searchRegex }, { roleName: searchRegex }, { skills: searchRegex }],
  };

  if (validExcludeIds.length > 0) {
    filter._id = { $nin: validExcludeIds };
  }

  return User.find(filter)
    .select("-passwordHash")
    .sort({ name: 1, employeeId: 1 })
    .lean();
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const { name, phone, roleName, skills } = updateData;

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (typeof name === "string" && name.trim()) {
    user.name = name.trim();
  }
  if (typeof phone === "string" && phone.trim()) {
    user.phone = phone.trim();
  }
  if (typeof roleName === "string") {
    user.roleName = roleName.trim();
  }
  if (Array.isArray(skills)) {
    user.skills = skills.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof skills === "string") {
    user.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  await user.save();
  const updated = user.toObject();
  delete updated.passwordHash;
  return updated;
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateUserProfile,
};
