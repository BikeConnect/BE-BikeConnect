"use strict";

const express = require("express");
const notificationController = require("../../controllers/notification.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const vehicleController = require("../../controllers/vehicle.controller");

// Owner/Customer
router.use(verifyToken);

router.get("/sorted-by-distance", async (req, res) => {
  await vehicleController.getPostsSortedByDistance(req, res);
});

router.get(
  "",
  asyncHandler(notificationController.listNotiByCus)
);

router.get(
  "/all-notifications",
  asyncHandler(notificationController.getAllNotifications)
);

module.exports = router;
