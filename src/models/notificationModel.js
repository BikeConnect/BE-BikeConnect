// const { Schema, model } = require("mongoose");

// const notificationSchema = new Schema(
//   {
//     customerId: {
//       type: Schema.ObjectId,
//       required: true,
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     isRead: {
//       type: Boolean,
//       default: false,
//     },
//     scheduleDate: {
//       type: Date,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = model("notifications", notificationSchema);


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
    senderType: { type: String, enum: ["Owner", "customers"], required: true },
    noti_link: { type: Schema.Types.ObjectId, required: false },
    noti_receiverId: { type: Number, required: true },
    noti_content: { type: String, required: true },
    noti_options: { type: Object, default: {} },
    noti_status: { type: String, enum: ['unread', 'read'], default: 'unread' },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  }
);

module.exports = model(DOCUMENT_NAME, notificationSchema);

