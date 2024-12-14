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
    identityCard: [
      {
        url: {
          type: String,
          default: "",
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],
    role: {
      type: String,
      default: "owner",
    },
    status: {
      type: String,
      default: "pending",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    subInfo: {
      type: Object,
      default: {},
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

ownerSchema.index({ currentAddress: "text" });

module.exports = model("Owner", ownerSchema);
