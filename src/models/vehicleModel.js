const { Schema, model } = require("mongoose");
const slugify = require("slugify");

const DOCUMENT_NAME = "Vehicle";
const COLLECTION_NAME = "Vehicles";

const vehicleSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
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
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    rating: {
      type: Number,
      default: 5,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      set: function (v) {
        if (v !== undefined) {
          return Math.round(v * 10) / 10;
        }
        return this.rating;
      },
    },
    address: {
      type: String,
      required: true,
    },
    availability_status: {
      type: String,
      default: "available",
    },
    license: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    availableDates: [
      {
        type: Date,
        required: true,
      },
    ],
  },
  {
    collection: COLLECTION_NAME,
    timestamps: true,
  }
);

// Create slug for post
vehicleSchema.pre("save", function (next) {
  if (this.name) {
    // Add a random string to make the slug unique
    const randomString = Math.random().toString(36).substring(2, 7);
    this.slug = slugify(this.name + '-' + randomString, { 
      lower: true, 
      strict: true, 
      trim: true 
    });
  }
  next();
});

const vehicle = model(DOCUMENT_NAME, vehicleSchema);
module.exports = vehicle;
