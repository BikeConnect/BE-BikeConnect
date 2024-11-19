"use strict";

const express = require("express");
const router = express.Router();
const contractController = require("../../controllers/home/contractController");
const { adminAuth } = require("../../helpers/adminAuth");
const { verifyToken } = require("../../middlewares/verifyToken");

router.post("/create-contract", adminAuth, contractController.createContract);
// router.get("/:id", verifyToken, contractController.getContract);
router.put("/update-contract/:contractId", adminAuth, contractController.updateContract);
router.delete("/delete-contract/:contractId", adminAuth, contractController.deleteContract);

router.post("/confirm-contract/:contractId", verifyToken, contractController.confirmContract);
router.patch("/complete-contract/:contractId",adminAuth,contractController.completeContract);
module.exports = router;
