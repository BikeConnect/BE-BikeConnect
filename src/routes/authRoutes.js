const authController = require("../controllers/authController");
const { checkAuth } = require("../middlewares/checkAuth");
const { verifyAccessToken } = require("../utils/createToken");
const router = require("express").Router();

router.post("/auth/admin-login", authController.admin_login);
router.post("/auth/owner-register", authController.owner_register);

router.post("/auth/owner-login", authController.owner_login);
router.get("/auth/owner-logout", authController.owner_logout);

// router.get("/getList",checkAuth, (req, res, next) => {
//       // console.log(req.headers);
//   const listUser = [{ email: "abc@gmail.com" }, { email: "def@gmail.com" }];
//   res.json({ listUser });
// });

// router.post("/auth/checkRefreshToken", authController.checkRefreshToken);

module.exports = router;
