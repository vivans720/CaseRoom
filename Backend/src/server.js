require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const http = require("http");
const initializeSocket = require("./sockets");
const { startWorker } = require("./services/ai/indexing.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    startWorker();

    const server = http.createServer(app);
    const io = initializeSocket(server);
    app.set("io", io);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV}`);
    });

    process.on("unhandledRejection", (err) => {
      console.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error("Server Startup Failed: ", error.message);
    process.exit(1);
  }
};

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception: ", err.message);
  process.exit(1);
});

startServer();
