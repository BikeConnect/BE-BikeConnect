"use strict";

const chatController = require("../../controllers/home/chatController");
const { verifyToken } = require("../../middlewares/verifyToken");
const router = require("express").Router();

router.post("/add-customer-owner", chatController.add_customer_owner);

module.exports = router;
