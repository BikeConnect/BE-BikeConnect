"use strict";

const jwt = require("jsonwebtoken");
const adminModel = require("../models/adminModel");
const { responseReturn } = require("../utils/response");
require("dotenv").config();

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return responseReturn(res, 401, { error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.SECRET_ACCESS_TOKEN);
    const admin = await adminModel.findById(decoded.id);
    if (!admin || admin.role !== "admin") {
      return responseReturn(res, 401, { message: "You are not Admin" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

module.exports = { adminAuth };
