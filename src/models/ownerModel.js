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
      default: 0,
    },
    image: {
      type: String,
      default: "",
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
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("owners", ownerSchema);
