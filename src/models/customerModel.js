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
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    identityCard: [{
      url: {
        type: String,
        default: ""
      },
      publicId: {
        type: String,
        default: ""
      }
    }],
    role: {
      type: String,
      default: "customer",
      enum: ["customer"],
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currentAddress: {
      type: String,
      default: "",
    },
    alterAddress: {
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
