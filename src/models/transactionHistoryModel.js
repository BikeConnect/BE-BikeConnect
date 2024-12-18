const { Schema, model } = require("mongoose");

const transactionHistorySchema = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    ownerId: {
      type: Schema.ObjectId,
      required: true,
    },
    bookingId: {
      type: Schema.ObjectId,
      required: true,
    },
    transactionDate: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    rentalDuration: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("transaction_history", transactionHistorySchema);
