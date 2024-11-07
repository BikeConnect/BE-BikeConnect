const reviewModel = require("../../models/reviewModel");
const { post } = require("../../models/postModel");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");
const mongoose = require("mongoose");
const { pushNotification } = require("../../services/notification.service");

const customer_submit_review = async (req, res) => {
  const { postId, rating, review, name } = req.body;
  try {
    await reviewModel.create({
      postId,
      name,
      rating,
      review,
      date: moment(Date.now()).format("LL"),
    });

    let ratings = 0;
    const reviews = await reviewModel.find({ postId });
    for (let i = 0; i < reviews.length; i++) {
      ratings += reviews[i].rating;
    }
    let postRating = 0;
    if (reviews.length !== 0) {
      postRating = (ratings / reviews.length).toFixed(1);
    }
    await post.findByIdAndUpdate(postId, {
      rating: postRating,
    });

    console.log(req.body);
    pushNotification({
      type: "review",
      receiverId: 1,
      senderType: "customers",
      senderId: postId,
      link: postId,
      options: {
        review_rating: req.body.rating,
        review_name: req.body.name,
        review_content: req.body.review
      },
    })
      .then((rs) => console.log(rs))
      .catch(console.error);
    responseReturn(res, 201, { message: "Review Added Successfully" });
  } catch (error) {
    console.log(error.message);
  }
};

const get_reviews = async (req, res) => {
  const { postId } = req.params;
  let { pageNo } = req.query;
  pageNo = parseInt(pageNo);
  const limit = 5;
  const skipPage = limit * (pageNo - 1);
  try {
    let getRating = await reviewModel.aggregate([
      {
        $match: {
          postId: {
            $eq: mongoose.Types.ObjectId.createFromHexString(postId),
          },
          rating: {
            $not: {
              $size: 0,
            },
          },
        },
      },
      {
        $unwind: "$rating",
      },
      {
        $group: {
          _id: "$rating",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    let review_rating = [
      {
        rating: 5,
        sum: 0,
      },
      {
        rating: 4,
        sum: 0,
      },
      {
        rating: 3,
        sum: 0,
      },
      {
        rating: 2,
        sum: 0,
      },
      {
        rating: 1,
        sum: 0,
      },
    ];

    for (let i = 0; i < review_rating.length; i++) {
      for (let j = 0; j < getRating.length; j++) {
        if (review_rating[i].rating === getRating[j]._id) {
          review_rating[i].sum = getRating[j].count;
          break;
        }
      }
    }

    const getAll = await reviewModel.find({ postId });
    const reviews = await reviewModel
      .find({ postId })
      .skip(skipPage)
      .limit(limit)
      .sort({ createdAt: -1 });

    responseReturn(res, 200, {
      reviews,
      totalReview: getAll.length,
      review_rating,
    });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  customer_submit_review,
  get_reviews,
};
