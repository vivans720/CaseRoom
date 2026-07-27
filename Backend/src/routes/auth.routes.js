const express = require("express");

const {
  sendRegisterOtp,
  register,
  login,
  verifyLoginOtp,
  sendForgotPasswordOtp,
  resendOtp,
  resetPassword,
  signout,
  getMe,
  updatePhone,
  changePassword,
  updateProfilePicture,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/authMiddleware");
const { handleImageUpload } = require("../middleware/upload");

const router = express.Router();

router.post("/register/send-otp", sendRegisterOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/login/verify", verifyLoginOtp);
router.post("/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/forgot-password/reset", resetPassword);
router.post("/resend-otp", resendOtp);
router.post("/signout", signout);

//protected routes

router.get("/me", protect, getMe);
router.patch("/phone", protect, updatePhone);
router.post("/change-password", protect, changePassword);
router.patch(
  "/profile-picture",
  protect,
  handleImageUpload,
  updateProfilePicture,
);

module.exports = router;
