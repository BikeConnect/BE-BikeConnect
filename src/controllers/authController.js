const adminModel = require("../models/adminModel");
const ownerModel = require("../models/ownerModel");
const ownerCustomerModel = require("../models/message/ownerCustomerModel");
const userRefreshTokenModel = require("../models/userRefreshTokenModel");
const { createToken } = require("../utils/createToken");
const { responseReturn } = require("../utils/response");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userValidate } = require("../utils/validation");

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
      const owner = await ownerModel.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
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
    .send();
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

module.exports = {
  admin_login,
  owner_register,
  owner_login,
  owner_logout,
  checkRefreshToken,
};
