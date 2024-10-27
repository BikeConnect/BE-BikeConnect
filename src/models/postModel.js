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
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    images: [{
      url: String,
      publicId: String
    }],
    rating: {
      type: Number,
      default: 5,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      set: function(v) {
        if (v !== undefined) {
          return Math.round(v * 10) / 10;
        }
        return this.rating;
      }
    },
    availability_status: {
      type: String,
      default: "available",
    },
    license: {
      type: String,
      required: true,
    },
  },
  {
    collection: COLLECTION_NAME,
    timestamps: true,
  }
);

postSchema.pre("save", function (next) {
  this.product_slug = slugify(this.name, { lower: true });
  next();
});

module.exports = {
  post: model(DOCUMENT_NAME, postSchema),
};
