"use strict";

const { SuccessResponse } = require("../core/success.response");
const PostFactory = require("../services/post.service");
const PostService = require("../services/post.service");
const cloudinary = require("../configs/cloudinaryConfig");

// Owner
class PostController {
  createPost = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;

      let postData = {
        ...req.body,
        ownerId: ownerId,
      };

      postData.images = [];
      if (req.files) {
        if (req.files.images) {
          postData.images = postData.images.concat(
            req.files.images.map((file) => ({
              url: file.path,
              publicId: file.filename,
            }))
          );
        }
        if (req.files.image) {
          postData.images.push({
            url: req.files.image[0].path,
            publicId: req.files.image[0].filename,
          });
        }
      }

      new SuccessResponse({
        message: "Create new Post success!",
        metadata: await PostService.createPost(postData),
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      const postId = req.params.postId;

      const currentPost = await PostService.getPostById(postId);
      if (!currentPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (currentPost.ownerId.toString() !== ownerId) {
        if (req.files && req.files.images) {
          for (const file of req.files.images) {
            await cloudinary.uploader.destroy(file.filename);
          }
        }
        return res
          .status(403)
          .json({ message: "You are not authorized to update this post" });
      }

      let updateData = { ...req.body };

      if (req.files && req.files.images) {
        for (const image of currentPost.images) {
          await cloudinary.uploader.destroy(image.publicId);
        }

        updateData.images = req.files.images.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }));
      }

      const updatedPost = await PostService.updatePost(postId, updateData);

      new SuccessResponse({
        message: "Update Post success!",
        metadata: updatedPost,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  deletePost = async (req, res, next) => {
    try {
      const postId = req.params.postId;
      const ownerId = req.ownerId;

      const currentPost = await PostService.getPostById(postId);
      if (!currentPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (currentPost.ownerId.toString() !== ownerId) {
        return res
          .status(403)
          .json({ message: "You are not authorized to delete this post" });
      }

      new SuccessResponse({
        message: "Delete Post success!",
        metadata: await PostService.deletePost(postId),
      }).send(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PostController();
