const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const notificationRoutes = require("./routes/notification.routes");
const caseRoutes = require("./routes/case.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//health check route
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running!",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/cases", caseRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", userRoutes);

app.use(errorHandler);

module.exports = app;
