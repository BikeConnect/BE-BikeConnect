"use strict";

const { SuccessResponse } = require("../core/success.response");
const PostFactory = require("../services/post.service");
const PostService = require("../services/post.service");
const cloudinary = require("../configs/cloudinaryConfig");
const { dateValidate } = require("../utils/validation");
const { calculateDistance } = require("../services/location.service");
const postModel = require("../models/postModel");
const vehicle = require("../models/vehicleModel");

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
          message: "Vehicles data is required",
        });
      }

      try {
        vehicles = JSON.parse(req.body.vehicles);
      } catch (error) {
        console.error("JSON parse error:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid vehicles JSON format",
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
          message: `Must provide details for exactly ${quantity} vehicles`,
        });
      }

      if (req.files) {
        vehicles.forEach((vehicle, index) => {
          const vehicleImages = req.files[`vehicle${index}_images`];
          if (vehicleImages && Array.isArray(vehicleImages)) {
            vehicle.images = vehicleImages.map((file) => ({
              url: file.path,
              publicId: file.filename,
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
      const vehicleId = req.params.vehicleId;

      let updateData = { ...req.body };

      if (updateData.startDate) {
        const date = new Date(updateData.startDate);
        date.setHours(12, 0, 0, 0);
        updateData.startDate = date;
      }
      if (updateData.endDate) {
        const date = new Date(updateData.endDate);
        date.setHours(12, 0, 0, 0);
        updateData.endDate = date;
      }

      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate).toISOString();
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate).toISOString();
      }

      if (typeof req.body.vehicles === "string") {
        try {
          req.body.vehicles = JSON.parse(req.body.vehicles);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: "Invalid vehicles JSON format",
          });
        }
      }

      const { error } = dateValidate(req.body);

      if (error) {
        if (req.files) {
          Object.keys(req.files).forEach(async (key) => {
            for (const file of req.files[key]) {
              await cloudinary.uploader.destroy(file.filename);
            }
          });
        }
        return res.status(400).json({
          success: false,
          errors: error.details.map((detail) => ({
            field: detail.path[0],
            message: detail.message,
          })),
        });
      }

      const currentVehicle = await vehicle.findById(vehicleId).populate({
        path: "postId",
        select: "ownerId",
      });

      if (!currentVehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      if (currentVehicle.postId.ownerId.toString() !== ownerId) {
        if (req.files) {
          Object.keys(req.files).forEach(async (key) => {
            for (const file of req.files[key]) {
              await cloudinary.uploader.destroy(file.filename);
            }
          });
        }
        return res
          .status(403)
          .json({ message: "You are not authorized to update this vehicle" });
      }

      if (req.files && req.files.images) {
        if (currentVehicle.images && currentVehicle.images.length > 0) {
          for (const image of currentVehicle.images) {
            if (image.publicId) {
              await cloudinary.uploader.destroy(image.publicId);
            }
          }
        }

        updateData.images = req.files.images.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }));
      }

      const updatedVehicle = await vehicle.findByIdAndUpdate(
        vehicleId,
        updateData,
        { new: true }
      );

      new SuccessResponse({
        message: "Update Vehicle success!",
        metadata: updatedVehicle,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  deleteVehicle = async (req, res, next) => {
    try {
      const vehicleId = req.params.vehicleId;
      const ownerId = req.ownerId;

      const currentVehicle = await vehicle.findById(vehicleId).populate({
        path: "postId",
        select: "ownerId vehicles",
      });

      if (!currentVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      if (currentVehicle.postId.ownerId.toString() !== ownerId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this vehicle",
        });
      }

      if (currentVehicle.images && currentVehicle.images.length > 0) {
        for (const image of currentVehicle.images) {
          if (image.publicId) {
            await cloudinary.uploader.destroy(image.publicId);
          }
        }
      }

      const [deletedVehicle, updatedPost] = await Promise.all([
        vehicle.findByIdAndDelete(vehicleId),
        postModel.findByIdAndUpdate(
          currentVehicle.postId._id,
          {
            $pull: { vehicles: vehicleId },
            $inc: { quantity: -1 },
          },
          { new: true }
        ),
      ]);

      new SuccessResponse({
        message: "Delete Vehicle success!",
        metadata: {
          deletedVehicle,
          updatedPost,
        },
      }).send(res);
    } catch (error) {
      console.error("Delete vehicle error:", error);
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
      const vehicles = await vehicle.find().populate({
        path: "postId",
        select: "ownerId quantity",
        populate: {
          path: "ownerId",
          select: "name email",
        },
      });

      const distances = await Promise.all(
        vehicles.map(async (vehicle) => {
          const vehicleAddress = vehicle.address;
          const distance = await calculateDistance(address, vehicleAddress);
          return { vehicle, distance };
        })
      );

      distances.sort((a, b) => a.distance.value - b.distance.value);

      res.json({
        message: "Vehicles sorted by distance",
        vehicles: distances.map((item) => ({
          vehicle: item.vehicle,
          distance: item.distance,
        })),
      }); 
    } catch (error) {
      console.error("Error fetching vehicles sorted by distance:", error.message);
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

  getAllVehicles = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      const vehicles = await PostService.getAllVehicles(ownerId);

      new SuccessResponse({
        message: "Get all vehicles successfully",
        metadata: vehicles,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getAllVehiclesPublic = async (req, res, next) => {
    try {
      const vehicles = await PostService.getAllVehiclesPublic();
  
      new SuccessResponse({
        message: "Get all vehicles successfully",
        metadata: vehicles,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PostController();
