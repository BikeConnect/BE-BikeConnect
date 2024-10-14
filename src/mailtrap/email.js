const { responseReturn } = require("../utils/response");
const { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } = require("./emailTemplate");
const { mailtrapClient, sender } = require("./mailtrapConfig");

const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = [{ email }];
  try {
    //mailtrapClient
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Verification Email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        verificationToken
      ),
      category: "Email Verfification",
    });
    console.log("Email sent successfully", response);
  } catch (error) {
    console.log("Error sending email", error);
    responseReturn(res, 500, { error: error.message });
  }
};

const sendWelcomeEmail = async (email, name) => {
  const recipient = [{ email }];
  try {
    const response =  await mailtrapClient.send({
      from:sender,
      to: recipient,
      template_uuid: "40fefea0-bdcd-4df0-b396-a4e84225f5d0",
      template_variables: {
        "company_info_name": "BikeConnect",
        "name": name
      }
    })
    console.log("Email sent successfully", response);
  } catch (error) {
    responseReturn(res, 500, { error: error.message });
  }
}

const sendPasswordResetEmail = async (email, resetURL) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from:sender,
      to: recipient,
      subject:"Reset your password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
      category: "Password Reset",
    });
    console.log("Email Reset Password sent successfully", response);
  } catch (error) {
    console.log("Error sending email", error);
    responseReturn(res, 500, { error: error.message });
    
  }
}

const sendResetSuccessEmail = async (email) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject:"Password Reset Successful ",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: "Password Reset",
    });
    console.log("Email Reset Password Success sent successfully", response);
  } catch (error) {
    console.log("Error reset password", error);
    responseReturn(res, 500, { error: error.message });
    
  }
}

module.exports = { sendVerificationEmail, sendWelcomeEmail,sendPasswordResetEmail,sendResetSuccessEmail };