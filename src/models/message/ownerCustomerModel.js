const { Schema, model } = require("mongoose");

const ownerCustomerSchema = new Schema(
  {
    myId: {
      type: String,
      required: true,
    },
    myFriends: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model("owner_customers", ownerCustomerSchema);
