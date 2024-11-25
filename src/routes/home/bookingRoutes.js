"use strict";

const bookingController = require("../../controllers/home/bookingController");
const { verifyToken } = require("../../middlewares/verifyToken");
const   router = require("express").Router();


router.get("/find-booking", bookingController.get_bookings);
router.get("/check-booking/:postId", bookingController.check_specific_booking);
router.post("/create-booking",verifyToken, bookingController.customer_submit_booking);
// router.post("/confirm-booking/:contractId",verifyToken, bookingController.confirm_booking_contract);

module.exports = router;
