"use strict";

const express = require("express");
const notificationController = require("../../controllers/notification.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const vehicleController = require("../../controllers/vehicle.controller");
const bookingController = require("../../controllers/home/bookingController");

// Owner/Customer
router.use(verifyToken);

router.get(
  "/sorted-by-distance",
  asyncHandler(vehicleController.getVehiclesSortedByDistance)
);

router.get("", asyncHandler(notificationController.listNotiByCus));

module.exports = router;
