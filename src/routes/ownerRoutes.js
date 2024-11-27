"use strict";

const ownerController = require("../controllers/ownerController");
const { verifyToken } = require("../middlewares/verifyToken");
const router = require("express").Router();

router.get("/get-owner/:ownerId", verifyToken, ownerController.get_owner);

router.get("/get-owner-request", verifyToken, ownerController.get_owner_request);

router.post("/update-owner-status", verifyToken, ownerController.update_owner_status);

router.get("/get-active-owner", verifyToken, ownerController.get_active_owner);

router.get("/get-deactive-owner", verifyToken, ownerController.get_deactive_owner);

router.post("/add-profile-info",verifyToken,ownerController.add_owner_profile);

router.post("/update-booking-request",verifyToken, ownerController.update_booking_status);

router.post("/owner/upload-profile-image", verifyToken, ownerController.upload_owner_profile_image);

module.exports = router;