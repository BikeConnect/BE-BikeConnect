const userModel = require("../models/userModel");
const { createToken } = require("../utils/createToken");
const { responseReturn } = require("../utils/response");
const bcrypt = require("bcrypt");

const register = async (req, res, next) => {
  const { email, password, name, passwordVerify } = req.body;
  try {
    if (!email || !password || !name || !passwordVerify) {
      responseReturn(res, 400, {
        status: "error",
        message: "Please provide all the required fields",
      });
    }

    if (password.length < 6) {
      responseReturn(res, 400, {
        message: "Password should be at least 6 characters",
      });
    }

    if (password !== passwordVerify) {
      responseReturn(res, 400, {
        message: "Password and password verification do not match",
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      responseReturn(res, 400, {
        message: "This email already exists",
      });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      name,
      email,
      password: passwordHash,
      passwordVerify: passwordHash,
    });

    const savedUser = await newUser.save();
    const token = await createToken({ id: savedUser._id });

    res.cookie("accessToken", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    responseReturn(res, 201, { token, message: "Register Successfully" });
  } catch (error) {
    responseReturn(res, 500, { status: "error", message: error.message });
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
        res.cookie("accessToken", token, {
          httpOnly: true,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        return responseReturn(res, 200, {
          token,
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

module.exports = {
  register,
  login,
  logout,
};
