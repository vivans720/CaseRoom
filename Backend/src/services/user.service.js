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
    $or: [{ name: searchRegex }, { employeeId: searchRegex }],
  };

  if (validExcludeIds.length > 0) {
    filter._id = { $nin: validExcludeIds };
  }

  return User.find(filter)
    .select("-passwordHash")
    .sort({ name: 1, employeeId: 1 })
    .lean();
};

module.exports = {
  searchUsers,
};
