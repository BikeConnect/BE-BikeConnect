"use strict";

const Contract = require("../../models/contractModel");
const bookingModel = require("../../models/bookingModel");
const contractModel = require("../../models/contractModel");
const post = require("../../models/postModel");
const notificationService = require("../../services/notification.service");
const { convertToObjectIdMongodb } = require("../../utils");
const { formatPostDates } = require("../../utils/formatPostDates");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");


const customer_submit_booking = async (req, res) => {
  try {
    const { postId, startDate, endDate } = req.body;
    const customerId = req.id;

    const postData = await post.findById(postId);
    if (!postData) return responseReturn(res, 404, { error: "Post Not Found" });

    if (postData.availability_status === "rented") {
      return responseReturn(res, 400, {
        message: "Vehicle is not available for booking",
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);
    const days = end.diff(start, "days") + 1;
    const totalPrice = days * postData.price * (1 - postData.discount / 100);

    const contract = await contractModel.create({
      customerId,
      ownerId: convertToObjectIdMongodb(postData.ownerId),
      postId,
      startDate,
      endDate,
      totalAmount: totalPrice,
      terms: "Áp dụng tiêu chuẩn thuê và các điều khoản",
      status: "draft",
      customerConfirmed: {
        status: false,
      },
      ownerConfirmed: {
        status: false,
      },
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await notificationService.createNotification({
      type: "contract",
      senderId: customerId,
      senderType: "customer",
      link: contract._id,
      receiverId: postData.ownerId,
      content: "Bạn có yêu cầu thuê xe mới, vui lòng xác nhận trong vòng 24h",
      contractId: contract._id,
      actionType: "CONTRACT_REQUEST",
    });

    responseReturn(res, 201, {
      success: true,
      message: "Contract created successfully",
      contract,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};



const get_bookings = async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = moment(startDate, "DD/MM/YYYY").toDate();
  const end = moment(endDate, "DD/MM/YYYY").toDate();
  if (start > end) {
    return responseReturn(res, 400, {
      message: "startDate must not greater than endDate",
    });
  }
  try {
    const availableVehicles = await post
      .find({
        availability_status: "available",
        startDate: { $lte: start },
        endDate: { $gte: end },
      })
      .select("-createdAt -updatedAt -__v");
    console.log("availableVehicles:::", availableVehicles);
    const formattedVehicles = availableVehicles.map((vehicle) =>
      formatPostDates(vehicle)
    );

    res.status(200).json({ availableVehicles: formattedVehicles });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const check_specific_booking = async (req, res) => {
  const { postId } = req.params;
  try {
    const specificBooking = await post
      .findById(postId)
      .select("availableDates availability_status");
    if (!specificBooking) {
      return responseReturn(res, 404, { error: "Booking not found" });
    }

    if (specificBooking.availability_status === "rented") {
      return responseReturn(res, 400, {
        message:
          "Vehicle is rented, please wait till the vehicle is available or choose another vehicle",
      });
    }

    const formattedBooking = {
      ...specificBooking._doc,
      availableDates: specificBooking.availableDates.map((date) =>
        moment(date).format("DD/MM/YYYY")
      ),
    };

    responseReturn(res, 200, { specificBooking: formattedBooking });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const create_booking = async (req, res) => {
  try {
    const { postId, startDate, endDate } = req.body;
    const customerId = req.id;
    const postData = await post.findById(postId);
    if (!postData) return responseReturn(res, 404, { error: "Post Not Found" });

    if (postData.availability_status === "rented") {
      return responseReturn(res, 400, {
        message: "Vehicle is not available for booking",
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);
    const days = end.diff(start, "days") + 1;
    const totalPrice = days * postData.price * (1 - postData.discount / 100);

    const contract = await Contract.create({
      customerId,
      ownerId: convertToObjectIdMongodb(postData.ownerId),
      postId,
      startDate,
      endDate,
      totalAmount: totalPrice,
      terms: "Áp dụng tiêu chuẩn thuê và các điều khoản",
      status: "draft",
      customerConfirmed: {
        status: false,
      },
      ownerConfirmed: {
        status: false,
      },
    });

    // await contract.save();
    console.log("contract:::", contract);

    const booking = await bookingModel.create({
      customerId,
      postId,
      contractId: convertToObjectIdMongodb(contract._id),
      startDate,
      endDate,
      totalPrice,
    });

    await post.findByIdAndUpdate(postId, {
      availability_status: "pending",
    });

    await notificationService.createNotification({
      type: "contract",
      senderId: customerId,
      senderType: "customers",
      link: contract._id,
      receiverId: postData.ownerId,
      content: "Bạn đã tạo hợp đồng thuê xe thành công",
      contractId: contract._id,
      actionType: "CONTRACT_REQUEST",
      options: {},
    });

    responseReturn(res, 201, {
      success: true,
      message: "Booking created successfully",
      booking,
      contract,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const confirm_booking_contract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const customerId = req.id;
    const contract = await Contract.findOne({
      _id: convertToObjectIdMongodb(contractId),
      customerId,
    });

    if (!contract) {
      return responseReturn(res, 404, { error: "Contract not found" });
    }

    contract.customerConfirmed = {
      status: true,
      confirmedAt: new Date(),
    };

    await contract.save();

    const booking = await bookingModel.findOneAndUpdate(
      {
        contractId: convertToObjectIdMongodb(contractId),
      },
      {
        status: "pending",
      },
      {
        new: true,
      }
    );

    await notificationService.createNotification({
      type: "contract",
      senderId: convertToObjectIdMongodb(customerId),
      senderType: "customers",
      link: convertToObjectIdMongodb(contractId),
      receiverId: contract.ownerId,
      content: "Khách hàng đã xác nhận hợp đồng, đang chờ bạn xác nhận",
      contractId: convertToObjectIdMongodb(contractId),
      actionType: "CONTRACT_CONFIRMATION",
    });

    responseReturn(res, 200, {
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    return responseReturn(res, 500, { error: error.message });
  }
};

module.exports = {
  customer_submit_booking,
  create_booking,
  get_bookings,
  check_specific_booking,
  confirm_booking_contract,
};
