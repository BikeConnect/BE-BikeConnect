const { asyncHandler } = require("../../controllers/authController");
const customerController = require("../../controllers/home/customerController");
const postController = require("../../controllers/post.controller");
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

module.exports = router;
