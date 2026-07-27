const express = require("express");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/search", userController.searchUsers);

module.exports = router;
