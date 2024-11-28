"use strict";

const NOTI = require("../models/notificationModel");
const { convertToObjectIdMongodb } = require("../utils");

const pushNotification = async ({
  type = "booking",
  receiverId = 1,
  senderType = "customers",
  senderId = 1,
  link,
  options = {},
  contractId = null,
  actionType = null,
}) => {
  let noti_content;

  // if (type === "booking") {
  //   noti_content = "Yêu cầu đặt xe của bạn đã được gửi";
  // } else if (type === "contract") {
  //   noti_content = "Hợp đồng thuê xe đã được tạo";
  // } else if (type === "review") {
  //   noti_content = "Bạn có một đánh giá mới cho bài viết của mình";
  // }

  switch (type) {
    case "booking":
      noti_content = "Yêu cầu đặt xe của bạn đã được gửi";
      break;
    case "contract":
      switch (actionType) {
        case "CONTRACT_REQUEST":
          noti_content = "Bạn có một yêu cầu hợp đồng mới";
          break;
        case "CONTRACT_CONFIRMATION":
          noti_content = "Hợp đồng đang chờ xác nhận";
          break;
        case "CONTRACT_ACCEPTED":
          noti_content = "Hợp đồng đã được chấp nhận";
          break;
        case "CONTRACT_REJECTED":
          noti_content = "Hợp đồng đã bị từ chối";
          break;
        default:
          noti_content = "Có cập nhật mới về hợp đồng";
      }
      break;
    case "review":
      noti_content = "Bạn có một đánh giá mới cho bài viết của mình";
      break;
  }
  
  if (!link) {
    throw new Error("noti_link is required");
  }

  const notificationData = await NOTI.create({
    noti_type: type,
    noti_content,
    noti_senderId: senderId,
    noti_link: link,
    senderType: senderType,
    noti_receiverId: receiverId,
    noti_options: options,
  });

  if (type === "contract") {
    notificationData.contractId = contractId;
    notificationData.actionType = actionType;
  }

  const newNoti = await NOTI.create(notificationData);
  return newNoti;
};

const listNotiByCus = async ({ cusId = 1, type = "ALL", isReal = false }) => {
  const match = { noti_receiverId: cusId };
  if (type !== "ALL") {
    match["noti_type"] = type;
  }

  return await NOTI.aggregate([
    {
      $match: match,
    },
    {
      $project: {
        noti_type: 1,
        noti_senderId: 1,
        noti_receiverId: 1,
        noti_link: 1,
        noti_content: 1,
        createAt: 1,
        actionType: 1,
      },
    },
  ]);
};

const markAsRead = async (notifcationId) => {
  const notification = await NOTI.findById(notifcationId);
  if (!notifcationId) throw new Error("Notifcation not found");

  notification.isRead = true;
  notification.noti_status = "read";
  await notification.save();
  return notification;
};

const getUnreadCount = async (receiverId) => {
  const count = await NOTI.countDocuments({
    noti_receiverId: receiverId,
    isRead: false,
  });
  return count;
};

const getContractNotifications = async (contractId) => {
  const notifications = await NOTI.find({
    noti_type: "contract",
    contractId: convertToObjectIdMongodb(contractId),
  }).sort({ createdAt: -1 });
  return notifications;
};

const createNotification = async (data) => {
  const notification = await NOTI.create({
    noti_type: data.type,
    noti_senderId: data.senderId,
    senderType: data.senderType,
    noti_link: data.link,
    noti_receiverId: data.receiverId,
    noti_content: data.content,
    noti_options: data.options || {},
    contractId: data.contractId,
    actionType: data.actionType,
    isRead: false,
    noti_status: "unread",
  });
  return notification;
};

module.exports = {
  pushNotification,
  listNotiByCus,
  markAsRead,
  getUnreadCount,
  createNotification,
};
