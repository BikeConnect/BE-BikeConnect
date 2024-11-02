"use strict";

const { post } = require("../models/postModel");
const { removeUndefinedObject, updateNestedObjectParser } = require("../utils");

class PostFactory {
  static async createPost(payload) {
    try {
      const newPost = new Post(payload);
      return await newPost.create();
    } catch (error) {
      throw new Error(`Invalid Post Type: ${error.message}`);
    }
  }

  static async updatePost(postId, payload) {
    try {
      const post = new Post(payload);
      return await post.update(postId);
    } catch (error) {
      throw new Error(`Error updating post: ${error.message}`);
    }
  }

  static async deletePost(postId) {
    try {
      const deletedPost = await Post.delete(postId);
      return deletedPost;
    } catch (error) {
      throw new Error(`Error deleting post: ${error.message}`);
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
  }

  // Create new Post
  async create() {
    const createdPost = await post.create(this);
    if (!createdPost) throw new Error("Create new Post error!");
    return createdPost;
  }

  // Update Post
  async update(postId) {
    const objectParam = removeUndefinedObject(this);
    const updatePost = await post.findByIdAndUpdate(
      postId,
      updateNestedObjectParser(objectParam)
    );
    if (!updatePost) throw new Error("Update Post error!");
    return updatePost;
  }

  // Delete Post 
  static async delete(postId) {
    const deletedPost = await post.findByIdAndDelete(postId);
    if (!deletedPost) throw new Error("Delete Post error!");
    return deletedPost;
  }
}

module.exports = PostFactory;
