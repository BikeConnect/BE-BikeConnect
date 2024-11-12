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
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = model("bookings", bookingSchema);
