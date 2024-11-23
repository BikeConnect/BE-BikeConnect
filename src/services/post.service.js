"use strict";

const post = require("../models/postModel");
const vehicle = require("../models/vehicleModel");
const cloudinary = require("../configs/cloudinaryConfig");
const { removeUndefinedObject, updateNestedObjectParser } = require("../utils");
const {
  searchPostByCustomer,
  filterPosts,
} = require("../models/repositories/post.repo");
const moment = require("moment");
const { pushNotification } = require("./notification.service");

// Owner
class PostFactory {
  static async createPostWithVehicles(payload) {
    try {
      const newPost = await post.create({
        ownerId: payload.ownerId,
        quantity: payload.quantity,
        vehicles: [],
      });

      const createdVehicles = await Promise.all(
        payload.vehicles.map(async (vehicleData) => {
          return vehicle.create({
            postId: newPost._id,
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

      newPost.vehicles = createdVehicles.map((vehicle) => vehicle._id);
      await newPost.save();

      return await post.findById(newPost._id).populate({
        path: "vehicles",
        model: "Vehicle",
      });
    } catch (error) {
      throw new Error(`Error creating post with vehicles: ${error.message}`);
    }
  }

  static async updatePost(postId, payload) {
    try {
      const currentPost = await post.findById(postId);
      if (!currentPost) {
        throw new Error("Post not found");
      }

      if (payload.images && payload.images.length > 0) {
        const vehicles = await vehicle.find({ postId });
        for (const v of vehicles) {
          if (v.images && v.images.length > 0) {
            for (const image of v.images) {
              if (image.publicId) {
                await cloudinary.uploader.destroy(image.publicId);
              }
            }
          }
        }
      }

      await vehicle.updateMany(
        { postId },
        {
          name: payload.name,
          category: payload.category,
          brand: payload.brand,
          price: payload.price,
          discount: payload.discount,
          description: payload.description,
          model: payload.model,
          images: payload.images,
          address: payload.address,
          startDate: payload.startDate,
          endDate: payload.endDate,
          availableDates: payload.availableDates,
        }
      );

      // Update post quantity if needed
      if (payload.quantity !== undefined) {
        currentPost.quantity = payload.quantity;
        await currentPost.save();
      }

      return await post.findById(postId).populate({
        path: "vehicles",
        model: "Vehicle",
        match: { postId },
      });
    } catch (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }
  }

  static async deletePost(postId) {
    try {
      const vehicleToDelete = await vehicle.findById(vehicleId);

      if (!vehicleToDelete) {
        throw new Error("Vehicle not found");
      }

      if (vehicleToDelete.images && vehicleToDelete.images.length > 0) {
        for (const image of vehicleToDelete.images) {
          if (image.publicId) {
            await cloudinary.uploader.destroy(image.publicId);
          }
        }
      }

      const deletedVehicle = await vehicle.findByIdAndDelete(vehicleId);
      if (!deletedVehicle) throw new Error("Delete Vehicle error!");
  
      await post.findByIdAndUpdate(
        vehicleToDelete.postId,
        { $pull: { vehicles: vehicleId } }
      );

      return deletedVehicle;
    } catch (error) {
      throw new Error(`Error deleting post: ${error.message}`);
    }
  }

  static async getPostById(postId) {
    try {
      const foundPost = await post.findById(postId);
      if (!foundPost) {
        throw new Error("Post not found");
      }
      return foundPost;
    } catch (error) {
      throw new Error(`Error fetching post: ${error.message}`);
    }
  }

  static async getListSearchPost({ keySearch }) {
    return await searchPostByCustomer({ keySearch });
  }

  static async filterPosts(filterOptions) {
    try {
      return await filterPosts(filterOptions);
    } catch (error) {
      throw new Error(`Error filtering posts: ${error.message}`);
    }
  }

  static async getAllPosts(ownerId) {
    try {
      const posts = await post
        .find({ ownerId: ownerId })
        .populate({
          path: "ownerId",
          select: "name email currentAddress",
        })
        .sort({ createdAt: -1 });
      return posts;
    } catch (error) {
      throw new Error(`Error fetching posts: ${error.message}`);
    }
  }
}

class Post {
  constructor({
    ownerId,
    name,
    slug,
    category,
    brand,
    price,
    quantity,
    discount,
    description,
    model,
    images,
    rating,
    availability_status,
    license,
    startDate,
    endDate,
    availableDates,
  }) {
    this.ownerId = ownerId;
    this.name = name;
    this.slug = slug;
    this.category = category;
    this.brand = brand;
    this.price = price;
    this.quantity = quantity;
    this.discount = discount;
    this.description = description;
    this.model = model;
    this.images = images;
    this.rating = rating;
    this.availability_status = availability_status;
    this.license = license;
    this.startDate = startDate;
    this.endDate = endDate;
    this.availableDates = [];
  }

  async create() {
    const createdPost = await post.create(this);
    if (!createdPost) throw new Error("Create new Post error!");
    return createdPost;
  }

  async update(postId) {
    const objectParam = removeUndefinedObject(this);
    const updatePost = await post.findByIdAndUpdate(
      postId,
      updateNestedObjectParser(objectParam)
    );
    if (!updatePost) throw new Error("Update Post error!");
    return updatePost;
  }

  static async delete(postId) {
    const deletedPost = await post.findByIdAndDelete(postId);
    if (!deletedPost) throw new Error("Delete Post error!");
    return deletedPost;
  }
}

module.exports = PostFactory;
