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
const bookingModel = require("../../models/bookingModel");
const {
  analyzeIDCard,
  detectImageManipulation,
} = require("../../services/imageAnalysis.service");
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
          expires: new Date(Date.now() + 60 * 60 * 1000),
        });
        return responseReturn(res, 200, {
          accessToken,
          refreshToken,
          message: "Login Successfully",
          role: existingUser.role,
        });
      } else {
        return responseReturn(res, 404, { error: "Sai mật khẩu!" });
      }
    } else {
      return responseReturn(res, 404, { error: "Email không tồn tại!" });
    }
  } catch (error) {
    return responseReturn(res, 500, {
      status: "error",
      message: error.message,
    });
  }
};

const customer_logout = async (req, res) => {
  try {
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
    if (token) {
      await userRefreshTokenModel.deleteOne({ userId: req.id });
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return responseReturn(res, 200, {
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    return responseReturn(res, 500, {
      success: false,
      error: "Có lỗi xảy ra khi đăng xuất",
    });
  }
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

const customer_change_password = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req;
  try {
    const foundCustomer = await customerModel.findById(id).select("+password");
    if (!foundCustomer) {
      return responseReturn(res, 404, { error: "Customer not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, foundCustomer.password);
    if (!isMatch) {
      return responseReturn(res, 400, {
        error: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    foundCustomer.password = hashedPassword;
    await foundCustomer.save();

    responseReturn(res, 200, { message: "Password changed successfully" });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
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
  const form = formidable();

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
          transformation: [
            { quality: "auto" },
            { sharpness: 50 },
            { brightness: 10 },
          ],
        })
      );

      const uploadedImages = await Promise.all(uploadPromises);
      const imageData = uploadedImages.map((img) => ({
        url: img.secure_url,
        publicId: img.public_id,
      }));

      const updatedCustomer = await customerModel
        .findByIdAndUpdate(
          id,
          { $set: { identityCard: imageData } },
          { new: true }
        )
        .select("-password");

      if (updatedCustomer) {
        responseReturn(res, 200, {
          message: "Identity Card Images Updated Successfully",
          userInfo: updatedCustomer,
        });
      } else {
        responseReturn(res, 404, { error: "Failed to update identity card" });
      }
    } catch (error) {
      console.error("Error updating identity card:", error.message);
      responseReturn(res, 500, { error: error.message });
    }
  });
};

const analyzeIdentityCard = async (req, res) => {
  const { id } = req;
  try {
    const customer = await customerModel.findById(id);
    if (
      !customer ||
      !customer.identityCard ||
      customer.identityCard.length === 0
    ) {
      return responseReturn(res, 404, {
        error: "No identity card images found",
      });
    }

    const analysisResults = await Promise.all(
      customer.identityCard.map(async (card) => {
        const analysis = await analyzeIDCard(card.url);
        return {
          imageUrl: card.url,
          publicId: card.publicId,
          ...analysis,
        };
      })
    );

    // Kiểm tra tổng thể
    const hasValidIDCard = analysisResults.some((result) => result.isValid);
    const allIssues = analysisResults.reduce((issues, result) => {
      return [...issues, ...result.issues];
    }, []);

    responseReturn(res, 200, {
      message: "Identity card analysis completed",
      results: analysisResults,
      summary: {
        hasValidIDCard,
        totalImages: analysisResults.length,
        validImages: analysisResults.filter((r) => r.isValid).length,
        allIssues: [...new Set(allIssues)],
      },
    });
  } catch (error) {
    console.error("Error analyzing identity card:", error);
    responseReturn(res, 500, { error: error.message });
  }
};

const get_customer_booking_history = async (req, res) => {
  try {
    const { id } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalBookings = await bookingModel.countDocuments({
      customerId: id,
    });

    const bookings = await bookingModel
      .find({ customerId: id })
      .populate("vehicleId", "brand model license price")
      .populate("contractId", "totalAmount")
      .select("status startDate endDate totalPrice")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      vehicleInfo: {
        brand: booking.vehicleId?.brand || "",
        model: booking.vehicleId?.model || "",
        license: booking.vehicleId?.license || "",
      },
      bookingStatus: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalPrice: booking.totalPrice || 0,
    }));

    const totalPages = Math.ceil(totalBookings / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate total spending
    const totalSpending = formattedBookings.reduce((sum, booking) => {
      return sum + (booking.contractAmount || 0);
    }, 0);

    responseReturn(res, 200, {
      bookings: formattedBookings,
      totalSpending,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalBookings,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error(error);
    responseReturn(res, 500, { error: error.message });
  }
};

const customer_alter_address = async (req, res) => {
  try {
    const { customerId, alterAddress } = req.body;
    const updatedCustomer = await customerModel.findByIdAndUpdate(
      customerId,
      { alterAddress },
      { new: true }
    );

    if (!updatedCustomer) {
      return responseReturn(res, 404, { error: "Customer not found" });
    }

    responseReturn(res, 200, {
      message: "Alter Address Updated Successfully",
      userInfo: updatedCustomer,
    });
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
};

module.exports = {
  customer_register,
  customer_login,
  customer_logout,
  customer_verify_email,
  customer_forgot_password,
  customer_reset_password,
  customer_change_password,
  customer_update_profile,
  upload_customer_profile_image,
  upload_customer_identity_card,
  analyzeIdentityCard,
  get_customer_booking_history,
  customer_alter_address,
};
