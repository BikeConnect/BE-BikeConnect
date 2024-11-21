const { Schema, model } = require("mongoose");

const contractSchema = new Schema(
  {
    contractNumber: {
      type: String,
      unique: true,
    },
    customerId: {
      type: Schema.ObjectId,
      required: true,
      ref: "customers",
    },
    postId: {
      type: Schema.ObjectId,
      ref: "Post",
      required: true,
    },
    ownerId: {
      type: Schema.ObjectId,
      ref: "Owner",
      required: true,
    },
    ownerConfirmed: {
      status: {
        type: Boolean,
        default: false,
      },
      rejectionReason: String,
      confirmedAt: Date,
    },
    customerConfirmed: {
      status: {
        type: Boolean,
        default: false,
      },
      rejectionReason: String,
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
    createdBy: {
      type: Schema.ObjectId,
      ref: "admins",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.ObjectId,
      ref: "admins",
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
    timestamps: true,
  }
);

contractSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
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
  } else if (this.status === "draft") {
    this.status = "pending";
  }
  next();
});

contractSchema.virtual("rentalDays").get(function () {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

contractSchema.set("toJSON", { virtuals: true });
contractSchema.set("toObject", { virtuals: true });

module.exports = model("contracts", contractSchema);
