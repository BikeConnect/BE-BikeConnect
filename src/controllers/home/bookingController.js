const bookingModel = require("../../models/bookingModel");
const { post } = require("../../models/postModel");
const { formatPostDates } = require("../../utils/formatPostDates");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");

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

module.exports = {
  get_bookings,
  check_specific_booking,
};
