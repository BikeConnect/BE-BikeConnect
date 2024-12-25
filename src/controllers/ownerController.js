"use strict";
const ownerModel = require("../models/ownerModel");
const bookingModel = require("../models/bookingModel");
const contractModel = require("../models/contractModel");
const { responseReturn } = require("../utils/response");
const { formidable } = require("formidable");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const vehicle = require("../models/vehicleModel");
const { SuccessResponse } = require("../core/success.response");

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
        address: address?.trim() || owner.subInfo?.address,
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
    const totalOwner = await ownerModel
      .find({ status: "pending" })
      .countDocuments();
    responseReturn(res, 200, { owners, totalOwner });
  } catch (error) {
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
      message: "Đã cập nhật thành công tài khoản của chủ xe",
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_active_owner = async (req, res) => {
  try {
    const owners = await ownerModel
      .find({ status: "active" })
      .sort({ createdAt: -1 });

    const totalOwner = await ownerModel
      .find({ status: "active" })
      .countDocuments();
    responseReturn(res, 200, { owners, totalOwner });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_deactive_owner = async (req, res) => {
  try {
    const owners = await ownerModel.find({ status: "deactivate" });
    responseReturn(res, 200, { owners });
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
      await vehicle.findByIdAndUpdate(booking.vehicleId, {
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
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
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

const get_customer_booking_request = async (req, res) => {
  try {
    const { id } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalRequests = await contractModel.countDocuments({
      ownerId: id,
      status: "pending",
      "ownerConfirmed.status": false,
    });

    const bookings = await contractModel
      .find({
        ownerId: id,
        status: "pending",
        "ownerConfirmed.status": false,
      })
      .populate("customerId", "name email phone alterAddress")
      .populate("vehicleId", "brand model price license address")
      .select(
        "startDate endDate rentalDays customerId vehicleId totalAmount status"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedBookings = bookings
      .filter((booking) => booking.customerId && booking.vehicleId)
      .map((booking) => ({
        _id: booking._id,
        customerName: booking.customerId?.name || "",
        customerEmail: booking.customerId?.email || "",
        customerPhone: booking.customerId?.phone || "",
        vehicleModel: booking.vehicleId?.model || "",
        vehicleBrand: booking.vehicleId?.brand || "",
        vehiclePrice: booking.vehicleId?.price || 0,
        vehicleLicense: booking.vehicleId?.license || "",
        vehicleAddress: booking.vehicleId?.address || "",
        customerAlterAddress: booking.customerId?.alterAddress || "",
        startDate: booking.startDate,
        endDate: booking.endDate,
        rentalDays: booking.rentalDays,
        totalAmount: booking.totalAmount,
        status: booking.status,
      }));
    // console.log("formattedBookings::::",formattedBookings);
    const totalPages = Math.ceil(totalRequests / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    responseReturn(res, 200, {
      bookings: formattedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalRequests,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_owner_all_bookings_history = async (req, res) => {
  try {
    const { id } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalBookings = await contractModel.countDocuments({
      ownerId: id,
      status: {
        $ne: "pending",
      },
    });

    const currentDate = new Date();
    const bookings = await contractModel
      .find({
        ownerId: id,
        status: {
          $ne: "pending",
        },
      })
      .populate("customerId", "name email phone")
      .populate("vehicleId", "brand model price license")
      .select(
        "startDate endDate rentalDays customerId vehicleId totalAmount status ownerConfirmed"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const updateDate = bookings.map(async (booking) => {
      const endDate = new Date(booking.endDate);
      if (currentDate > endDate && booking.status === "active") {
        await contractModel.findByIdAndUpdate(booking._id, {
          status: "completed",
        });
        booking.status = "completed";
      }
      return booking;
    });

    await Promise.all(updateDate);

    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      customerName: booking.customerId.name,
      customerEmail: booking.customerId.email,
      customerPhone: booking.customerId.phone,
      vehicleModel: booking.vehicleId.model,
      vehicleBrand: booking.vehicleId.brand,
      vehiclePrice: booking.vehicleId.price,
      vehicleLicense: booking.vehicleId.license,
      startDate: booking.startDate,
      endDate: booking.endDate,
      rentalDays: booking.rentalDays,
      totalAmount: booking.totalAmount,
      status: booking.status,
      ownerConfirmed: booking.ownerConfirmed,
    }));

    const totalPages = Math.ceil(totalBookings / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    responseReturn(res, 200, {
      bookings: formattedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalBookings,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_owner_vehicles = async (req, res) => {
  try {
    const { id } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalVehicles = await vehicle.countDocuments({ ownerId: id });

    const vehicles = await vehicle
      .find({ ownerId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalVehicles / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      metadata: vehicles,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalVehicles,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const update_vehicle_status = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, availableDates, availability_status } =
      req.body;
    const { id: ownerId } = req;

    const currentVehicle = await vehicle.findOne({
      _id: vehicleId,
      ownerId,
    });

    if (!currentVehicle) {
      return responseReturn(res, 404, { error: "Vehicle not found" });
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (new Date(startDate) < currentDate) {
      return responseReturn(res, 400, {
        error: "Start date cannot be in the past",
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return responseReturn(res, 400, {
        error: "End date must be after start date",
      });
    }

    const isRented = await contractModel.find({
      vehicleId: vehicleId,
      status: "active",
      endDate: { $gte: currentDate },
    });

    let updateData = {
      startDate,
      endDate,
      availableDates,
      availability_status,
    };

    if (isRented.length > 0) {
      const existingDates = currentVehicle.availableDates.map((d) =>
        d.getTime()
      );
      const newDates = availableDates.filter(
        (d) => !existingDates.includes(new Date(d).getTime())
      );

      updateData = {
        availableDates: [...currentVehicle.availableDates, ...newDates],
        availability_status: currentVehicle.availability_status,
      };
    }

    const updatedVehicle = await vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: updateData },
      { new: true }
    );

    responseReturn(res, 200, {
      message: "Vehicle updated successfully",
      updatedVehicle,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_owner_booking_history = async (req, res) => {
  try {
    const { id } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalBookings = await bookingModel.countDocuments({
      vehicleId: { $in: await vehicle.find({ ownerId: id }).distinct("_id") },
    });

    const bookings = await bookingModel
      .find({
        vehicleId: { $in: await vehicle.find({ ownerId: id }).distinct("_id") },
      })
      .populate("vehicleId", "brand model license price")
      .populate("contractId", "totalAmount")
      .select("status startDate endDate totalPrice")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      vehicleInfo: {
        brand: booking.vehicleId?.brand || "",
        model: booking.vehicleId?.model || "",
        license: booking.vehicleId?.license || "",
      },
      bookingStatus: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalPrice: booking.totalPrice || 0,
    }));

    const totalPages = Math.ceil(totalBookings / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate total earnings
    const totalEarnings = formattedBookings.reduce((sum, booking) => {
      return sum + (booking.contractAmount || 0);
    }, 0);

    responseReturn(res, 200, {
      bookings: formattedBookings,
      totalEarnings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalBookings,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error(error);
    responseReturn(res, 500, { error: error.message });
  }
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
  get_customer_booking_request,
  get_owner_all_bookings_history,
  get_owner_vehicles,
  update_vehicle_status,
  get_owner_booking_history,
};
