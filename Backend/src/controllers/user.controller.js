const userService = require("../services/user.service");

const throwValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const parseExcludeIds = (excludeIds) => {
  if (typeof excludeIds !== "string") {
    return [];
  }

  return excludeIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

const searchUsers = async (req, res, next) => {
  try {
    const { q, excludeIds } = req.query;
    const searchTerm = typeof q === "string" ? q.trim() : "";

    if (searchTerm.length < 1) {
      throwValidationError("Search query is required");
    }

    const users = await userService.searchUsers(
      searchTerm,
      parseExcludeIds(excludeIds),
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
};
