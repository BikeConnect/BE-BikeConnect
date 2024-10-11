const { Schema, model } = require("mongoose");

const paymentSchema = new Schema(
  {
    ownerId: {
      type: Schema.ObjectId,
      required: true,
    },
    adminId: {
      type: Schema.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("payment", paymentSchema);
