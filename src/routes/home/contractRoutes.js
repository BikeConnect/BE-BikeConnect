"use strict";

const express = require("express");
const router = express.Router();
const contractController = require("../../controllers/home/contractController");
const { adminAuth } = require("../../helpers/adminAuth");
const { verifyToken } = require("../../middlewares/verifyToken");

router.post("/create-contract", adminAuth, contractController.createContract);
router.get("/get-contract/:id", adminAuth, contractController.getContractById);
router.get("/get-all-contracts", adminAuth, contractController.getAllContracts);
router.put(
  "/update-contract/:contractId",
  adminAuth,
  contractController.updateContract
);
router.delete(
  "/delete-contract/:contractId",
  adminAuth,
  contractController.deleteContract
);

router.put(
  "/confirm-contract/:contractId",
  verifyToken,
  contractController.confirmContract
);

module.exports = router;
