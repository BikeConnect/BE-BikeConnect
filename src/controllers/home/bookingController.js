const bookingModel = require("../../models/bookingModel");
const { post } = require("../../models/postModel");
const { responseReturn } = require("../../utils/response");

const create_booking = async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
    const bookings = await bookingModel
      .find({
        $or: [
          {
            $and: [
              { startDate: { $lte: startDate } },
              { endDate: { $gte: startDate } },
            ],
          },
          {
            $and: [
              { startDate: { $lte: endDate } },
              { endDate: { $gte: endDate } },
            ],
          },
        ],
      })
      .select("vehicleId");
    const vehicleIds = bookings.map((booking) => booking.vehicleId);

    const availableVehicles = await post.find({
      _id: { $nin: vehicleIds },
      availability_status: "available",
    });
    res.status(200).json({ availableVehicles });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_bookings = async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return responseReturn(res, 400, {
      message: "startDate must not greater than endDate",
    });
  }
  try {
    const bookings = await bookingModel
      .find({
        $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
      })
      .select("vehicleId");

    const vehicleIds = bookings.map((booking) => booking.vehicleId);

    const availableVehicles = await post.find({
      _id: { $nin: vehicleIds },
      availability_status: "available",
      startDate: { $lte: start },
      endDate: { $gte: end },
    });

    res.status(200).json({ availableVehicles });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create_booking,
  get_bookings,
};
