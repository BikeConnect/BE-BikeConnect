"use strict";

const bookingModel = require("../../models/bookingModel");
const contractModel = require("../../models/contractModel");
const vehicleModel = require("../../models/vehicleModel");
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
    const contract = await contractModel
      .findById(contractId)
      .populate("ownerId", "name")
      .populate("vehicleId", "brand");

    if (!contract) {
      return responseReturn(res, 404, { message: "Contract not found" });
    }

    if (userRole === "owner") {
      if (!isConfirmed) {
        contract.status = "cancelled";
        contract.ownerConfirmed = {
          status: false,
          rejectionReason: rejectReason,
          confirmedAt: new Date(),
        };
        const booking = await bookingModel.create({
          customerId: contract.customerId,
          contractId: contract._id,
          vehicleId: contract.vehicleId,
          startDate: contract.startDate,
          endDate: contract.endDate,
          totalPrice: contract.totalAmount,
          status: "cancelled",
        });
        await contract.save();

        await notificationService.createNotification({
          noti_type: "contract",
          noti_senderId: userId,
          senderType: "owner",
          noti_link: contractId,
          noti_receiverId: contract.customerId,
          noti_content: `Yêu cầu thuê xe đã bị từ chối. Lý do: ${rejectReason}`,
          contractId: contractId,
          actionType: "CONTRACT_REJECTED",
        });
        return responseReturn(res, 200, {
          message: "Contract rejected successfully",
          contract,
        });
      } else {
        contract.ownerConfirmed = {
          status: true,
          confirmedAt: new Date(),
        };
        contract.status = "pending";
        contract.expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await contract.save();

        await notificationService.createNotification({
          noti_type: "contract",
          noti_senderId: userId,
          senderType: "owner",
          noti_link: contractId,
          noti_receiverId: contract.customerId,
          noti_content: `Chủ xe đã chấp nhận yêu cầu thuê xe ${contract.vehicleId.brand} của bạn, vui lòng click vào đây để xác nhận trong vòng 24h`,
          contractId: contractId,
          actionType: "CONTRACT_ACCEPTED",
        });
      }
    }

    if (userRole === "customer") {
      const activeContract = await contractModel.findOne({
        vehicleId: contract.vehicleId,
        status: "active",
        _id: { $ne: contractId },
        $or: [
          {
            startDate: { $lte: contract.endDate },
            endDate: { $gte: contract.startDate },
          },
        ],
      });

      if (activeContract) {
        return responseReturn(res, 400, {
          message: "Xe này đã được thuê trong khoảng thời gian này",
        });
      }

      contract.customerConfirmed = {
        status: isConfirmed,
        rejectionReason: isConfirmed ? null : rejectReason,
        confirmedAt: new Date(),
      };

      if (isConfirmed && contract.ownerConfirmed.status) {
        contract.status = "active";
        const booking = await bookingModel.create({
          customerId: contract.customerId,
          contractId: contract._id,
          vehicleId: contract.vehicleId,
          startDate: contract.startDate,
          endDate: contract.endDate,
          totalPrice: contract.totalAmount,
          status: "accepted",
        });

        await vehicleModel.findByIdAndUpdate(contract.vehicleId, {
          availability_status: "rented",
        });

        const notificationCustomer = {
          noti_type: "contract",
          noti_senderId: contract.ownerId,
          senderType: "owner",
          noti_link: contractId,
          noti_receiverId: contract.customerId,
          noti_content: `Bạn đã thuê xe ${contract.vehicleId.brand} thành công! Vui lòng liên hệ chủ xe để nhận xe.`,
          contractId: contractId,
          actionType: "CONTRACT_ACTIVATED",
        };
        const newNotificationCus = await notificationService.createNotification(
          notificationCustomer
        );

        const notificationOwner = {
          noti_type: "contract",
          noti_senderId: userId,
          senderType: "customer",
          noti_link: contractId,
          noti_receiverId: contract.ownerId,
          noti_content: "Khách hàng đã xác nhận, hợp đồng đã được kích hoạt",
          noti_options: {},
          contractId: contractId,
          actionType: "CONTRACT_ACTIVATED",
        };
        const newNotification = await notificationService.createNotification(
          notificationOwner
        );
      
      } else if (!isConfirmed) {
        contract.status = "cancelled";
        const booking = await bookingModel.create({
          customerId: contract.customerId,
          contractId: contract._id,
          vehicleId: contract.vehicleId,
          startDate: contract.startDate,
          endDate: contract.endDate,
          totalPrice: contract.totalAmount,
          status: "cancelled",
        });

        const notificationData = {
          noti_type: "contract",
          noti_senderId: userId,
          senderType: "customer",
          noti_link: contractId,
          noti_receiverId: contract.ownerId,
          noti_content: "Khách hàng đã từ chối thuê xe, hợp đồng đã được hủy",
          noti_options: {},
          contractId: contractId,
          actionType: "CONTRACT_REJECTED",
        };
        const newNotification = await notificationService.createNotification(
          notificationData
        );
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
    console.error(error);
    responseReturn(res, 500, { error: error.message });
  }
};

const handleExpiredContract = async (contract) => {
  contract.status = "cancelled";
  await contract.save();

  await Promise.all([
    notificationService.createNotification({
      noti_type: "contract",
      noti_senderId: convertToObjectIdMongodb(contract._id),
      senderType: "owner",
      noti_link: convertToObjectIdMongodb(contract._id),
      noti_receiverId: convertToObjectIdMongodb(contract.customerId),
      noti_content: "Hợp đồng đã hết hạn do không được xác nhận kịp thời",
      contractId: convertToObjectIdMongodb(contract._id),
      actionType: "CONTRACT_EXPIRED",
    }),
    notificationService.createNotification({
      noti_type: "contract",
      noti_senderId: convertToObjectIdMongodb(contract._id),
      senderType: "owner",
      noti_link: convertToObjectIdMongodb(contract._id),
      noti_receiverId: convertToObjectIdMongodb(contract.ownerId),
      noti_content: "Hợp đồng đã hết hạn do không được xác nhận kịp thời",
      contractId: convertToObjectIdMongodb(contract._id),
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

const getCustomerBookingRequest = async (req, res) => {
  const ownerId = req.id;

  try {
    const contracts = await contractModel
      .find({
        ownerId: ownerId,
        status: "pending",
        "ownerConfirmed.status": false,
        "customerConfirmed.status": true,
      })
      .populate("customerId vehicleId");

    const bookings = contracts.map((contract) => ({
      _id: contract._id,
      customerName: contract.customerId.name,
      vehicleModel: contract.vehicleId.model,
      startDate: contract.startDate,
      endDate: contract.endDate,
      totalAmount: contract.totalAmount,
    }));

    responseReturn(res, 200, { bookings });
  } catch (error) {
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

      await vehicleModel.findByIdAndUpdate(contract.vehicleId, {
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
  getCustomerBookingRequest,
};
