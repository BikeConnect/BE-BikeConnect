"use strict";

const { Schema, model } = require("mongoose");

const reviewSchema = new Schema(
  {
    vehicleId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Vehicle",
    },
    ownerId: {
      type: Schema.ObjectId,
      ref: "Owner",  
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers",  
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
    replies: [
      {
        content: {
          type: String,
          required: true,
        },
        date: {
          type: String,
          required: true,
        },
        userId: {
          type: Schema.ObjectId,
          required: true,
        },
        userType: {
          type: String,
          enum: ["owner", "customer"],
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
      },
    ],
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
