"use strict";

const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/home/reviewController");
const { verifyToken } = require("../../middlewares/verifyToken");

router.post("/add-reply/:reviewId", verifyToken, reviewController.add_reply);
router.put("/update-reply/:reviewId", verifyToken, reviewController.update_reply);
router.delete("/delete-reply/:reviewId", verifyToken, reviewController.delete_reply);

module.exports = router;
