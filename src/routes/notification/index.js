"use strict";

const express = require("express");
const notificationController = require("../../controllers/notification.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");

// Owner/Customer
router.use(verifyToken);
router.get(
  "",
  asyncHandler(notificationController.listNotiByCus)
);

module.exports = router;
