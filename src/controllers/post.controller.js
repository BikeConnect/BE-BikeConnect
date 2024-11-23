"use strict";

const { SuccessResponse } = require("../core/success.response");
const PostFactory = require("../services/post.service");
const PostService = require("../services/post.service");
const cloudinary = require("../configs/cloudinaryConfig");
const { dateValidate } = require("../utils/validation");
const { calculateDistance } = require("../services/location.service");
const postModel = require("../models/postModel");

// Owner
class PostController {
  createPost = async (req, res, next) => {
    try {
      const quantity = parseInt(req.body.quantity);
      const ownerId = req.ownerId;
      let vehicles;

      if (!req.body.vehicles) {
        return res.status(400).json({
          success: false,
          message: "Vehicles data is required"
        });
      }

      try {
        vehicles = JSON.parse(req.body.vehicles);
      } catch (error) {
        console.error('JSON parse error:', error);
        return res.status(400).json({
          success: false,
          message: "Invalid vehicles JSON format"
        });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than 0",
        });
      }

      if (!Array.isArray(vehicles) || vehicles.length !== quantity) {
        return res.status(400).json({
          success: false,
          message: `Must provide details for exactly ${quantity} vehicles`
        });
      }

      if (req.files) {
        vehicles.forEach((vehicle, index) => {
          const vehicleImages = req.files[`vehicle${index}_images`];
          if (vehicleImages && Array.isArray(vehicleImages)) {
            vehicle.images = vehicleImages.map((file) => ({
              url: file.path,
              publicId: file.filename
            }));
          }
        });
      }

      const newPost = await PostFactory.createPostWithVehicles({
        ownerId,
        quantity,
        vehicles,
      });

      new SuccessResponse({
        message: "Created post with vehicles successfully",
        metadata: newPost,
      }).send(res);
    } catch (error) {
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
          errors: error.details.map((detail) => ({
            field: detail.path[0],
            message: detail.message,
          })),
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
      const posts = await postModel.find().populate("ownerId");

      const distances = await Promise.all(
        posts.map(async (post) => {
          const ownerAddress = post.ownerId.currentAddress;
          const distance = await calculateDistance(address, ownerAddress);
          return { post, distance };
        })
      );

      distances.sort((a, b) => a.distance.value - b.distance.value);

      res.json({
        message: "Posts sorted by distance",
        posts: distances.map((item) => ({
          post: item.post,
          distance: item.distance,
        })),
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

  getAllPosts = async (req, res, next) => {
    try {
      const ownerId = req.ownerId; // Lấy ownerId từ token đã được verify
      console.log(ownerId);
      const posts = await PostService.getAllPosts(ownerId);
      console.log(posts);

      new SuccessResponse({
        message: "Get all posts successfully",
        metadata: posts,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PostController();
