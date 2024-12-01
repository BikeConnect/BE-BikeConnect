const { Schema, model } = require("mongoose");
const slugify = require("slugify");

const DOCUMENT_NAME = "Vehicle";
const COLLECTION_NAME = "Vehicles";

const vehicleSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
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

// Create slug for vehicle
vehicleSchema.pre("save", async function (next) {
  // Create base slug from brand and model
  let baseSlug = slugify(`${this.brand} ${this.model}`, {
    lower: true,
    strict: true,
    trim: true,
    replacement: "-",
  });

  // Check if slug exists and add counter if needed
  let slugExists = await this.constructor.findOne({ slug: baseSlug });
  let counter = 1;

  while (slugExists) {
    const newSlug = `${baseSlug}-${counter}`;
    slugExists = await this.constructor.findOne({ slug: newSlug });
    if (!slugExists) {
      baseSlug = newSlug;
    }
    counter++;
  }

  this.slug = baseSlug;
  next();
});

const vehicle = model(DOCUMENT_NAME, vehicleSchema);
module.exports = vehicle;
