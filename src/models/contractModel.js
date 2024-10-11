const { Schema, model } = require("mongoose");

const contractSchema = new Schema(
  {
    ownerId: {
      type: Schema.ObjectId,
      required: true,
    },
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    rentalPrice: {
      type: Number,
      required: true,
    },
    rentalStartDate: {
      type: String,
      required: true,
    },
    rentalEndDate: {
      type: String,
      required: true,
    },
    contractTerms: {
      type: String,
      required: true,
    },
    signature: {
      type: Boolean,
      default: false,
    },
    contractStatus: {
      type: String,
      default: "pending",
    },
    additionalFee: {
      type: Number,
      required: true,
    },
    chosenDropOffLocation: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("contracts", contractSchema);
