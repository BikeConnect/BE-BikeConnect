"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const { handleImageUpload } = require("../../middlewares/multerHandler");
const vehicleController = require("../../controllers/vehicle.controller");

// router.get(
//   "/search/:keySearch",
//   asyncHandler(postController.getListSearchPost)
// );
// router.get("/filter", asyncHandler(postController.filterPosts));
// router.get("/vehicles", asyncHandler(vehicleController.getAllVehiclesPublic));
// router.get(
//   "/:vehicleId",
//   asyncHandler(vehicleController.getVehicleById)
// );

// Owner
router.use(verifyToken);
router.post(
  "/create-vehicle",
  verifyToken,
  handleImageUpload,
  vehicleController.createVehicle
);
router.patch(
  "/update-vehicle/:vehicleId",
  handleImageUpload,
  asyncHandler(vehicleController.updateVehicle)
);
router.delete(
  "/delete-vehicle/:vehicleId",
  verifyToken,
  asyncHandler(vehicleController.deleteVehicle)
);

router.get("/owner-vehicles", asyncHandler(vehicleController.getOwnerVehicles));
module.exports = router;
