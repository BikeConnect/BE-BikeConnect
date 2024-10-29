"use strict";

const express = require("express");
const postController = require("../../controllers/post.controller");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const { handleImageUpload } = require("../../middlewares/multerHandler");

router.get('/search/:keySearch', asyncHandler(postController.getListSearchPost))

// Owner
router.use(verifyToken);
router.post(
  "",
  handleImageUpload,
  asyncHandler(postController.createPost)
);
router.patch(
  "/:postId",
  handleImageUpload,
  asyncHandler(postController.updatePost)
);
router.delete("/:postId", asyncHandler(postController.deletePost));

module.exports = router;
