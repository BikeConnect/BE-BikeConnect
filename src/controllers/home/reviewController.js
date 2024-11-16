"use strict";

const reviewModel = require("../../models/reviewModel");
const { responseReturn } = require("../../utils/response");
const { pushNotification } = require("../../services/notification.service");
const moment = require("moment");
const { findReplyIndex } = require("../../helpers/findIndex");

const add_reply = async (req, res) => {
  const { reviewId } = req.params;
  const { content, userType, ownerId, customerId } = req.body;
  const userId = userType === "owner" ? ownerId : customerId;
  const userRole = req.role;
  console.log("userType:::", userType);
  console.log("userId:::", userId);

  console.log(userRole);
  try {
    if (userType !== userRole) {
      return responseReturn(res, 403, {
        message: "You are not allowed to reply to this review",
      });
    }
    const review = await reviewModel
      .findById(reviewId)
      .populate("ownerId", "shopInfo.shopName")
      .populate("postId");

    if (!review) return responseReturn(res, 404, { error: "Review not found" });
    if (userRole === "owner") {
      if (review.postId.ownerId.toString() !== userId) {
        return responseReturn(res, 403, {
          message: "Only the owner of this post can reply to reviews",
        });
      }
    }

    const userName =
      userRole === "owner" ? review.ownerId.shopInfo.shopName : review.name;

    const newReply = {
      content,
      date: moment().format("LL"),
      userId,
      userType: userRole,
      userName,
    };

    review.replies.push(newReply);
    await review.save();

    // pushNotification({
    //   type: "review",
    //   receiverId: 1,
    //   senderType: userType,
    //   senderId: userId,
    //   link: reviewId,
    //   options: {
    //     //   review_rating: req.body.rating,
    //     //   review_name: req.body.name,
    //     //   review_content: req.body.review,
    //     reply_content: content,
    //     sender_name: userName,
    //   },
    // }).catch(console.error);

    responseReturn(res, 201, { message: "Reply added successfully" });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const update_reply = async (req, res) => {
  const { reviewId } = req.params;
  const { content, replyId, userType, ownerId, customerId } = req.body;
  const userId = userType === "owner" ? ownerId : customerId;
  const userRole = req.role;

  try {
    if (userType !== userRole) {
      return responseReturn(res, 403, {
        message: "You are not allowed to reply to this review",
      });
    }
    const review = await reviewModel
      .findById(reviewId)
      .populate("ownerId", "shopInfo.shopName")
      .populate("postId");

    if (!review) {
      return responseReturn(res, 404, { error: "Review not found" });
    }

    if (userRole === "owner") {
      if (review.postId.ownerId.toString() !== userId) {
        return responseReturn(res, 403, {
          message: "Only the owner of this post can update their to replies",
        });
      }
    }

    const findReply = findReplyIndex({
      replies: review.replies,
      replyId,
      userId,
      userRole,
    });

    if (findReply === -1) {
      return responseReturn(res, 403, {
        message: "Reply not found or you don't have permission to update it",
      });
    }

    review.replies[findReply] = {
      ...review.replies[findReply].toObject(),
      content: content,
      date: moment().format("LL"),
    };

    await review.save();
    const updatedReply = review.replies[findReply];
    responseReturn(res, 200, {
      message: "Reply updated successfully",
      reply: updatedReply,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const delete_reply = async (req, res) => {
  const { reviewId } = req.params;
  const { replyId, userType, ownerId, customerId } = req.body;
  const userId = userType === "owner" ? ownerId : customerId;
  const userRole = req.role;

  try {
    if (userType !== userRole) {
      return responseReturn(res, 403, {
        message: "You are not allowed to reply to this review",
      });
    }

    const review = await reviewModel
      .findById(reviewId)
      .populate("ownerId", "shopInfo.shopName")
      .populate("postId");

    if (!review) {
      return responseReturn(res, 404, { error: "Review not found" });
    }

    if (userRole === "owner") {
      if (review.postId.ownerId.toString() !== userId) {
        return responseReturn(res, 403, {
          message: "Only the owner of this post can update their to replies",
        });
      }
    }

    const findReply = findReplyIndex({
      replies: review.replies,
      replyId,
      userId,
      userRole,
    });

    if (findReply === -1) {
      return responseReturn(res, 403, {
        message: "Reply not found or you don't have permission to delete it",
      });
    }

    review.replies.splice(findReply, 1);
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
  add_reply,
  update_reply,
  delete_reply,
};
