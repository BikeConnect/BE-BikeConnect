"use strict";

const NOTI = require("../models/notificationModel");

const pushNotification = async ({
  type = "booking",
  receiverId = 1,
  senderType = "customers",
  senderId = 1,
  link,
  options = {},
}) => {
  let noti_content;

  if (type === "booking") {
    noti_content = "Yêu cầu đặt xe của bạn đã được gửi";
  } else if (type === "contract") {
    noti_content = "Hợp đồng thuê xe đã được tạo";
  } else if (type === "review") {
    noti_content = "Bạn có một đánh giá mới cho bài viết của mình";
  }

  if (!link) {
    throw new Error("noti_link is required");
  }

  const newNoti = await NOTI.create({
    noti_type: type,
    noti_content,
    noti_senderId: senderId,
    noti_link: link,
    senderType: senderType,
    noti_receiverId: receiverId,
    noti_options: options,
  });

  return newNoti;
};

const listNotiByCus = async ({
  cusId = 1,
  type = 'ALL',
  isReal = 0
}) => {
  const match = { noti_receiverId: cusId }
  if(type !== 'ALL') {
    match['noti_type'] = type
  }

  return await NOTI.aggregate([
    {
      $match: match
    },
    {
      $project: {
        noti_type: 1,
        noti_senderId: 1,
        noti_receiverId: 1,
        noti_link: 1,
        noti_content: 1,
        createAt: 1
      }
    }
  ])
}

module.exports = {
  pushNotification,
  listNotiByCus
};
