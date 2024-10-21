const ownerModel = require("../models/ownerModel");
const customerModel = require("../models/customerModel");
const { responseReturn } = require("../utils/response");


module.exports.checkAuthOwner = async (req, res, next) => {
  try {
    const owner = await ownerModel.findById(req.id).select("-password");
    if(!owner) {
      return responseReturn(res, 404, { message: "Owner not found" });
    }
    responseReturn(res, 200, { owner });
    next()
  } catch (error) {
    console.log(error.message);
  }
}
module.exports.checkAuthCustomer = async (req, res, next) => {
  try {
    const customer = await customerModel.findById(req.id).select("-password");
    if(!customer) {
      return responseReturn(res, 404, { message: "Customer not found" });
    }
    responseReturn(res, 200, { customer });
  } catch (error) {
    console.log(error.message);
  }
}
