"use strict";
const ownerModel = require("../models/ownerModel");
const bookingModel = require("../models/bookingModel")
const { responseReturn } = require("../utils/response");
const { post } = require("../models/postModel");

const add_owner_profile = async (req, res) => {
  const { shopName, address, district, city } = req.body;
  console.log({ shopName, address, district, city });
  const { id } = req;
  console.log(id);
  // console.log(req);
  try {
    await ownerModel.findByIdAndUpdate(id, {
      shopInfo: {
        shopName,
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

const updateBookingStatus = async (req, res) => {
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

module.exports = {
  add_owner_profile,
  get_owner,
  get_owner_request,
  updateBookingStatus
};
