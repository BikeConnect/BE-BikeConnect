"use strict";

const contractModel = require("../../models/contractModel");
const vehicleModel = require("../../models/vehicleModel");
const notificationService = require("../../services/notification.service");
const { convertToObjectIdMongodb } = require("../../utils");
const { formatPostDates } = require("../../utils/formatPostDates");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");

const customer_submit_booking = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;
    const customerId = req.id;

    const vehicleData = await vehicleModel.findById(vehicleId);

    if (!vehicleData) {
      return responseReturn(res, 404, { error: "Vehicle Not Found" });
    }

    if (vehicleData.availability_status === "rented") {
      return responseReturn(res, 400, {
        message: "Vehicle is not available for booking",
      });
    }

    const start = moment(startDate).startOf('day');
    const end = moment(endDate).startOf('day');
    
    const availableDatesStr = vehicleData.availableDates.map(date => 
      moment(date).startOf('day').format('YYYY-MM-DD')
    );

    let currentDate = start.clone();
    while (currentDate <= end) {
      if (!availableDatesStr.includes(currentDate.format('YYYY-MM-DD'))) {
        return responseReturn(res, 400, {
          message: `Ngày ${currentDate.format('DD/MM/YYYY')} không có sẵn để đặt`,
        });
      }
      currentDate.add(1, 'days');
    }

    const days = end.diff(start, "days") + 1;
    const totalPrice = days * vehicleData.price * (1 - vehicleData.discount / 100);

    const contract = await contractModel.create({
      customerId,
      ownerId: convertToObjectIdMongodb(vehicleData.ownerId),
      vehicleId,
      startDate: start.toDate(),
      endDate: end.toDate(),
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

    const notificationData = {
      noti_type: "contract",
      noti_senderId: customerId,
      senderType: "customer",
      noti_link: contract._id,
      noti_receiverId: convertToObjectIdMongodb(vehicleData.ownerId),
      noti_content: "Bạn có yêu cầu thuê xe mới, vui lòng xác nhận trong vòng 24h",
      noti_options: {},
      contractId: contract._id,
      actionType: "REVIEW_REPLIED",
    };
    await notificationService.createNotification(notificationData);

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
  console.log("Query dates:", { start, end });
  if (start > end) {
    return responseReturn(res, 400, {
      message: "startDate must not greater than endDate",
    });
  }
  try {
    const availableVehicles = await vehicleModel
      .find({
        availability_status: "available",
        $and: [{ startDate: { $lte: end } }, { endDate: { $gte: start } }],
      })
      .populate("vehicleId")
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
  const { vehicleId } = req.params;
  try {
    const specificBooking = await vehicleModel
      .findById(vehicleId)
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

module.exports = {
  customer_submit_booking,
  get_bookings,
  check_specific_booking,
};
