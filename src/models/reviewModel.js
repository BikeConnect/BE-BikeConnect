const { Schema, model } = require("mongoose");

// const reviewSchema = new Schema(
//   {
//     postId: {
//       type: Schema.ObjectId,
//       required: true,
//       ref: "Post",
//     },
//     ownerId: {
//       type: Schema.ObjectId,
//       ref: "Owner",
//       required: true,
//     },
//     customerId: {
//       type: Schema.ObjectId,
//       ref: "customers",
//       required: true,
//     },
//     name: {
//       type: String,
//       required: true,
//     },
//     review: {
//       type: String,
//       required: true,
//     },
//     rating: {
//       type: Number,
//       default: 0,
//     },
//     ownerReply: [
//       {
//         content: {
//           type: String,
//           required: true,
//         },
//         date: {
//           type: String,
//           required: true,
//         },
//       },
//     ],
//     customerReply: [
//       {
//         content: {
//           type: String,
//           required: true,
//         },
//         date: {
//           type: String,
//           required: true,
//         },
//       },
//     ],
//     date: {
//       type: String,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

const reviewSchema = new Schema(
  {
    postId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Post",
    },
    ownerId: {
      type: Schema.ObjectId,
      ref: "Owner",
      required: true,
    },
    customerId: {
      type: Schema.ObjectId,
      ref: "customers",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    replies: [{  
      content: {
        type: String,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
      userId: { 
        type: Schema.ObjectId,
        required: true,
      },
      userType: {  
        type: String,
        enum: ['owner', 'customer'],
        required: true
      },
      userName: {  
        type: String,
        required: true
      }
    }],
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("reviews", reviewSchema);
