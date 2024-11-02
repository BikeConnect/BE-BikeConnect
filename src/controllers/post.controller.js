"use strict";

const { SuccessResponse } = require("../core/success.response");
const PostFactory = require("../services/post.service");
const PostService = require("../services/post.service");

class PostController {
  createPost = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;  

      new SuccessResponse({
        message: "Create new Post success!",
        metadata: await PostService.createPost({
          ...req.body,
          ownerId: ownerId
        }),
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      const postId = req.params.postId;

      new SuccessResponse({
        message: "Update Post success!",
        metadata: await PostService.updatePost(postId, {
          ...req.body,
          ownerId: ownerId
        }),
      }).send(res);
    } catch (error) {
      next(error);
    }
  }

  deletePost = async (req, res, next) => {
    try {
      const postId = req.params.postId;
      console.log(req.params.postId);
      
      new SuccessResponse({
        message: "Delete Post success!",
        metadata: await PostFactory.deletePost(postId),
      }).send(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
