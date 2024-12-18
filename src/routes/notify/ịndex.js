"use strict";

const express = require("express");
const notificationController = require("../../controllers/notification.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");

// Owner/Customer
router.use(verifyToken);

router.get(
  "/all-notifications",
  asyncHandler(notificationController.getAllNotifications)
);

router.get(
  "/owner/notifications",
  verifyToken,
  notificationController.getOwnerNotifications
);

// Customer notifications
router.get(
  "/customer/notifications",
  verifyToken,
  notificationController.getCustomerNotifications
);

// Mark notification as read
router.patch(
  "/notifications/:notificationId/mark-read",
  verifyToken,
  notificationController.markAsRead
);

module.exports = router;
