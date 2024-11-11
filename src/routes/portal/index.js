"use strict";

const express = require("express");
const notificationController = require("../../controllers/notification.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const postController = require("../../controllers/post.controller");

// Owner/Customer
router.use(verifyToken);

router.get("/sorted-by-distance", async (req, res) => {
  await postController.getPostsSortedByDistance(req, res);
});

router.get(
  "",
  asyncHandler(notificationController.listNotiByCus)
);

module.exports = router;
