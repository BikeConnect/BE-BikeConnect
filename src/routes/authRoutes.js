const authController = require("../controllers/authController");
const { checkAuthOwner } = require("../middlewares/checkAuth");
const { verifyToken } = require("../middlewares/verifyToken");

const router = require("express").Router();

router.get("/auth/check-auth", verifyToken, checkAuthOwner);

router.post("/auth/admin-login", authController.admin_login);
router.post("/auth/owner-register", authController.owner_register);

router.post("/auth/owner-login", authController.owner_login);
router.post("/auth/owner-logout", authController.owner_logout);

router.post("/auth/owner-verify-email", authController.owner_verify_email);
router.post("/auth/owner-forgot-password",authController.owner_forgot_password);
router.post("/auth/owner-reset-password/:token",authController.owner_reset_password);


router.get("/get-user", verifyToken, authController.getUser);

module.exports = router;
