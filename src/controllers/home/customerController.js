"use strict";

const customerModel = require("../../models/customerModel");
const ownerCustomerModel = require("../../models/message/ownerCustomerModel");
const userRefreshTokenModel = require("../../models/userRefreshTokenModel");
const { createToken } = require("../../utils/createToken");
const { responseReturn } = require("../../utils/response");
const { userValidate } = require("../../utils/validation");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} = require("../../sendmail/email");
const { formidable } = require("formidable");
const cloudinary = require("cloudinary").v2;

const customer_register = async (req, res) => {
  try {
    const { email, name, password } = req.body;
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
        role: "customer",
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
        role: customer.role,
      });
      res.cookie("accessToken", accessToken, {
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
      .select("+password +role");
    if (!existingUser) {
      return responseReturn(res, 401, { message: "Invalid email or password" });
    }

    if (!existingUser.isVerified) {
      return responseReturn(res, 401, { message: "Please verify your email" });
    }

    if (existingUser) {
      const match = await bcrypt.compare(password, existingUser.password);
      if (match) {
        const token = await createToken({
          id: existingUser._id,
          role: existingUser.role,
        });
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
          role: existingUser.role,
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
  res.cookie("accessToken", "", {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
};

const customer_forgot_password = async (req, res) => {
  const { email } = req.body;
  try {
    const customer = await customerModel.findOne({ email });
    if (!customer) {
      return responseReturn(res, 404, { error: "Email Not Found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
    customer.resetPasswordToken = resetToken;
    customer.resetPasswordExpiresAt = resetTokenExpire;
    await customer.save();

    await sendPasswordResetEmail(
      customer.email,
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    ); //tham so thu 2 la link reset password 'http://localhost:3000/customer-reset-password/${resetToken}'
    responseReturn(res, 200, {
      message: "Password reset link sent to your email!",
    });
  } catch (error) {
    console.log(error.message);
    responseReturn(res, 500, { error: error.message });
  }
};

const customer_reset_password = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const customer = await customerModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });
    if (!customer) {
      return responseReturn(res, 404, {
        error: "Invalid or expired reset token",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    customer.password = hashedPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpiresAt = undefined;
    await customer.save();
    await sendResetSuccessEmail(customer.email);
    responseReturn(res, 200, {
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const customer_update_profile = async (req, res) => {
  const { id } = req;
  const { name, phone, currentAddress } = req.body;
  try {
    const customer = await customerModel.findById(id);
    if (!customer) {
      return responseReturn(res, 404, { error: "Customer Not Found" });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone;
    if (currentAddress) updateFields.currentAddress = currentAddress.trim();

    const updatedCustomer = await customerModel
      .findByIdAndUpdate(id, updateFields, {
        new: true,
      })
      .select("-password");

    responseReturn(res, 200, {
      userInfo: updatedCustomer,
      message: "Update Profile Successfully",
    });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

const upload_customer_profile_image = async (req, res) => {
  const { id } = req;
  const form = formidable({ multiples: true });
  form.parse(req, async (error, _, files) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const { image } = files;
    if (!image || !image[0]) {
      return responseReturn(res, 400, { error: "No image file uploaded" });
    }

    const imageFile = image[0];
    try {
      const result = await cloudinary.uploader.upload(imageFile.filepath, {
        folder: "bikeConnectProfile",
      });

      if (result) {
        await customerModel.findByIdAndUpdate(id, {
          image: result.url,
        });
        const userInfo = await customerModel.findById(id);
        responseReturn(res, 200, {
          message: "Profile Image Upload Successfully",
          userInfo,
        });
      } else {
        responseReturn(res, 404, {
          message: `Profile Image Upload Failed ${error.message}`,
          userInfo,
        });
      }
    } catch (error) {
      console.log("error::::", error.message);
      responseReturn(res, 500, { error: error.message });
    }
  });
};

const upload_customer_identity_card = async (req, res) => {
  const { id } = req;
  const form = formidable({ multiples: true });

  form.parse(req, async (error, _, files) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const { identityCard } = files;
    if (!identityCard || identityCard.length === 0) {
      return responseReturn(res, 400, {
        error: "No identity card images uploaded",
      });
    }

    try {
      const currentCustomer = await customerModel.findById(id);
      if (!currentCustomer) {
        return responseReturn(res, 404, { error: "Customer not found" });
      }

      if (
        currentCustomer.identityCard &&
        currentCustomer.identityCard.length > 0
      ) {
        await Promise.all(
          currentCustomer.identityCard
            .filter((img) => img.publicId)
            .map((img) => cloudinary.uploader.destroy(img.publicId))
        );
      }

      const uploadPromises = identityCard.map((image) =>
        cloudinary.uploader.upload(image.filepath, {
          folder: "IdentityCards",
          resource_type: "auto",
          allowed_formats: ["jpg", "png", "jpeg"],
          transformation: [{ quality: "auto" }],
        })
      );

      const uploadedImages = await Promise.all(uploadPromises);

      const imageData = uploadedImages.map((img) => ({
        url: img.secure_url,
        publicId: img.public_id,
      }));

      if (uploadPromises) {
        const updatedCustomer = await customerModel
          .findByIdAndUpdate(
            id,
            {
              $set: { identityCard: imageData },
            },
            { new: true }
          )
          .select("-password");

        responseReturn(res, 200, {
          message: "Identity Card Image Updated Successfully",
          userInfo: updatedCustomer,
        });
      } else {
        responseReturn(res, 404, {
          message: "Identity Card Image Update Failed",
        });
      }
    } catch (error) {
      console.log("error updating identity card:", error.message);
      responseReturn(res, 500, { error: error.message });
    }
  });
};

module.exports = {
  customer_register,
  customer_login,
  customer_logout,
  customer_verify_email,
  customer_forgot_password,
  customer_reset_password,
  customer_update_profile,
  upload_customer_profile_image,
  upload_customer_identity_card,
};
