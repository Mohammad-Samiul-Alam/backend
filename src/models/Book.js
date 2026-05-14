import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: "Image must be a valid URL",
      },
    },
    publicId: {
      type: String,
      required: true,
      comment: "Cloudinary public_id for image deletion",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // improves queries for user's books
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);

export default Book;