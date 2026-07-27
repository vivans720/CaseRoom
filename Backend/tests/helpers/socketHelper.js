const { io: Client } = require("socket.io-client");

const createSocketClient = (httpServer, token) => {
  const port = httpServer.address().port;

  return new Promise((resolve, reject) => {
    const socket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      resolve(socket);
    });

    socket.on("connect_error", (err) => {
      reject(err);
    });
  });
};

const waitForEvent = (socket, eventName, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

const disconnectSocket = (socket) => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

module.exports = {
  createSocketClient,
  waitForEvent,
  disconnectSocket,
};
