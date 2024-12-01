"use strict";

const chatController = require("../../controllers/home/chatController");
const { verifyToken } = require("../../middlewares/verifyToken");
const router = require("express").Router();

router.post("/chat/customer/add-customer-owner", chatController.add_customer_owner);
router.post("/chat/customer/add-owner-customer", chatController.add_owner_customer);
router.post("/chat/customer/send-message-to-owner", chatController.send_message_to_owner);
router.get("/chat/owner/get-customers/:ownerId", chatController.get_customers);
router.get("/chat/owner/get-customer-message/:customerId",verifyToken, chatController.get_customer_message);
router.post("/chat/owner/send-message-to-customer", chatController.owner_send_messages);
module.exports = router;
