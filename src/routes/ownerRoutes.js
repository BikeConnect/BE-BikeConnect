const ownerController = require("../controllers/ownerController");
const { checkAuthOwner } = require("../middlewares/checkAuth");
const { verifyToken } = require("../middlewares/verifyToken");
const router = require("express").Router();

router.get("/get-owner/:ownerId", verifyToken, ownerController.get_owner);
router.get("/get-owner-request", verifyToken, ownerController.get_owner_request);
router.post("/add-profile-info",verifyToken,ownerController.add_owner_profile);
router.post("/update-booking-request",verifyToken, ownerController.updateBookingStatus);

module.exports = router;