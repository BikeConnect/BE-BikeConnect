"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const { handleImageUpload } = require("../../middlewares/multerHandler");
const postController = require("../../controllers/post.controller");

router.get(
  "/search/:keySearch",
  asyncHandler(postController.getListSearchPost)
);
router.get("/filter", asyncHandler(postController.filterPosts));

// Owner
router.use(verifyToken);
router.post("/", verifyToken, handleImageUpload, postController.createPost);
router.patch(
  "/vehicle/:vehicleId",
  handleImageUpload,
  asyncHandler(postController.updatePost)
);
router.delete(
  "/vehicle/:vehicleId",
  verifyToken,
  asyncHandler(postController.deleteVehicle)
);

router.get("/owner-list-posts", asyncHandler(postController.getAllPosts));

module.exports = router;
