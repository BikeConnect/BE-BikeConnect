"use strict";

const reviewModel = require("../../models/reviewModel");
const vehicleModel = require("../../models/vehicleModel");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");
const { pushNotification } = require("../../services/notification.service");
const { convertToObjectIdMongodb } = require("../../utils");

const customer_submit_review = async (req, res) => {
  const { vehicleId, rating, review, name, ownerId, customerId } = req.body;
  try {
    const vehicleData = await vehicleModel.findById(vehicleId);
    if (!vehicleData)
      return responseReturn(res, 404, { message: "Vehicle not found" });

    await reviewModel.create({
      vehicleId,
      rating,
      review,
      replies: [],
      date: moment().format("LL"),
      customerId,
      ownerId,
      userType,
      userId,
      userName,
    });

    let ratings = 0;
    const reviews = await reviewModel.find({ vehicleId });
    for (let i = 0; i < reviews.length; i++) {
      ratings += reviews[i].rating;
    }
    let postRating = 0;
    if (reviews.length !== 0) {
      vehicleRating = (ratings / reviews.length).toFixed(1);
    }
    await vehicleModel.findByIdAndUpdate(vehicleId, {
      rating: Number(vehicleRating.toFixed(1))
    });

    let senderType = "owner";
    const senderId =
      senderType === "customers" ? req.body.customerId : req.body.ownerId;

    await notificationService.createNotification({
      type: "review",
      senderId: customerId,
      senderType: "customer",
      link: vehicleId, // Có thể dùng vehicleId hoặc postId dựa vào UI
      receiverId: ownerId,
      content: `${name} đã đánh giá xe của bạn ${rating} sao`,
      options: {
        review_rating: rating,
        review_name: name,
        review_content: review,
        vehicleId: vehicleId,
      },
    });
    responseReturn(res, 201, { message: "Review Added Successfully" });
  } catch (error) {
    console.log(error.message);
  }
};

const get_reviews = async (req, res) => {
  const { vehicleId } = req.params;
  let { pageNo } = req.query;
  pageNo = parseInt(pageNo);
  const limit = 5;
  const skipPage = limit * (pageNo - 1);
  try {
    let getRating = await reviewModel.aggregate([
      {
        $match: {
          vehicleId: {
            $eq: convertToObjectIdMongodb(vehicleId),
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

    const getAll = await reviewModel.find({ vehicleId });
    const reviews = await reviewModel
      .find({ vehicleId })
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
