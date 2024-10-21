<<<<<<< HEAD
const {
  sendVerificationEmail,
  sendWelcomeEmail,
} = require("../../sendmail/email");
=======
const { sendVerificationEmail, sendWelcomeEmail } = require("../../sendmail/email");
>>>>>>> Asset
const customerModel = require("../../models/customerModel");
const ownerCustomerModel = require("../../models/message/ownerCustomerModel");
const userRefreshTokenModel = require("../../models/userRefreshTokenModel");
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
<<<<<<< HEAD
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
=======
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, 
>>>>>>> Asset
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

const customer_login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return responseReturn(res, 400, {
        status: "error",
        message: "Please provide both email and password",
      });
    }

    const existingUser = await customerModel
      .findOne({ email })
      .select("+password");
    if (!existingUser) {
      return responseReturn(res, 401, { message: "Invalid email or password" });
    }

    if (!existingUser.isVerified) {
      return responseReturn(res, 401, { message: "Please verify your email" });
    }

    if (existingUser) {
      const match = await bcrypt.compare(password, existingUser.password);
      if (match) {
        const token = await createToken({ id: existingUser._id });
        const accessToken = token.accessToken;
        const refreshToken = token.refreshToken;

        await userRefreshTokenModel.create({
          userId: existingUser._id,
          refreshToken: token.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        res.cookie("customerToken", token.accessToken, {
          httpOnly: true,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        return responseReturn(res, 200, {
          accessToken,
          refreshToken,
          message: "Login Successfully",
        });
      } else {
        return responseReturn(res, 404, { error: "Password Wrong!" });
      }
    } else {
      return responseReturn(res, 404, { error: "Email Not Found" });
    }
  } catch (error) {
    return responseReturn(res, 500, {
      status: "error",
      message: error.message,
    });
  }
};

const customer_logout = async (req, res) => {
  res.cookie("customerToken", "", {
    httpOnly: true,
<<<<<<< HEAD
    expires: new Date(Date.now()),
=======
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
>>>>>>> Asset
  });
  return responseReturn(res, 200, { message: "Logout Successfully" });
};

const customer_verify_email = async (req, res) => {
  const { code } = req.body;
  try {
    const customer = await customerModel.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });
    if (!customer) {
      return responseReturn(res, 404, {
        status: "error",
        message: "Invalid or expired verification token",
      });
    }
    customer.isVerified = true;
    customer.verificationToken = undefined;
    customer.verificationTokenExpiresAt = undefined;
    await customer.save();

    await sendWelcomeEmail(customer.email, customer.name);
    responseReturn(res, 200, {
      message: "Email verified successfully",
      owner: {
        ...customer._doc,
        password: undefined,
      },
    });
  } catch (error) {
    return responseReturn(res, 500, {
      status: "error",
      message: error.message,
    });
  }
<<<<<<< HEAD
};
=======
}
>>>>>>> Asset
module.exports = {
  customer_register,
  customer_login,
  customer_logout,
<<<<<<< HEAD
  customer_verify_email,
=======
  customer_verify_email
>>>>>>> Asset
};
