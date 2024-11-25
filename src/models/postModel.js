const { Schema, model } = require("mongoose");
const slugify = require("slugify");

const DOCUMENT_NAME = "Post";
const COLLECTION_NAME = "Posts";

const postSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
    },
    quantity: {
      type: Number,
      required: true,
    },
    vehicles: [{
      type: Schema.Types.ObjectId,
      ref: "Vehicle"
    }]
  },
  {
    collection: COLLECTION_NAME,
    timestamps: true,
  }
);

const post = model(DOCUMENT_NAME, postSchema);
module.exports = post; 

