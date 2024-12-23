"use strict";

const NOTI = require("../models/notificationModel");
const { convertToObjectIdMongodb } = require("../utils");
const contractModel = require("../models/contractModel");
const { io } = require("../server");

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
  const notification = await NOTI.findById(notifcationId)
    .populate({
      path: "contractId",
      populate: [
        {
          path: "vehicleId",
          select: "brand model license price images",
        },
        {
          path: "customerId",
          select: "name phone email",
        },
        {
          path: "ownerId",
          select: "name phone email",
        },
      ],
    })
    .populate("noti_senderId", "name image");
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
  try {
    const notifications = await NOTI.find({
      noti_type: "contract",
      contractId: convertToObjectIdMongodb(contractId),
    })
      .populate({
        path: "contractId",
        populate: [
          {
            path: "vehicleId",
            select: "brand model licensePlate price images",
          },
          {
            path: "customerId",
            select: "name phone email",
          },
          {
            path: "ownerId",
            select: "name phone email",
          },
        ],
      })
      .populate("noti_senderId", "name avatar")
      .sort({ createdAt: -1 });

    return notifications;
  } catch (error) {
    throw new Error(`Error getting contract notifications: ${error.message}`);
  }
};

const createNotification = async (data) => {
  try {
    const notification = await NOTI.createNotification(data);
    if (data.type === "contract" && data.contractId) {
      const contract = await contractModel.findById(data.contractId);
      notification.contract = contract;
    }

    try {
      if (io) {
        const receiverRole = data.receiverType;
        const receiverRoom = `${receiverRole}_${data.receiverId}`;

        io.to(receiverRoom).emit("new_notification", {
          ...notification.toJSON(),
          contract: notification.contract,
          createdAt: new Date(),
        });
      }
    } catch (socketError) {
      console.error("Socket emission failed:", socketError);
    }

    return notification;
  } catch (error) {
    throw new Error(`Error creating notification: ${error.message}`);
  }
};

const getAllNotifications = async ({ sort = "desc" }) => {
  const sortOrder = sort === "desc" ? -1 : 1;

  const notifications = await NOTI.aggregate([
    {
      $sort: { createdAt: sortOrder },
    },
    {
      $lookup: {
        from: "contracts",
        localField: "contractId",
        foreignField: "_id",
        as: "contract",
      },
    },
    {
      $project: {
        noti_type: 1,
        noti_senderId: 1,
        senderType: 1,
        noti_receiverId: 1,
        noti_content: 1,
        noti_status: 1,
        isRead: 1,
        actionType: 1,
        createdAt: 1,
        contract: { $arrayElemAt: ["$contract", 0] },
      },
    },
  ]);

  return {
    notifications,
    total: notifications.length,
  };
};

// const getOwnerNotifications = async (ownerId) => {
//   try {
//     const notifications = await NOTI.aggregate([
//       {
//         $match: {
//           noti_receiverId: convertToObjectIdMongodb(ownerId),
//           senderType: "customer",
//         },
//       },
//       {
//         $lookup: {
//           from: "contracts",
//           localField: "contractId",
//           foreignField: "_id",
//           as: "contract",
//         },
//       },
//       {
//         $lookup: {
//           from: "customers",
//           localField: "noti_senderId",
//           foreignField: "_id",
//           as: "sender",
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       {
//         $project: {
//           noti_type: 1,
//           noti_content: 1,
//           noti_status: 1,
//           isRead: 1,
//           createdAt: 1,
//           actionType: 1,
//           sender: {
//             $arrayElemAt: ["$sender", 0],
//           },
//           contract: {
//             $arrayElemAt: ["$contract", 0],
//           },
//         },
//       },
//     ]);

//     return notifications;
//   } catch (error) {
//     throw new Error(`Error getting owner notifications: ${error.message}`);
//   }
// };

// const getCustomerNotifications = async (customerId) => {
//   try {
//     const notifications = await NOTI.aggregate([
//       {
//         $match: {
//           noti_receiverId: convertToObjectIdMongodb(customerId),
//           senderType: "owner",
//         },
//       },
//       {
//         $lookup: {
//           from: "contracts",
//           localField: "contractId",
//           foreignField: "_id",
//           as: "contract",
//         },
//       },
//       {
//         $lookup: {
//           from: "owners",
//           localField: "noti_senderId",
//           foreignField: "_id",
//           as: "sender",
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       {
//         $project: {
//           noti_type: 1,
//           noti_content: 1,
//           noti_status: 1,
//           isRead: 1,
//           createdAt: 1,
//           actionType: 1,
//           sender: {
//             $arrayElemAt: ["$sender", 0],
//           },
//           contract: {
//             $arrayElemAt: ["$contract", 0],
//           },
//         },
//       },
//     ]);

//     return notifications;
//   } catch (error) {
//     throw new Error(`Error getting customer notifications: ${error.message}`);
//   }
// };

const getCustomerNotifications = async (customerId) => {
  try {
    const notifications = await NOTI.find({
      noti_receiverId: convertToObjectIdMongodb(customerId),
      senderType: "owner",
    })
      .populate({
        path: "contractId",
        populate: [
          {
            path: "vehicleId",
            select: "brand model license price images",
          },
          {
            path: "customerId",
            select: "name phone email",
          },
          {
            path: "ownerId",
            select: "name phone email",
          },
        ],
      })
      .populate("noti_senderId", "name image")
      .sort({ createdAt: -1 });

    return notifications;
  } catch (error) {
    throw new Error(`Error getting customer notifications: ${error.message}`);
  }
};

const getOwnerNotifications = async (ownerId) => {
  try {
    const notifications = await NOTI.find({
      noti_receiverId: convertToObjectIdMongodb(ownerId),
      senderType: "customer",
    })
      .populate({
        path: "contractId",
        populate: [
          {
            path: "vehicleId",
            select: "brand model license price images",
          },
          {
            path: "customerId",
            select: "name phone email",
          },
          {
            path: "ownerId",
            select: "name phone email",
          },
        ],
      })
      .populate("noti_senderId", "name image")
      .sort({ createdAt: -1 });

    return notifications;
  } catch (error) {
    throw new Error(`Error getting owner notifications: ${error.message}`);
  }
};

module.exports = {
  pushNotification,
  listNotiByCus,
  markAsRead,
  getUnreadCount,
  createNotification,
  getAllNotifications,
  getOwnerNotifications,
  getCustomerNotifications,
};
