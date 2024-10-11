const { Schema, model } = require("mongoose");

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      Type: Number,
      required: true,
    },
    image: {
      Type: String,
      required: true,
    },
    role: {
      Type: String,
      required: true,
    },
    currentAddress: {
      Type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("customers", customerSchema);
