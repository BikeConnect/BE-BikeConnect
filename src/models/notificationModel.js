const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    scheduleDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("notifications", notificationSchema);
