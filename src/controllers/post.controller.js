"use strict";

const { SuccessResponse } = require("../core/success.response");
// const PostFactory = require("../services/post.service");
const PostService = require("../services/post.service");
const cloudinary = require("../configs/cloudinaryConfig");
const { dateValidate } = require("../utils/validation");
const { calculateDistance } = require("../services/location.service");
const postModel = require("../models/postModel"); 

// Owner
class PostController {
  createPost = async (req, res, next) => {
    try {
      const { error } = dateValidate(req.body);
      if (error) {
        if (req.files && req.files.images) {
          for (const file of req.files.images) {
            await cloudinary.uploader.destroy(file.filename);
          }
        }
        return res.status(400).json({
          success: false,
          errors: error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
          }))
        });
      }
      
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
      if (req.files && req.files.images) {
        for (const file of req.files.images) {
          await cloudinary.uploader.destroy(file.filename);
        }
      }
      next(error);
    }
  };

  updatePost = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      const postId = req.params.postId;
      const { error } = dateValidate(req.body);
      
      if (error) {
        if (req.files && req.files.images) {
          for (const file of req.files.images) {
            await cloudinary.uploader.destroy(file.filename);
          }
        }
        return res.status(400).json({
          success: false,
          errors: error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
          }))
        });
      }

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

  getListSearchPost = async (req, res, next) => {
    new SuccessResponse({
      message: "Get list getListSearchPost success!",
      metadata: await PostService.getListSearchPost(req.params),
    }).send(res);
  };

  getPostsSortedByDistance = async (req, res, next) => {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    try {
      const posts = await postModel.find().populate('ownerId');

      const distances = await Promise.all(posts.map(async (post) => {
        const ownerAddress = post.ownerId.currentAddress;
        const distance = await calculateDistance(address, ownerAddress);
        return { post, distance };
      }));

      distances.sort((a, b) => a.distance.value - b.distance.value);

      res.json({
        message: "Posts sorted by distance",
        posts: distances.map(item => ({
          post: item.post,
          distance: item.distance
        }))
      });
    } catch (error) {
      console.error("Error fetching posts sorted by distance:", error.message);
      return next(error);
    }
  };

  filterPosts = async (req, res, next) => {
    try {
      const filterOptions = {
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        category: req.query.category,
        brand: req.query.brand,
        availability_status: req.query.availability_status,
        rating: req.query.rating,
        minRating: req.query.minRating,
        maxRating: req.query.maxRating,
        sortBy: req.query.sortBy,
      };

      new SuccessResponse({
        message: "Filter posts success!",
        metadata: await PostService.filterPosts(filterOptions),
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getDistance
}

module.exports = new PostController();
