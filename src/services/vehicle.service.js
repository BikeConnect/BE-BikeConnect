"use strict";

const vehicle = require("../models/vehicleModel");
const cloudinary = require("../configs/cloudinaryConfig");
const { removeUndefinedObject, updateNestedObjectParser } = require("../utils");
const {
  searchPostByCustomer,
  filterPosts,
  searchVehiclesByCustomer,
} = require("../models/repositories/vehicle.repo");
const moment = require("moment");
const { pushNotification } = require("./notification.service");

// Owner
class VehicleService {
  static async createVehicles(payload) {
    try {
      const createdVehicles = await Promise.all(
        payload.vehicles.map(async (vehicleData) => {
          return vehicle.create({
            ownerId: payload.ownerId,
            name: vehicleData.name,
            category: vehicleData.category,
            brand: vehicleData.brand,
            price: vehicleData.price,
            discount: vehicleData.discount,
            description: vehicleData.description,
            model: vehicleData.model,
            images: vehicleData.images || [],
            rating: vehicleData.rating || 5,
            address: vehicleData.address,
            availability_status: "available",
            license: vehicleData.license,
            startDate: vehicleData.startDate,
            endDate: vehicleData.endDate,
            availableDates: vehicleData.availableDates || [],
          });
        })
      );

      return createdVehicles;
    } catch (error) {
      throw new Error(`Error creating vehicles: ${error.message}`);
    }
  }

  static async updateVehicle(vehicleId, updateData) {
    try {
      const updatedVehicle = await vehicle.findByIdAndUpdate(
        vehicleId,
        updateData,
        { new: true }
      );
      return updatedVehicle;
    } catch (error) {
      throw new Error(`Error updating vehicle: ${error.message}`);
    }
  }

  static async deleteVehicle(vehicleId) {
    try {
      const deletedVehicle = await vehicle.findByIdAndDelete(vehicleId);
      return deletedVehicle;
    } catch (error) {
      throw new Error(`Error deleting vehicle: ${error.message}`);
    }
  }

  static async getListSearchVehicles({ keySearch }) {
    try {
      const searchRegex = new RegExp(keySearch, "i");

      const vehicles = await vehicle
        .find({
          $or: [
            { brand: searchRegex },
            { model: searchRegex },
            { description: searchRegex },
            { address: searchRegex },
          ],
        })
        .populate("ownerId", "name email currentAddress");

      return vehicles;
    } catch (error) {
      throw new Error(`Error searching vehicles: ${error.message}`);
    }
  }

  static async filterVehicles(filterOptions) {
    try {
      let query = {};

      if (filterOptions.minPrice || filterOptions.maxPrice) {
        query.price = {};
        if (filterOptions.minPrice)
          query.price.$gte = Number(filterOptions.minPrice);
        if (filterOptions.maxPrice)
          query.price.$lte = Number(filterOptions.maxPrice);
      }

      if (filterOptions.brand) {
        query.brand = new RegExp(filterOptions.brand, "i");
      }

      if (filterOptions.availability_status) {
        query.availability_status = filterOptions.availability_status;
      }

      if (filterOptions.minRating || filterOptions.maxRating) {
        query.rating = {};
        if (filterOptions.minRating)
          query.rating.$gte = Number(filterOptions.minRating);
        if (filterOptions.maxRating)
          query.rating.$lte = Number(filterOptions.maxRating);
      }

      let vehicles = vehicle.find(query);

      if (filterOptions.sortBy) {
        switch (filterOptions.sortBy) {
          case "price_asc":
            vehicles = vehicles.sort({ price: 1 });
            break;
          case "price_desc":
            vehicles = vehicles.sort({ price: -1 });
            break;
          case "rating_desc":
            vehicles = vehicles.sort({ rating: -1 });
            break;
          case "latest":
            vehicles = vehicles.sort({ createdAt: -1 });
            break;
          default:
            vehicles = vehicles.sort({ createdAt: -1 });
        }
      }

      vehicles = await vehicles.populate(
        "ownerId",
        "name email currentAddress"
      );

      return vehicles;
    } catch (error) {
      throw new Error(`Error filtering vehicles: ${error.message}`);
    }
  }

  static async getAllVehicles(ownerId) {
    try {
      return await vehicle.find({ ownerId }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching vehicles: ${error.message}`);
    }
  }

  static async getAllVehiclesPublic() {
    try {
      return await vehicle.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching vehicles: ${error.message}`);
    }
  }
}

module.exports = VehicleService;
