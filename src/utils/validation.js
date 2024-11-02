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

const dateValidate = (data) => {
  const dateSchema = joi.object({
    startDate: joi.date()
      .required()
      .custom((value, helpers) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(value);
        startDate.setHours(0, 0, 0, 0);

        console.log(startDate, today);
        if (startDate < today) {
          return helpers.error('date.startDate.past');
        }
        
        return value;
      })
      .messages({
        'date.base': 'Start date must be a valid date',
        'any.required': 'Start date is required',
        'date.startDate.past': 'Start date cannot be in the past'
      }),

    endDate: joi.date()
      .required()
      .custom((value, helpers) => {
        const { startDate } = helpers.state.ancestors[0];
        const start = new Date(startDate);
        const end = new Date(value);
        
        if (end <= start) {
          return helpers.error('date.endDate.beforeStart');
        }
        
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (duration < 1) {
          return helpers.error('date.endDate.tooShort');
        }
        
        return value;
      })
      .messages({
        'date.base': 'End date must be a valid date',
        'any.required': 'End date is required',
        'date.endDate.beforeStart': 'End date must be after start date',
        'date.endDate.tooShort': 'Rental duration must be at least 1 day'
      })
    }).options({ 
      allowUnknown: true 
    });

  return dateSchema.validate(data, { abortEarly: false });
};

module.exports = {
  userValidate,
  dateValidate
};
