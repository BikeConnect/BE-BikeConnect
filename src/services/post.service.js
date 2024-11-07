"use strict";

const { post } = require("../models/postModel");
const cloudinary = require("../configs/cloudinaryConfig");
const { removeUndefinedObject, updateNestedObjectParser } = require("../utils");
const {
  searchPostByCustomer,
  filterPosts,
} = require("../models/repositories/post.repo");
const { pushNotification } = require("./notification.service");

// Owner
class PostFactory {
  static async createPost(payload) {
    try {
      const newPost = await post.create(payload);
      pushNotification({
        type: "booking",
        receiverId: 1,
        senderType: "Owner",
        senderId: payload.ownerId,
        options: {
          name: newPost.name,
          post_price: newPost.price,
          post_image: (payload.images && payload.images.length > 0) ? payload.images[0].url : null,
        },
        relatedPostId: req.body.postId,
      })
        .then((rs) => console.log(rs))
        .catch(console.error);
      return newPost;
    } catch (error) {
      throw new Error(`Invalid Post Type: ${error.message}`);
    }
  }

  static async updatePost(postId, payload) {
    try {
      const currentPost = await post.findById(postId);
      if (!currentPost) {
        throw new Error("Post not found");
      }

      if (payload.images && payload.images.length > 0) {
        if (currentPost.images && currentPost.images.length > 0) {
          for (const image of currentPost.images) {
            if (image.publicId) {
              await cloudinary.uploader.destroy(image.publicId);
            }
          }
        }
      }

      const updatedPost = await post.findByIdAndUpdate(postId, payload, {
        new: true,
      });
      if (!updatedPost) throw new Error("Update Post error!");
      return updatedPost;
    } catch (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }
  }

  static async deletePost(postId) {
    try {
      const postToDelete = await post.findById(postId);

      if (!postToDelete) {
        throw new Error("Post not found");
      }

      if (postToDelete.images && postToDelete.images.length > 0) {
        for (const image of postToDelete.images) {
          if (image.publicId) {
            await cloudinary.uploader.destroy(image.publicId);
          }
        }
      }

      const deletedPost = await post.findByIdAndDelete(postId);
      if (!deletedPost) throw new Error("Delete Post error!");
      return deletedPost;
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
