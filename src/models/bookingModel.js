"use strict";

const { Schema, model } = require("mongoose");

const bookingSchema = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    postId: {
      type: Schema.ObjectId,
      ref: "Post",
      required: true,
    },
    vehicleId: {
      type: Schema.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    contractId: {
      type: Schema.ObjectId,
      ref: "Contract",
      required: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("bookings", bookingSchema);
