"use strict";

const bookingModel = require("../../models/bookingModel");
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
        message: "Xe đã được thuê, vui lòng chọn xe khác",
      });
    }

    const start = moment(startDate, "DD/MM/YYYY")
      .utcOffset("+07:00")
      .startOf("day");
    const end = moment(endDate, "DD/MM/YYYY")
      .utcOffset("+07:00")
      .startOf("day");

    const vehicleStartDate = moment(vehicleData.startDate).startOf("day");
    const vehicleEndDate = moment(vehicleData.endDate).startOf("day");

    if (start < vehicleStartDate || end > vehicleEndDate) {
      return responseReturn(res, 400, {
        message: "Ngày thuê phải nằm trong khoảng thời gian cho phép của xe",
      });
    }

    const availableDatesStr = vehicleData.availableDates.map((date) =>
      moment(date).format("DD/MM/YYYY")
    );

    let currentDate = start.clone();
    while (currentDate <= end) {
      if (!availableDatesStr.includes(currentDate.format("DD/MM/YYYY"))) {
        return responseReturn(res, 400, {
          message: `Ngày ${currentDate.format(
            "DD/MM/YYYY"
          )} không có sẵn để đặt`,
        });
      }
      currentDate.add(1, "days");
    }

    const days = end.diff(start, "days") + 1;
    const totalPrice =
      days * vehicleData.price * (1 - vehicleData.discount / 100);

    const contract = await contractModel.create({
      customerId,
      ownerId: convertToObjectIdMongodb(vehicleData.ownerId),
      vehicleId,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalAmount: totalPrice,
      terms: "Áp dụng tiêu chuẩn thuê và các điều khoản",
      status: "pending",
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
      noti_content:
        "Bạn có yêu cầu thuê xe mới, vui lòng xác nhận trong vòng 24h",
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
  const start = moment(startDate, "DD/MM/YYYY")
    .utcOffset("+07:00")
    .startOf("day")
    .toDate();
  const end = moment(endDate, "DD/MM/YYYY")
    .utcOffset("+07:00")
    .startOf("day")
    .toDate();

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

const getAllBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    console.log("Initial Query:", query);

    const bookings = await bookingModel
      .find(query)
      .populate({
        path: "customerId",
        model: "customers",
        select: "name email phone image currentAddress",
      })
      .populate({
        path: "vehicleId",
        model: "Vehicle",
        select:
          "brand model price license discount images address availability_status startDate endDate ownerId",
        populate: {
          path: "ownerId",
          model: "Owner",
          select: "name email phone subInfo",
        },
      })
      .populate(
        "contractId",
        "totalAmount terms status customerConfirmed ownerConfirmed"
      )
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("Raw Bookings Data:", JSON.stringify(bookings, null, 2));

    const formattedBookings = bookings.map((booking) => {
      // Log để debug
      console.log(`Processing booking ID: ${booking._id}`);
      console.log("Vehicle Data:", booking.vehicleId);
      if (booking.vehicleId?.ownerId) {
        console.log("Owner Data:", booking.vehicleId.ownerId);
      }

      return {
        _id: booking._id,
        customer: booking.customerId
          ? {
              id: booking.customerId._id,
              name: booking.customerId.name || "Unknown",
              email: booking.customerId.email || "N/A",
              phone: booking.customerId.phone || "N/A",
              image: booking.customerId.image || "N/A",
              address: booking.customerId.currentAddress || "N/A",
            }
          : null,
        vehicle: booking.vehicleId
          ? {
              id: booking.vehicleId._id,
              brand: booking.vehicleId.brand,
              model: booking.vehicleId.model,
              price: booking.vehicleId.price,
              discount: booking.vehicleId.discount,
              license: booking.vehicleId.license,
              images: booking.vehicleId.images || [],
              address: booking.vehicleId.address,
              availability_status: booking.vehicleId.availability_status,
              owner: booking.vehicleId.ownerId
                ? {
                    id: booking.vehicleId.ownerId._id,
                    name: booking.vehicleId.ownerId.name,
                    email: booking.vehicleId.ownerId.email,
                    phone: booking.vehicleId.ownerId.phone,
                    address:
                      booking.vehicleId.ownerId.subInfo?.address || "N/A",
                    district:
                      booking.vehicleId.ownerId.subInfo?.district || "N/A",
                    city: booking.vehicleId.ownerId.subInfo?.city || "N/A",
                  }
                : null,
            }
          : null,
        contract: booking.contractId
          ? {
              id: booking.contractId._id,
              totalAmount: booking.contractId.totalAmount,
              terms: booking.contractId.terms,
              status: booking.contractId.status,
              customerConfirmed: booking.contractId.customerConfirmed,
              ownerConfirmed: booking.contractId.ownerConfirmed,
            }
          : null,
        bookingDetails: {
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
          status: booking.status,
        },
      };
    });

    console.log(
      "Formatted Bookings:",
      JSON.stringify(formattedBookings, null, 2)
    );

    return res.status(200).json({
      success: true,
      data: {
        bookings: formattedBookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(
            (await bookingModel.countDocuments(query)) / limit
          ),
          totalItems: await bookingModel.countDocuments(query),
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get all bookings error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getBookingsByStatus = async (req, res) => {
  try {
    const statuses = [
      "pending",
      "accepted",
      "rejected",
      "completed",
      "cancelled",
    ];
    const bookingsByStatus = {};

    await Promise.all(
      statuses.map(async (status) => {
        const bookings = await bookingModel
          .find({ status })
          .populate("customerId", "name email phone")
          .populate("vehicleId", "brand model price license")
          .populate("contractId", "totalAmount terms status")
          .select("-__v")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        bookingsByStatus[status] = bookings.map((booking) => ({
          _id: booking._id,
          customer: {
            id: booking.customerId._id,
            name: booking.customerId.name,
            email: booking.customerId.email,
            phone: booking.customerId.phone,
          },
          vehicle: {
            id: booking.vehicleId._id,
            brand: booking.vehicleId.brand,
            model: booking.vehicleId.model,
            price: booking.vehicleId.price,
            license: booking.vehicleId.license,
          },
          contract: {
            id: booking.contractId._id,
            totalAmount: booking.contractId.totalAmount,
            terms: booking.contractId.terms,
            status: booking.contractId.status,
          },
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
          status: booking.status,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        }));
      })
    );

    return res.status(200).json({
      success: true,
      data: bookingsByStatus,
    });
  } catch (error) {
    console.error("Get bookings by status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  customer_submit_booking,
  get_bookings,
  check_specific_booking,
  getAllBookings,
  getBookingsByStatus,
};
