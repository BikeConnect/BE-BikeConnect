const joi = require("joi");

const userValidate = (data) => {
  const userSchema = joi.object({
    email: joi
      .string()
      .pattern(new RegExp("(gmail.com$|dtu.edu.vn$)"))
      .email()
      .lowercase()
      .required(),
    password: joi.string().min(6).max(32).required(),
  });
  return userSchema.validate(data);
};

module.exports = {
  userValidate,
};
