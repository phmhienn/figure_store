const express = require("express");

const userController = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyOtp,
  validateUpdateProfile,
  validateChangePassword,
} = require("../middlewares/validationMiddleware");
const { authLimiter } = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validateRegister,
  userController.register,
);
router.post("/login", authLimiter, validateLogin, userController.login);
router.post(
  "/forgot-password",
  authLimiter,
  validateForgotPassword,
  userController.forgotPassword,
);
router.post(
  "/verify-otp",
  authLimiter,
  validateVerifyOtp,
  userController.verifyPasswordOtp,
);
router.post(
  "/reset-password",
  authLimiter,
  validateResetPassword,
  userController.resetPassword,
);
router.post("/refresh", userController.refreshAccessToken);
router.post("/logout", userController.logout);
router.get("/me", protect, userController.getCurrentUser);
router.get("/me/address", protect, userController.getDefaultAddress);
router.put(
  "/me",
  protect,
  validateUpdateProfile,
  userController.updateCurrentUser,
);
router.put(
  "/me/password",
  protect,
  validateChangePassword,
  userController.changePassword,
);
// Admin staff management
router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  userController.getAllUsers,
);
router.post(
  "/admin",
  protect,
  authorizeRoles("admin"),
  userController.createStaffUser,
);
router.put(
  "/admin/:id",
  protect,
  authorizeRoles("admin"),
  userController.updateUser,
);
router.delete(
  "/admin/:id",
  protect,
  authorizeRoles("admin"),
  userController.deleteUser,
);

module.exports = router;
