const authController = require("../controllers/authController");
const { checkAuthOwner } = require("../middlewares/checkAuth");
const { verifyToken } = require("../middlewares/verifyToken");
<<<<<<< HEAD
const router = require("express").Router();

router.get("/auth/check-auth",verifyToken,checkAuthOwner)
=======

const router = require("express").Router();

router.get("/auth/check-auth", verifyToken, checkAuthOwner);
>>>>>>> Asset

router.post("/auth/admin-login", authController.admin_login);
router.post("/auth/owner-register", authController.owner_register);

router.post("/auth/owner-login", authController.owner_login);
router.post("/auth/owner-logout", authController.owner_logout);
router.post("/auth/owner-verify-email", authController.owner_verify_email);
<<<<<<< HEAD
router.post("/auth/owner-forgot-password", authController.owner_forgot_password);
router.post("/auth/owner-reset-password/:token", authController.owner_reset_password);
=======
router.post(
  "/auth/owner-forgot-password",
  authController.owner_forgot_password
);
router.post(
  "/auth/owner-reset-password/:token",
  authController.owner_reset_password
);
>>>>>>> Asset



// router.get("/getList",checkAuth, (req, res, next) => {
//       // console.log(req.headers);
//   const listUser = [{ email: "abc@gmail.com" }, { email: "def@gmail.com" }];
//   res.json({ listUser });
// });

// router.post("/auth/checkRefreshToken", authController.checkRefreshToken);

module.exports = router;
