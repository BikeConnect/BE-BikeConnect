"use strict";

const contractModel = require("../../models/contractModel");
const notificationModel = require("../../models/notificationModel");
const { responseReturn } = require("../../utils/response");

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

const getContract = async (req, res) => {
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
  const { isConfirmed, rejectReason, userType, ownerId, customerId } = req.body;
  const userId = userType === "owner" ? ownerId : customerId;
  const userRole = req.role;

  try {
    if (userType !== userRole) {
      return responseReturn(res, 403, {
        message: "You are not allowed to reply to this review",
      });
    }
    const contract = await contractModel.findById(contractId);
    if (!contract) {
      return responseReturn(res, 404, { message: "Contract not found" });
    }

    if (
      (userRole === "owner" && contract.ownerId.toString() !== userId) ||
      (userRole === "customer" && contract.customerId.toString() !== userId)
    ) {
      return responseReturn(res, 403, {
        message: "You are not authorized to confirm this contract",
      });
    }

    const confirmContract =
      userRole === "owner" ? "ownerConfirmed" : "customerConfirmed";

    contract[confirmContract] = {
      status: isConfirmed,
      rejectionReason: isConfirmed ? null : rejectReason,
      confirmedAt: new Date(),
    };

    await contract.save();

    responseReturn(res, 200, {
      message: "Contract confirmed successfully",
      contract,
    });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const completeContract = async (req, res) => {
  const { contractId } = req.params;
  try {
    const contract = await contractModel.findByIdAndUpdate(
      contractId,
      {
        $set: {
          status: "completed",
          lastModifiedBy: req.admin._id
        },
        $push: {
          modificationHistory: {
            modifiedBy: req.admin._id,
            changes: { status: "completed" },
            modifiedAt: new Date()
          }
        }
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

module.exports = {
  createContract,
  getContract,
  updateContract,
  deleteContract,
  confirmContract,
  completeContract,
};
