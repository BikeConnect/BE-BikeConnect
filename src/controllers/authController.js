const adminModel = require("../models/adminModel");
const ownerModel = require("../models/ownerModel");
const ownerCustomerModel = require("../models/message/ownerCustomerModel");
const userRefreshTokenModel = require("../models/userRefreshTokenModel");
const { createToken } = require("../utils/createToken");
const { responseReturn } = require("../utils/response");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userValidate } = require("../utils/validation");
const crypto = require("node:crypto");
// const sendEmail = require("../utils/mail");
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} = require("../mailtrap/email");

const admin_login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await adminModel.findOne({ email }).select("+password");
    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (match) {
        const { accessToken } = await createToken({
          id: admin._id,
          role: admin.role,
        });

        res.cookie("accessToken", accessToken, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        responseReturn(res, 200, {
          accessToken,
          message: "Login Successfully",
        });
      } else {
        responseReturn(res, 404, { error: "Password Wrong!" });
      }
    }
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const owner_register = async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const existingEmail = await ownerModel.findOne({ email });
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
      const owner = await ownerModel.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        verificationToken,
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      await ownerCustomerModel.create({
        myId: owner.id,
      });
      const { accessToken } = await createToken({
        id: owner.id,
        role: owner.role,
      });
      res.cookie("accessToken", accessToken, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await sendVerificationEmail(owner.email, verificationToken);

      responseReturn(res, 201, {
        accessToken,
        message: "Register Successfully",
      });
    }
  } catch (error) {
    console.error(error);
    responseReturn(res, 500, { error: "Internal Server Error" });
  }
};

const owner_login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return responseReturn(res, 400, {
        status: "error",
        message: "Please provide both email and password",
      });
    }

    const existingUser = await ownerModel
      .findOne({ email })
      .select("+password");
    if (!existingUser) {
      return responseReturn(res, 401, { message: "Invalid email or password" });
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

        res.cookie("accessToken", token.accessToken, {
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

const owner_logout = async (req, res) => {
  res
    .cookie("accessToken", "", {
      httpOnly: true,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    // .send();
  return responseReturn(res, 200, { message: "Logout Successfully" });
};

const owner_verify_email = async (req, res) => {
  const { code } = req.body;
  try {
    const owner = await ownerModel.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });
    if (!owner) {
      return responseReturn(res, 404, {
        status: "error",
        message: "Invalid or expired verification token",
      });
    }
    owner.isVerified = true;
    owner.verificationToken = undefined;
    owner.verificationTokenExpiresAt = undefined;
    await owner.save();

    await sendWelcomeEmail(owner.email, owner.name);
    responseReturn(res, 200, {
      message: "Email verified successfully",
      owner: {
        ...owner._doc,
        password: undefined,
      },
    });
  } catch (error) {
    return responseReturn(res, 500, {
      status: "error",
      message: error.message,
    });
  }
};

const checkRefreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) {
      return responseReturn(res, 400, {
        status: "error",
        message: "Please provide refresh token",
      });
    }

    const decodeToken = jwt.verify(
      refreshToken,
      process.env.SECRET_REFRESH_TOKEN
    );
    if (!decodeToken) {
      return responseReturn(res, 401, {
        status: "error",
        message: "Invalid refresh token",
      });
    }

    const existingRefreshToken = await userRefreshTokenModel.findOne({
      refreshToken,
      id: decodeToken.userId,
    });
    if (!existingRefreshToken) {
      return responseReturn(res, 401, {
        status: "error",
        message: "Invalid refresh token",
      });
    }

    const accessToken = await jwt.sign(
      { id: decodeToken.userId },
      process.env.SECRET_ACCESS_TOKEN,
      {
        expiresIn: "1h",
      }
    );
    const newRefreshToken = await jwt.sign(
      { id: decodeToken.userId },
      process.env.SECRET_REFRESH_TOKEN,
      {
        expiresIn: "7d",
      }
    );

    await userRefreshTokenModel.findByIdAndUpdate(existingRefreshToken._id, {
      id: decodeToken.userId,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    responseReturn(res, 200, {
      message: "Refresh token validated successfully",
      accessToken,
      newRefreshToken,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const owner_forgot_password = async (req, res) => {
  const { email } = req.body;
  try {
    const owner = await ownerModel.findOne({ email });
    if (!owner) {
      return responseReturn(res, 404, { error: "Email Not Found" });
    }
    //generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
    owner.resetPasswordToken = resetToken;
    owner.resetPasswordExpiresAt = resetTokenExpire;
    await owner.save();

    //send email
    await sendPasswordResetEmail(
      owner.email,
      `${process.env.CLIENT_URL}/owner-reset-password/${resetToken}`
    ); //tham so thu 2 la link reset password 'http://localhost:3000/reset-password/${resetToken}'
    responseReturn(res, 200, {
      message: "Password reset link sent to your email!",
    });
  } catch (error) {
    console.error(error.message);
    responseReturn(res, 500, { error: "Internal Server Error" });
  }
};

const owner_reset_password = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const owner = await ownerModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    if (!owner) {
      return responseReturn(res, 404, {
        error: "Invalid or expired reset token",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    owner.password = hashedPassword;
    owner.resetPasswordToken = undefined;
    owner.resetPasswordExpiresAt = undefined;
    await owner.save();
    await sendResetSuccessEmail(owner.email);
    responseReturn(res, 200, {
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = {
  admin_login,
  owner_register,
  owner_login,
  owner_logout,
  owner_verify_email,
  checkRefreshToken,
  owner_forgot_password,
  owner_reset_password,
};
