const router = require("express").Router();
const authController = require("../controllers/authController");
const { checkAuth } = require("../middlewares/checkAuth");
const { verifyAccessToken } = require("../utils/createToken");

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/logout", authController.logout);

router.get("/getList",checkAuth, (req, res, next) => {
      // console.log(req.headers);
  const listUser = [{ email: "abc@gmail.com" }, { email: "def@gmail.com" }];
  res.json({ listUser });
});

router.post("/auth/checkRefreshToken", authController.checkRefreshToken);

module.exports = router;
