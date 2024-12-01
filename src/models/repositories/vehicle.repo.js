const ownerModel = require("../ownerModel");
const vehicle = require("../vehicleModel");

const searchVehiclesByCustomer = async ({ keySearch }) => {
  try {
    if (!keySearch) {
      return [];
    }

    const owners = await ownerModel
      .find(
        {
          $text: { $search: keySearch },
          isVerified: true,
        },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" } })
      .lean();

    if (!owners || owners.length === 0) {
      return [];
    }

    const ownerIds = owners.map((owner) => owner._id);

    const result = await vehicle
      .find({
        ownerId: { $in: ownerIds },
        availability_status: "available",
      })
      .populate({
        path: "ownerId",
        select: "name currentAddress phone",
      })
      .lean();

    return result;
  } catch (error) {
    throw new Error(`Error searching vehicles by address: ${error.message}`);
  }
};

const filterVehicles = async (filterOptions) => {
  try {
    let query = {};

    if (filterOptions.minPrice || filterOptions.maxPrice) {
      query.price = {};
      if (filterOptions.minPrice) {
        query.price.$gte = Number(filterOptions.minPrice);
      }
      if (filterOptions.maxPrice) {
        query.price.$lte = Number(filterOptions.maxPrice);
      }
    }

    if (filterOptions.category) {
      query.category = filterOptions.category;
    }

    if (filterOptions.brand) {
      query.brand = {
        $regex: filterOptions.brand,
        $options: "i",
      };
    }

    if (filterOptions.availability_status) {
      query.availability_status = filterOptions.availability_status;
    }

    if (filterOptions.rating) {
      query.rating = Number(filterOptions.rating);
    }

    let sortOptions = {};
    if (filterOptions.sortBy) {
      switch (filterOptions.sortBy) {
        case "price_asc":
          sortOptions.price = 1;
          break;
        case "price_desc":
          sortOptions.price = -1;
          break;
        case "rating_asc":
          sortOptions.rating = 1;
          break;
        case "rating_desc":
          sortOptions.rating = -1;
          break;
        case "newest":
          sortOptions.createdAt = -1;
          break;
        default:
          sortOptions.createdAt = -1;
      }
    }

    const vehicles = await vehicle.find(query).sort(sortOptions).lean();

    const priceStats = await vehicle.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    return {
      vehicles,
      priceRange: priceStats[0] || null,
    };
  } catch (error) {
    throw new Error(`Error filtering vehicles: ${error.message}`);
  }
};

module.exports = {
  searchVehiclesByCustomer,
  filterVehicles,
};
