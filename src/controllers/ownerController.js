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


const owner_update_profile = async (req, res) => {
  const { id } = req;
  const { name, phone, district, city, address } = req.body;
  
  try {
    const owner = await ownerModel.findById(id);
    if (!owner) {
      return responseReturn(res, 404, { error: "Owner Not Found" });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone;
    
    
    if (district || city || address) {
      updateFields.subInfo = {
        ...owner.subInfo,
        district: district?.trim() || owner.subInfo?.district,
        city: city?.trim() || owner.subInfo?.city,
        address: address?.trim() || owner.subInfo?.address
      };
    }

    const updatedOwner = await ownerModel
      .findByIdAndUpdate(id, updateFields, {
        new: true, 
      })
      .select("-password"); 

    responseReturn(res, 200, {
      userInfo: updatedOwner,
      message: "Update Profile Successfully",
    });
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
    if (!image || !image[0]) {
      return responseReturn(res, 400, { error: "No image file uploaded" });
    }

    const imageFile = image[0];
    try {
      const result = await cloudinary.uploader.upload(imageFile.filepath, {
        folder: "bikeConnectProfile",
      });

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
  owner_update_profile,
  get_owner,
  get_owner_request,
  get_active_owner,
  get_deactive_owner,
  update_owner_status,
  update_booking_status,
  upload_owner_profile_image,
};
