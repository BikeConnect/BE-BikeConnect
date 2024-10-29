const bookingModel = require("../../models/bookingModel");
const {post} = require("../../models/postModel");
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
    const { startDate, endDate } = req.query; // Nhận ngày từ query parameters

  try {
    const bookings = await bookingModel.find({
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
    }).select("vehicleId");

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

module.exports = {
  create_booking,
  get_bookings,
};
