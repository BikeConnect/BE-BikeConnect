const { Schema, model } = require("mongoose");
<<<<<<< HEAD
=======
const slugify = require("slugify");

const DOCUMENT_NAME = "Post";
const COLLECTION_NAME = "Posts";
>>>>>>> Asset

const postSchema = new Schema(
  {
    ownerId: {
<<<<<<< HEAD
      type: Schema.ObjectId,
      required: true,
=======
      type: Schema.Types.ObjectId,
      ref: "Owner",
>>>>>>> Asset
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
    images: {
      type: Array,
      required: true,
    },
    rating: {
      type: Number,
<<<<<<< HEAD
      default: 0,
=======
      default: 5,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      set: (val) => Math.round(val * 10) / 10,
>>>>>>> Asset
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
<<<<<<< HEAD
=======
    collection: COLLECTION_NAME,
>>>>>>> Asset
    timestamps: true,
  }
);

<<<<<<< HEAD
module.exports = model("posts", postSchema);
=======
postSchema.pre("save", function (next) {
  this.product_slug = slugify(this.name, { lower: true });
  next();
});

module.exports = {
  post: model(DOCUMENT_NAME, postSchema),
};
>>>>>>> Asset
