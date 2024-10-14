const customerController = require("../../controllers/home/customerController");
const { checkAuth } = require("../../middlewares/checkAuth");
const { verifyToken } = require("../../middlewares/verifyToken");
const router = require("express").Router();


router.post("/customer/customer-register", customerController.customer_register);
router.post("/customer/customer-login", customerController.customer_login);
router.post("/customer/logout", customerController.customer_logout);

module.exports = router;