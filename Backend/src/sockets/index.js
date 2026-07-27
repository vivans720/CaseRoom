const { Server } = require("socket.io");
const socketAuth = require("./socketAuth");
const registerSocketHandlers = require("./socketHandlers");
const presenceService = require("../services/presence.service");
const caseService = require("../services/case.service");

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  //authenticate every incoming socket connection

  io.use(socketAuth);

  //register event handlers for each connected socket

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    const personalRoomName = `user_${socket.user._id}`;
    await socket.join(personalRoomName);
    console.log(`Socket joined personal room: ${personalRoomName}`);

    registerSocketHandlers(io, socket);

    const isFirstConnection = presenceService.addUser(socket.user._id, socket.id);
    
    // Join case rooms for every connection (multi-tab support)
    try {
      const userCases = await caseService.getAllCases(socket.user._id);
      console.log(`[Socket] Syncing rooms for ${socket.user._id}. Found ${userCases.length} cases.`);
      
      const joinPromises = userCases.map(async (c) => {
        const roomName = `case_${c._id}`;
        await socket.join(roomName);
        console.log(`[Socket] User ${socket.user._id} joined room ${roomName}`);

        // Only broadcast online status for the very first connection
        if (isFirstConnection) {
          socket.to(roomName).emit("user_online", {
            userId: socket.user._id,
            caseId: c._id,
            name: socket.user.name,
          });
        }
      });

      await Promise.all(joinPromises);
    } catch (err) {
      console.error("[Socket] Failed to sync rooms:", err);
    }
  });

  return io;
};
module.exports = initializeSocket;
