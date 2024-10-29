const { post } = require("../postModel");

const searchPostByCustomer = async ({ keySearch }) => {
  const regexSearch = new RegExp(keySearch);
  const result = await post
    .find(
      {
        $text: { $search: regexSearch },
      },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .lean();
  return result;
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

    // Category filter
    if (filterOptions.category) {
      query.category = filterOptions.category;
    }

    // Brand filter
    if (filterOptions.brand) {
      query.brand = filterOptions.brand;
    }

    // Availability status filter
    if (filterOptions.availability_status) {
      query.availability_status = filterOptions.availability_status;
    }

    // Rating filter
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

    // Sorting
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

    const posts = await post.find(query)
      .sort(sortOptions)
      .lean();

     // Nếu không có posts nào thỏa mãn điều kiện
    if (!posts || posts.length === 0) {
      return {
        posts: [],
        priceRange: null
      };
    }

    // Get min and max prices from all posts for reference
    const priceStats = await post.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" }
        }
      }
    ]);

    return {
      posts,
      priceRange: priceStats.length > 0 ? {
        minPrice: priceStats[0].minPrice,
        maxPrice: priceStats[0].maxPrice
      } : null
    };
  } catch (error) {
    throw new Error(`Error filtering posts: ${error.message}`);
  }
};

module.exports = {
  searchPostByCustomer,
  filterPosts,
};
