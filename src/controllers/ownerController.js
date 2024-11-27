"use strict";
const ownerModel = require("../models/ownerModel");
const bookingModel = require("../models/bookingModel");
const { responseReturn } = require("../utils/response");
const { post } = require("../models/postModel");
const { formidable } = require("formidable");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const add_owner_profile = async (req, res) => {
  const { address, district, city } = req.body;
  console.log({ address, district, city });
  const { id } = req;
  console.log(id);
  try {
    await ownerModel.findByIdAndUpdate(id, {
      subInfo: {
        district,
        city,
        address,
      },
    });
    const userInfo = await ownerModel.findById(id);
    responseReturn(res, 201, { userInfo, message: "Add Profile Successfully" });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_owner = async (req, res) => {
  const { ownerId } = req.params;
  try {
    const owner = await ownerModel.findById(ownerId);
    if (!owner) return responseReturn(res, 404, { error: "Owner not found" });
    responseReturn(res, 200, { owner });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_owner_request = async (req, res) => {
  try {
    const owners = await ownerModel
      .find({ status: "pending" })
      .sort({ createdAt: -1 });

    responseReturn(res, 200, { owners });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const update_owner_status = async (req, res) => {
  const { ownerId, status } = req.body;
  try {
    await ownerModel.findByIdAndUpdate(ownerId, { status });
    const owner = await ownerModel.findById(ownerId);
    responseReturn(res, 200, {
      owner,
      message: "Update Status Owner Successfully",
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_active_owner = async (req, res) => {
  try {
    const owner = await ownerModel.find({ status: "active" });
    responseReturn(res, 200, { owner });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_deactive_owner = async (req, res) => {
  try {
    const owner = await ownerModel.find({ status: "deactive" });
    responseReturn(res, 200, { owner });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const update_booking_status = async (req, res) => {
  const { bookingId, status } = req.body;
  try {
    await bookingModel.findByIdAndUpdate(bookingId, { status });
    const booking = await bookingModel.findById(bookingId);
    if (booking.status === "accepted") {
      await post.findByIdAndUpdate(booking.postId, {
        availability_status: "rented",
      });
    }
    responseReturn(res, 200, {
      booking,
      message: "Update Status Successfully",
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const upload_owner_profile_image = async (req, res) => {
  const { id } = req;
  const form = formidable({ multiples: true });
  form.parse(req, async (error, _, files) => {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.API_KEY,
      api_secret: process.env.API_SECRET_KEY,
      secure: true,
    });

    const { image } = files;
    console.log("image::::", image);
    try {
      const result = await cloudinary.uploader.upload(image.PersistentFile.filepath, {
        folder: "bikeConnectProfile",
      });
      console.log("result::::", result);
      if (result) {
        await ownerModel.findByIdAndUpdate(id, {
          image: result.url,
        });
        const userInfo = await ownerModel.findById(id);
        responseReturn(res, 200, {
          message: "Profile Image Upload Successfully",
          userInfo,
        });
      } else {
        console.log("error::::", error.message);
        responseReturn(res, 404, {
          message: `Profile Image Upload Failed ${error.message}`,
          userInfo,
        });
      }
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  });
};

module.exports = {
  add_owner_profile,
  get_owner,
  get_owner_request,
  get_active_owner,
  get_deactive_owner,
  update_owner_status,
  update_booking_status,
  upload_owner_profile_image,
};
