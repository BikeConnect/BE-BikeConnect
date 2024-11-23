"use strict";

const bookingModel = require("../../models/bookingModel");
const contractModel = require("../../models/contractModel");
const Post = require("../../models/postModel");
const notificationService = require("../../services/notification.service");
const { convertToObjectIdMongodb } = require("../../utils");
const { responseReturn } = require("../../utils/response");
const cron = require("node-cron");
const moment = require("moment");

const createContract = async (req, res) => {
  try {
    const contract = await contractModel.create({
      ...req.body,
      createdBy: req.admin._id,
      lastModifiedBy: req.admin._id,
    });

    await contract.save();
    responseReturn(res, 201, {
      message: "Contract created successfully",
      contract,
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const getAllContracts = async (req, res) => {
  try {
    const contracts = await contractModel.find({});
    responseReturn(res, 200, { contracts });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const getContractById = async (req, res) => {
  const { contractId } = req.params;
  try {
    const contract = await contractModel.findById(contractId);
    if (!contract) responseReturn(res, 404, { error: "Contract not found" });
    responseReturn(res, 200, { contract });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const updateContract = async (req, res) => {
  const { contractId } = req.params;
  try {
    const contract = await contractModel.findById(contractId);
    if (!contract) {
      return responseReturn(res, 404, { message: "Contract not found" });
    }

    contract.modificationHistory.push({
      modifiedBy: req.admin._id,
      changes: req.body,
    });

    Object.assign(contract, req.body);
    contract.lastModifiedBy = req.admin._id;

    await contract.save();

    await Promise.all([
      notificationService.createNotification({
        type: "contract",
        senderId: convertToObjectIdMongodb(req.admin._id),
        senderType: "admin",
        link: convertToObjectIdMongodb(contractId),
        receiverId: contract.ownerId,
        content: "Hợp đồng đã được cập nhật",
        contractId: convertToObjectIdMongodb(contractId),
        actionType: "CONTRACT_MODIFIED",
      }),
      notificationService.createNotification({
        type: "contract",
        senderId: convertToObjectIdMongodb(req.admin._id),
        senderType: "admin",
        link: convertToObjectIdMongodb(contractId),
        receiverId: contract.customerId,
        content: "Hợp đồng đã được cập nhật bởi admin",
        contractId: convertToObjectIdMongodb(contractId),
        actionType: "CONTRACT_MODIFIED",
      }),
    ]);

    responseReturn(res, 200, {
      message: "Contract updated successfully",
      contract,
    });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const deleteContract = async (req, res) => {
  const { contractId } = req.params;
  try {
    const contract = await contractModel.findByIdAndDelete(contractId);
    if (!contract)
      return responseReturn(res, 404, { message: "Contract not found" });
    responseReturn(res, 200, { message: "Contract deleted successfully" });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};


const confirmContract = async (req, res) => {
  const { contractId } = req.params;
  const { isConfirmed, rejectReason } = req.body;
  const userId = req.id;
  const userRole = req.role;

  try {
    const contract = await contractModel.findById(contractId);
    if (!contract) {
      return responseReturn(res, 404, { message: "Contract not found" });
    }

    if (moment().isAfter(contract.expiryTime)) {
      await handleExpiredContract(contract);
      return responseReturn(res, 400, {
        message: "Contract expired",
      });
    }

    if (userRole === "owner") {
      contract.ownerConfirmed = {
        status: isConfirmed,
        rejectionReason: isConfirmed ? null : rejectReason,
        confirmedAt: new Date(),
      };

      if (isConfirmed) {
        contract.status = "pending";
        contract.expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await notificationService.createNotification({
          type: "contract",
          senderId: userId,
          senderType: "owner",
          link: contractId,
          receiverId: contract.customerId,
          content:
            "Chủ xe đã chấp nhận yêu cầu, vui lòng xác nhận trong vòng 24h",
          contractId: contractId,
          actionType: "CONTRACT_ACCEPTED",
        });
      } else {
        contract.status = "cancelled";
      }
    }

    if (userRole === "customer") {
      contract.customerConfirmed = {
        status: isConfirmed,
        rejectionReason: isConfirmed ? null : rejectReason,
        confirmedAt: new Date(),
      };

      if (isConfirmed && contract.ownerConfirmed.status) {
        contract.status = "active";
        const booking = await bookingModel.create({
          customerId: contract.customerId,
          postId: contract.postId,
          contractId: contract._id,
          startDate: contract.startDate,
          endDate: contract.endDate,
          totalPrice: contract.totalAmount,
          status: "accepted",
        });

        await Post.findByIdAndUpdate(contract.postId, {
          availability_status: "rented",
        });

        // Thông báo cho owner
        await notificationService.createNotification({
          type: "contract",
          senderId: userId,
          senderType: "customer",
          link: contractId,
          receiverId: contract.ownerId,
          content: "Khách hàng đã xác nhận, hợp đồng đã được kích hoạt",
          contractId: contractId,
          actionType: "CONTRACT_ACTIVATED",
        });
      } else if (!isConfirmed) {
        contract.status = "cancelled";
      }
    }

    await contract.save();

    responseReturn(res, 200, {
      message: `Contract ${
        isConfirmed ? "confirmed" : "rejected"
      } successfully`,
      contract,
    });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const handleExpiredContract = async (contract) => {
  contract.status = "cancelled";
  await contract.save();

  await Promise.all([
    notificationService.createNotification({
      type: "contract",
      senderId: contract._id,
      senderType: "system",
      link: contract._id,
      receiverId: contract.customerId,
      content: "Hợp đồng đã hết hạn do không được xác nhận kịp thời",
      contractId: contract._id,
      actionType: "CONTRACT_EXPIRED",
    }),
    notificationService.createNotification({
      type: "contract",
      senderId: contract._id,
      senderType: "system",
      link: contract._id,
      receiverId: contract.ownerId,
      content: "Hợp đồng đã hết hạn do không được xác nhận kịp thời",
      contractId: contract._id,
      actionType: "CONTRACT_EXPIRED",
    }),
  ]);
};

const completeContract = async (req, res) => {
  const { contractId } = req.params;
  try {
    const contract = await contractModel.findByIdAndUpdate(
      contractId,
      {
        $set: {
          status: "completed",
          lastModifiedBy: req.admin._id,
        },
        $push: {
          modificationHistory: {
            modifiedBy: req.admin._id,
            changes: { status: "completed" },
            modifiedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!contract) {
      return responseReturn(res, 404, { message: "Contract not found" });
    }

    if (!contract.ownerConfirmed.status || !contract.customerConfirmed.status) {
      return responseReturn(res, 400, {
        message: "Contract is not confirmed by both parts",
      });
    }

    if (contract.status !== "active" && contract.status !== "completed") {
      return responseReturn(res, 400, {
        message: "Only active contract can be marked as completed",
      });
    }

    const currentDate = new Date();
    const endDate = new Date(contract.endDate);

    if (currentDate < endDate) {
      return responseReturn(res, 400, {
        message: "Contract cannot be completed before the end date",
      });
    }

    responseReturn(res, 200, {
      message: "Contract completed successfully",
      contract,
    });
  } catch (error) {
    console.log(error);
    responseReturn(res, 500, { error: error.message });
  }
};

cron.schedule("1 0 * * *", async (req, res) => {
  try {
    const currentDate = new Date();

    const expiredContracts = await contractModel.find({
      status: "active",
      endDate: { $lt: currentDate },
    });

    for (const contract of expiredContracts) {
      contract.status = "completed";
      await contract.save();

      await bookingModel.findOneAndUpdate(
        { contractId: contract._id },
        { status: "completed" }
      );

      await Post.findByIdAndUpdate(contract.postId, {
        availability_status: "available",
      });

      await Promise.all([
        notificationService.createNotification({
          type: "contract",
          senderId: convertToObjectIdMongodb(contract._id),
          senderType: "system",
          link: convertToObjectIdMongodb(contract._id),
          receiverId: contract.customerId,
          content: "Hợp đồng thuê xe của bạn đã hoàn thành",
          contractId: convertToObjectIdMongodb(contract._id),
          actionType: "CONTRACT_COMPLETED",
        }),
        notificationService.createNotification({
          type: "contract",
          senderId: convertToObjectIdMongodb(contract._id),
          senderType: "system",
          link: convertToObjectIdMongodb(contract._id),
          receiverId: contract.ownerId,
          content: "Hợp đồng cho thuê xe của bạn đã hoàn thành",
          contractId: convertToObjectIdMongodb(contract._id),
          actionType: "CONTRACT_COMPLETED",
        }),
      ]);
    }
  } catch (error) {
    console.log("Auto complete contract error:", error.message);
    responseReturn(res, 500, { error: error.message });
  }
});

module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  confirmContract,
  completeContract,
};
