const { Schema, model } = require("mongoose");

const reviewSchema = new Schema(
  {
    postId: {
      type: Schema.ObjectId,
      required: true,
    },
    ownerId: {
      type: Schema.ObjectId,
      ref: "Owner",
      required: true,
    },
    customerId: {
      type: Schema.ObjectId,
      ref: "customers",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("reviews", reviewSchema);
