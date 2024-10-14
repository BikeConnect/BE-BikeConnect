const sgMail = require("@sendgrid/mail");
const { responseReturn } = require("../utils/response");
const {
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
} = require("./emailTemplate");
require("dotenv").config();

sgMail.setApiKey(process.env.API_SENDGRID_KEY);

const sendVerificationEmail = async (email, verificationToken) => {
  const msg = {
    to: email,
    from: "nguyenduykiet@dtu.edu.vn",
    subject: "Verification Email",
    html: VERIFICATION_EMAIL_TEMPLATE.replace(
      "{verificationCode}",
      verificationToken
    ),
  };

  try {
    const response = await sgMail.send(msg);
    console.log("Email sent successfully", response);
  } catch (error) {
    console.error("Error sending email", error);
    responseReturn(res, 500, { error: error.message });
  }
};

const sendWelcomeEmail = async (email, name) => {
  const msg = {
    to: email,
    from: "nguyenduykiet@dtu.edu.vn",
    template_id: "d-e5d6874814b44db28738501b635f2171",
    dynamic_template_data: {
      company_info_name: "BikeConnect",
      name: name,
    },
  };
  try {
    const response = await sgMail.send(msg);
    console.log("Email sent successfully", response);
  } catch (error) {
    console.error("Error sending email", error);
    responseReturn(res, 500, {
      error: error.message,
      message: "Failed to send reset success email",
    });
  }
};

const sendPasswordResetEmail = async (email, resetURL) => {
  const msg = {
    to: email,
    from: "nguyenduykiet@dtu.edu.vn",
    subject: "Reset your password",
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
  };

  try {
    const response = await sgMail.send(msg);
    console.log("Email Reset Password sent successfully", response);
  } catch (error) {
    console.error("Error sending email", error);
    responseReturn(res, 500, {
      error: error.message,
      message: "Failed to send reset success email",
    });
  }
};

const sendResetSuccessEmail = async (email) => {
  const msg = {
    to: email,
    from: "nguyenduykiet@dtu.edu.vn",
    subject: "Password Reset Successful",
    html: PASSWORD_RESET_SUCCESS_TEMPLATE,
  };

  try {
    const response = await sgMail.send(msg);
    console.log("Email Reset Password Success sent successfully", response);
  } catch (error) {
    console.error("Error reset password", error);
    responseReturn(res, 500, {
      error: error.message,
      message: "Failed to send reset success email",
    });
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
};
