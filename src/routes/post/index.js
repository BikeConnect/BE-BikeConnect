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
router.post("", handleImageUpload, asyncHandler(postController.createPost));
router.patch(
  "/:postId",
  handleImageUpload,
  asyncHandler(postController.updatePost)
);
router.delete("/:postId", asyncHandler(postController.deletePost));

router.get("/owner-list-posts", asyncHandler(postController.getAllPosts));

module.exports = router;
