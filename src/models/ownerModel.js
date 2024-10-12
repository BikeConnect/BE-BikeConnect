const { Schema, model } = require("mongoose");

const ownerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "owner",
    },
    status: {
      type: String,
      default: "pending",
    },
    currentAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("owners", ownerSchema);
