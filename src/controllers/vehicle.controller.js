"use strict";

const { SuccessResponse } = require("../core/success.response");
const VehicleService = require("../services/vehicle.service");
const cloudinary = require("../configs/cloudinaryConfig");
const { dateValidate } = require("../utils/validation");
const { calculateDistance } = require("../services/location.service");
const vehicle = require("../models/vehicleModel");

class VehicleController {
  createVehicle = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      let vehicleData;

      if (!req.body.vehicle && !req.body.brand) {
        return res.status(400).json({
          success: false,
          message: "Vehicle data is required",
        });
      }

      try {
        vehicleData =
          typeof req.body.vehicle === "string"
            ? JSON.parse(req.body.vehicle)
            : req.body.vehicle;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle data format",
        });
      }

      if (req.files && req.files.length > 0) {
        vehicleData.images = req.files.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }));
      }

      if (!vehicleData.discount) {
        vehicleData.discount = 0;
      }

      const createdVehicle = await vehicle.create({
        ...vehicleData,
        ownerId,
      });

      new SuccessResponse({
        message: "Created vehicle successfully",
        metadata: createdVehicle,
      }).send(res);
    } catch (error) {
      if (vehicleData && vehicleData.images) {
        await Promise.all(
          vehicleData.images.map((img) =>
            cloudinary.uploader.destroy(img.publicId)
          )
        );
      }
      next(error);
    }
  };

  updateVehicle = async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const ownerId = req.ownerId;
      let updateData;

      try {
        updateData =
          typeof req.body.vehicle === "string"
            ? JSON.parse(req.body.vehicle)
            : req.body.vehicle || {};
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle data format",
        });
      }

      const currentVehicle = await vehicle.findOne({
        _id: vehicleId,
        ownerId,
      });

      if (!currentVehicle) {
        return res.status(404).json({
          message: "Vehicle not found or you're not authorized",
        });
      }

      if (req.files?.length > 0) {
        try {
          if (currentVehicle.images?.length > 0) {
            await Promise.all(
              currentVehicle.images
                .filter((img) => img.publicId)
                .map((img) => cloudinary.uploader.destroy(img.publicId))
            );
          }

          updateData.images = req.files.map((file) => ({
            url: file.path,
            publicId: file.filename,
          }));
        } catch (error) {
          throw new Error("Error processing images: " + error.message);
        }
      }

      const requiredFields = [
        "brand",
        "model",
        "price",
        "description",
        "address",
        "license",
      ];

      const missingFields = requiredFields.filter(
        (field) => !updateData[field]
      );
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      const allowedFields = [
        ...requiredFields,
        "discount",
        "startDate",
        "endDate",
        "availableDates",
        "images",
      ];

      const filteredUpdate = Object.keys(updateData)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      const updatedVehicle = await vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: filteredUpdate },
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      );

      new SuccessResponse({
        message: "Vehicle updated successfully",
        metadata: updatedVehicle,
      }).send(res);
    } catch (error) {
      if (req.files?.length > 0) {
        await Promise.all(
          req.files.map((file) => cloudinary.uploader.destroy(file.filename))
        );
      }
      next(error);
    }
  };

  deleteVehicle = async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const ownerId = req.ownerId;

      const vehicleToDelete = await vehicle.findOne({
        _id: vehicleId,
        ownerId: ownerId,
      });

      if (!vehicleToDelete) {
        return res.status(404).json({
          message: "Vehicle not found or you're not authorized",
        });
      }

      if (vehicleToDelete.images?.length > 0) {
        await Promise.all(
          vehicleToDelete.images
            .filter((image) => image.publicId)
            .map((image) => cloudinary.uploader.destroy(image.publicId))
        );
      }

      await vehicle.findByIdAndDelete(vehicleId);

      new SuccessResponse({
        message: "Vehicle deleted successfully",
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getVehicleById = async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const vehicleData = await vehicle
        .findById(vehicleId)
        .populate("ownerId", "name email currentAddress phone");

      if (!vehicleData) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      console.log("vehicleData::::",vehicleData);
      new SuccessResponse({
        message: "Vehicle retrieved successfully",
        metadata: vehicleData,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getOwnerVehicles = async (req, res, next) => {
    try {
      const ownerId = req.ownerId;
      const vehicles = await vehicle.find({ ownerId }).sort({ createdAt: -1 });

      new SuccessResponse({
        message: "Owner vehicles retrieved successfully",
        metadata: vehicles,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getAllVehiclesPublic = async (req, res, next) => {
    try {
      const vehicles = await vehicle
        .find()
        .populate("ownerId", "name email currentAddress")
        .sort({ createdAt: -1 });

      new SuccessResponse({
        message: "All vehicles retrieved successfully",
        metadata: vehicles,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getVehiclesSortedByDistance = async (req, res, next) => {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    try {
      const vehicles = await vehicle
        .find()
        .populate("ownerId", "name email currentAddress");

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
      console.error(
        "Error fetching vehicles sorted by distance:",
        error.message
      );
      return next(error);
    }
  };

  filterVehicles = async (req, res, next) => {
    try {
      const filterOptions = {
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        brand: req.query.brand,
        availability_status: req.query.availability_status,
        rating: req.query.rating,
        minRating: req.query.minRating,
        maxRating: req.query.maxRating,
        sortBy: req.query.sortBy,
      };

      const filteredVehicles = await VehicleService.filterVehicles(
        filterOptions
      );

      new SuccessResponse({
        message: "Filter vehicles success!",
        metadata: filteredVehicles,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };

  getListSearchVehicles = async (req, res, next) => {
    try {
      const { keySearch } = req.query;

      if (!keySearch) {
        return res.status(400).json({
          message: "Search key is required",
        });
      }

      const searchResults = await VehicleService.getListSearchVehicles({
        keySearch,
      });

      new SuccessResponse({
        message: "Search vehicles success!",
        metadata: searchResults,
      }).send(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new VehicleController();
