const ownerModel = require("../ownerModel");
const { post } = require("../postModel");

const searchPostByCustomer = async ({ keySearch }) => {
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

    const ownerIds = owners.map(owner => owner._id);

    const result = await post
      .find({
        ownerId: { $in: ownerIds },
        availability_status: "available"
      })
      .populate({
        path: "ownerId",
        select: "name currentAddress phone"
      })
      .lean();

    return result;
  } catch (error) {
    throw new Error(`Error searching posts by address: ${error.message}`);
  }
};

const filterPosts = async (filterOptions) => {
  try {
    let query = {};

    if (filterOptions.minPrice || filterOptions.maxPrice) {
      query.price = {};
      if (filterOptions.minPrice) {
        query.price.$gte = Number(filterOptions.minPrice);
      }
      if (filterOptions.maxPrice) {
        query.price.$gte = 0;
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
      const ratingValue = Number(filterOptions.rating);
      if (ratingValue >= 1 && ratingValue <= 5) {
        query.rating = ratingValue;
      }
    } else if (filterOptions.minRating && filterOptions.maxRating) {
      query.rating = {
        $gte: Number(filterOptions.minRating),
        $lte: Number(filterOptions.maxRating),
      };
    } else if (filterOptions.minRating) {
      query.rating = { $gte: Number(filterOptions.minRating) };
    } else if (filterOptions.maxRating) {
      query.rating = { $lte: Number(filterOptions.maxRating) };
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
          sortOptions.price = 1;
      }
    } else {
      sortOptions.price = 1;
    }

    const posts = await post.find(query).sort(sortOptions).lean();

    if (!posts || posts.length === 0) {
      return {
        posts: [],
        priceRange: null,
      };
    }

    const priceStats = await post.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    return {
      posts,
      priceRange:
        priceStats.length > 0
          ? {
              minPrice: priceStats[0].minPrice,
              maxPrice: priceStats[0].maxPrice,
            }
          : null,
    };
  } catch (error) {
    throw new Error(`Error filtering posts: ${error.message}`);
  }
};

module.exports = {
  searchPostByCustomer,
  filterPosts,
};
