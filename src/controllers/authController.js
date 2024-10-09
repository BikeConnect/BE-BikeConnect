const userModel = require("../models/userModel");
const userRefreshTokenModel = require("../models/userRefreshTokenModel");
const { createToken } = require("../utils/createToken");
const { responseReturn } = require("../utils/response");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password || !name) {
      responseReturn(res, 400, {
        status: "error",
        message: "Please provide all the required fields",
      });
    }

    const existingEmail = userModel.findOne({ email });
    if (existingEmail) {
      return responseReturn(res, 400, {
        message: "Email already exists",
      });
    }

    if (password.length < 6) {
      responseReturn(res, 400, {
        message: "Password should be at least 6 characters",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      name,
      email,
      password: passwordHash,
    });

    const savedUser = await newUser.save();
    responseReturn(res, 201, { message: "Register Successfully", savedUser });
  } catch (error) {
    responseReturn(res, 500, { message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return responseReturn(res, 400, {
        status: "error",
        message: "Please provide both email and password",
      });
    }

    const existingUser = await userModel.findOne({ email }).select("+password");
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
          // expires: new Date(Date.now() + 30 * 1000),
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

const logout = async (req, res) => {
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

    const accessToken = await jwt.sign({id:decodeToken.userId}, process.env.SECRET_ACCESS_TOKEN, {
      expiresIn: "1h",
    });
    const newRefreshToken = await jwt.sign({id:decodeToken.userId}, process.env.SECRET_REFRESH_TOKEN, {
      expiresIn: "7d",
    });

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
  register,
  login,
  logout,
  checkRefreshToken,
};
