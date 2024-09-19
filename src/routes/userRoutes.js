const router = require("express").Router();
const authController = require("../controllers/authController");

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/logout", authController.logout);

module.exports = router;
