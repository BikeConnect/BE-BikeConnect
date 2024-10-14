const { sendVerificationEmail } = require("../../sendmail/email");
const customerModel = require("../../models/customerModel");
const ownerCustomerModel = require("../../models/message/ownerCustomerModel");
const { createToken } = require("../../utils/createToken");
const { responseReturn } = require("../../utils/response");
const { userValidate } = require("../../utils/validation");
const bcrypt = require("bcrypt");

const customer_register = async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const existingEmail = await customerModel.findOne({ email });
    const { error } = userValidate({ email, password });
    if (error) {
      return responseReturn(res, 400, { error: error.details[0].message });
    }
    if (existingEmail) {
      responseReturn(res, 404, { error: "Email already existed" });
    } else {
      const verificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const customer = await customerModel.create({
        name: name.trim(),
        email: email.trim(),
        password: await bcrypt.hash(password, 10),
        verificationToken,
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      await ownerCustomerModel.create({
        myId: customer.id,
      });
      const { accessToken } = await createToken({
        id: customer.id,
        name: customer.name,
        email: customer.email,
      });
      res.cookie("customerToken", accessToken, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await sendVerificationEmail(customer.email, verificationToken);

      responseReturn(res, 201, {
        accessToken,
        message: "Register Successfully",
      });
    }
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const customer_login = async (req, res) => {};

const customer_logout = async (req, res) => {};

module.exports = {
  customer_register,
  customer_login,
  customer_logout,
};
