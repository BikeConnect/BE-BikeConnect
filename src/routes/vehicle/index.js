"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../controllers/authController");
const { verifyToken } = require("../../middlewares/verifyToken");
const { handleImageUpload } = require("../../middlewares/multerHandler");
const vehicleController = require("../../controllers/vehicle.controller");

router.get("/search", vehicleController.getListSearchVehicles);
router.get("/filter", asyncHandler(vehicleController.filterVehicles));
router.get(
  "/list-vehicles",
  asyncHandler(vehicleController.getAllVehiclesPublic)
);
router.get(
  "/vehicle-detail/:vehicleId",
  asyncHandler(vehicleController.getVehicleById)
);

// Owner
router.use(verifyToken);

router.post(
  "/create-vehicle",
  verifyToken,
  handleImageUpload,
  vehicleController.createVehicle
);

router.put(
  "/update-vehicle/:vehicleId",
  handleImageUpload,
  asyncHandler(vehicleController.updateVehicle)
);

router.delete(
  "/delete-vehicle/:vehicleId",
  verifyToken,
  asyncHandler(vehicleController.deleteVehicle)
);

router.get(
  "/owner-list-vehicles",
  asyncHandler(vehicleController.getOwnerVehicles)
);
module.exports = router;
