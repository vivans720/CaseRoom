// In-memory store to track online status
// Maps userId (string) -> Set of active socketIds (string)
const onlineUsers = new Map();

//Registers an active socket connection for a user.

const addUser = (userId, socketId) => {
  const normalizedUserId = userId.toString();

  if (!onlineUsers.has(normalizedUserId)) {
    onlineUsers.set(normalizedUserId, new Set([socketId]));
    return true; // User just came online
  }

  const userSockets = onlineUsers.get(normalizedUserId);
  userSockets.add(socketId);
  return false; // User was already online elsewhere
};

//Removes a disconnected socket connection for a user.
const removeUser = (userId, socketId) => {
  const normalizedUserId = userId.toString();

  if (!onlineUsers.has(normalizedUserId)) {
    return true; // Failsafe state
  }

  const userSockets = onlineUsers.get(normalizedUserId);
  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    onlineUsers.delete(normalizedUserId);
    return true; // User is now fully offline
  }

  return false; // User still has other active connections
};

// Checks if a user has any active connections.

const isOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

//Filters a list of case participants to return only those currently online.

const getOnlineUsersForCase = (populatedParticipants) => {
  if (!Array.isArray(populatedParticipants)) {
    return [];
  }

  return populatedParticipants.filter((participant) =>
    isOnline(participant._id),
  );
};

module.exports = {
  addUser,
  removeUser,
  isOnline,
  getOnlineUsersForCase,
};
