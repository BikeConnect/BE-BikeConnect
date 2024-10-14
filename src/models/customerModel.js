const { Schema, model } = require("mongoose");

const customerSchema = new Schema(
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
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    // role: {
    //   type: String,
    //   required: true,
    // },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currentAddress: {
      type: String,
      default: "",
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = model("customers", customerSchema);
