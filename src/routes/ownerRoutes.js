"use strict";

const ownerController = require("../controllers/ownerController");
const { verifyToken } = require("../middlewares/verifyToken");
const router = require("express").Router();

router.get("/get-owner/:ownerId", verifyToken, ownerController.get_owner);

router.get("/get-owner-request", verifyToken, ownerController.get_owner_request);

router.post("/update-owner-status", verifyToken, ownerController.update_owner_status);

router.get("/get-active-owner", verifyToken, ownerController.get_active_owner);

router.get("/get-deactive-owner", verifyToken, ownerController.get_deactive_owner);

router.post("/add-profile-info", verifyToken, ownerController.add_owner_profile);

router.post("/update-booking-request", verifyToken, ownerController.update_booking_status);

router.post("/owner/upload-profile-image", verifyToken, ownerController.upload_owner_profile_image);

router.get("/owner/get-customer-booking-request", verifyToken, ownerController.get_customer_booking_request);

router.get("/owner/get-owner-all-bookings-history", verifyToken, ownerController.get_owner_all_bookings_history);

router.get("/owner/get-owner-vehicles", verifyToken, ownerController.get_owner_vehicles);

router.put("/owner/update-vehicle-status/:vehicleId", verifyToken, ownerController.update_vehicle_status);

// router.put(
//   "/owner/update-profile",
//   verifyToken,
//   ownerController.owner_update_profile
// );

// router.patch(
//   "/owner/upload-identity-card",
//   verifyToken,
//   ownerController.upload_owner_identity_card
// );
module.exports = router;
