"use strict";

const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "Contract";
const COLLECTION_NAME = "Contracts";

const contractSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "customers",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    ownerConfirmed: {
      status: {
        type: Boolean,
        default: false,
      },
      rejectionReason: String,
      confirmedAt: Date,
      confirmedAt: Date,
    },
    customerConfirmed: {
      status: {
        type: Boolean,
        default: false,
      },
      rejectionReason: String,
      confirmedAt: Date,
      confirmedAt: Date,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "active", "completed", "cancelled"],
      default: "draft",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    terms: {
      type: String,
      required: true,
    },
    expiryTime: {
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
    },
    modificationHistory: [
      {
        modifiedBy: {
          type: Schema.ObjectId,
          ref: "admins",
          required: true,
        },
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: Object,
        },
      },
    ],
  },
  {
    collection: COLLECTION_NAME,
    timestamps: true,
  }
);

contractSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.contractNumber = `CTR${new Date().getFullYear()}${(count + 1)
      .toString()
      .padStart(4, "0")}`;
    this.contractNumber = `CTR${new Date().getFullYear()}${(count + 1)
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});

contractSchema.pre("save", async function (next) {
  if (
    this.ownerConfirmed.rejectionReason ||
    this.customerConfirmed.rejectionReason
  ) {
    this.status = "cancelled";
  } else if (this.ownerConfirmed.status && this.customerConfirmed.status) {
    this.status = "active";
  } else if (this.customerConfirmed.status && !this.ownerConfirmed.status) {
    this.status = "pending";
  } else {
    this.status = "draft";
  }
  next();
});

contractSchema.virtual("rentalDays").get(function () {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

contractSchema.set("toJSON", { virtuals: true });
contractSchema.set("toObject", { virtuals: true });

const Contract = model(DOCUMENT_NAME, contractSchema);
module.exports = Contract;
