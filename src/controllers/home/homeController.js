"use strict";

const reviewModel = require("../../models/reviewModel");
const post = require("../../models/postModel");
const { responseReturn } = require("../../utils/response");
const moment = require("moment");
const mongoose = require("mongoose");
const { pushNotification } = require("../../services/notification.service");

const customer_submit_review = async (req, res) => {
  const {
    postId,
    rating,
    review,
    name,
    ownerId,
    customerId,
    userId,
    userName,
    userType,
  } = req.body;
  try {
    // await reviewModel.create({
    //   postId,
    //   name,
    //   rating,
    //   review,
    //   ownerReply: [],
    //   date: moment(Date.now()).format("LL"),
    //   customerId,
    //   ownerId,
    // });
    await reviewModel.create({
      postId,
      name,
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

    let senderType = "owner";
    const senderId =
      senderType === "customers" ? req.body.customerId : req.body.ownerId;

    pushNotification({
      type: "review",
      receiverId: 1,
      senderType: senderType,
      senderId: senderId,
      link: postId,
      options: {
        review_rating: req.body.rating,
        review_name: req.body.name,
        review_content: req.body.review,
      },
    }).catch(console.error);
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
            $eq: new mongoose.Types.ObjectId(`${postId}`),
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

const customer_reply_review = async (req, res) => {
  const { reviewId } = req.params;
  const { content } = req.body;
  const customerId = req.customerId;

  try {
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return responseReturn(res, 404, { error: "Review not found" });
    }

    if (
      review.customerId.toString() !== customerId &&
      !review.ownerReply.length
    ) {
      return responseReturn(res, 403, {
        message: "You can only reply to your own reviews or owner's replies",
      });
    }

    const newReply = {
      content: content,
      date: moment().format("LL"),
    };

    review.customerReply.push(newReply);
    await review.save();

    responseReturn(res, 200, {
      message: "Reply added successfully",
      review,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const customer_update_reply = async (req, res) => {
  const { reviewId } = req.params;
  const { content, replyId } = req.body;
  const customerId = req.customerId;

  try {
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return responseReturn(res, 404, { error: "Review not found" });
    }

    if (review.customerId.toString() !== customerId) {
      return responseReturn(res, 403, {
        message: "You can only update your own replies",
      });
    }

    const replyIndex = findReplyIndex(review.customerReply, replyId);
    if (replyIndex === -1) {
      return responseReturn(res, 404, { message: "Reply not found" });
    }

    review.customerReply[replyIndex] = {
      ...review.customerReply[replyIndex].toObject(),
      content: content,
      date: moment().format("LL"),
    };

    await review.save();
    responseReturn(res, 200, {
      message: "Reply updated successfully",
      review,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const customer_delete_reply = async (req, res) => {
  const { reviewId } = req.params;
  const { replyId } = req.body;
  const customerId = req.customerId;

  try {
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return responseReturn(res, 404, { error: "Review not found" });
    }

    if (review.customerId.toString() !== customerId) {
      return responseReturn(res, 403, {
        message: "You can only delete your own replies",
      });
    }

    const replyIndex = findReplyIndex(review.customerReply, replyId);
    if (replyIndex === -1) {
      return responseReturn(res, 404, { message: "Reply not found" });
    }

    review.customerReply.splice(replyIndex, 1);
    await review.save();

    responseReturn(res, 200, {
      message: "Reply deleted successfully",
      review,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

module.exports = {
  customer_submit_review,
  get_reviews,
  customer_reply_review,
  customer_update_reply,
  customer_delete_reply,
};
