const { Schema, model } = require("mongoose");

const chatBotSchema = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("chatbot", chatBotSchema);
