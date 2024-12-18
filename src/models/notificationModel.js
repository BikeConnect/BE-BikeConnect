"use strict";

const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "Notification";
const COLLECTION_NAME = "Notifications";

const notificationSchema = new Schema(
  {
    noti_type: {
      type: String,
      enum: ["booking", "contract", "payment", "transaction", "review"],
      required: true,
    },
    noti_senderId: { type: Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ["owner", "customer"], required: true },
    noti_link: { type: Schema.Types.ObjectId, required: false },
    noti_receiverId: { type: Schema.Types.ObjectId, required: true },
    noti_content: { type: String, required: true },
    noti_options: { type: Object, default: {} },
    noti_status: { type: String, enum: ["unread", "read"], default: "unread" },
    isRead: { type: Boolean, default: false },

    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: function () {
        return this.noti_type === "contract";
      },
    },
    actionType: {
      type: String,
      enum: [
        "CONTRACT_REQUEST",
        "CONTRACT_CONFIRMATION",
        "CONTRACT_ACCEPTED",
        "CONTRACT_ACTIVATED",
        "CONTRACT_REJECTED",
        "CONTRACT_MODIFIED",
        "CONTRACT_COMPLETED",
        "CONTRACT_EXPIRED",
        "MODIFICATION_REQUESTED",
        "MODIFICATION_APPROVED",
        "MODIFICATION_REJECTED",
        "REVIEW_REPLIED",
      ],
      required: function () {
        return this.noti_type === "contract";
      },
    },
    additionalData: {
      type: Object,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(+new Date() + 30 * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  }
);

notificationSchema.index({ noti_receiverId: 1, isRead: 1 });
notificationSchema.index({ noti_type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

//danh dau thong bao da doc
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.noti_status = "read";
  await this.save();
  return this;
};

//danh dau chua doc
notificationSchema.statics.getUnreadCount = async function (receiverId) {
  const count = await this.countDocuments({
    noti_receiverId: receiverId,
    isRead: false,
  });
  return count;
};

//lay thong bao lien quan den contract
notificationSchema.statics.getContractNotifications = async function (
  contractId
) {
  const notifications = await this.find({
    noti_type: "contract",
    contractId: contractId,
  }).sort({ createdAt: -1 });
  return notifications;
};

//tao thong bao
notificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);
  return notification;
};

module.exports = model(DOCUMENT_NAME, notificationSchema);
