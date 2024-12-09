"use strict";

const customerController = require("../../controllers/home/customerController");
const homeController = require("../../controllers/home/homeController");
const { checkAuthCustomer } = require("../../middlewares/checkAuth");
const { verifyToken } = require("../../middlewares/verifyToken");
const router = require("express").Router();

router.get("/customer/check-auth", verifyToken, checkAuthCustomer);

router.post(
  "/customer/customer-register",
  customerController.customer_register
);
router.post("/customer/customer-login", customerController.customer_login);
router.post("/customer/customer-logout", customerController.customer_logout);
router.post(
  "/customer/customer-verify-email",
  customerController.customer_verify_email
);

router.post(
  "/customer/customer-verify-email",
  customerController.customer_verify_email
);

router.post(
  "/customer/forgot-password",
  customerController.customer_forgot_password
);
router.post(
  "/customer/reset-password/:token",
  customerController.customer_reset_password
);

router.post(
  "/home/customer/submit-review",verifyToken,
  homeController.customer_submit_review
);
router.get("/home/customer/get-reviews/:vehicleId", homeController.get_reviews);

router.put("/customer/update-profile", verifyToken,customerController.customer_update_profile);

router.post("/customer/upload-profile-image", verifyToken, customerController.upload_customer_profile_image);

router.put("/customer-change-password", verifyToken, customerController.customer_change_password);

module.exports = router;
