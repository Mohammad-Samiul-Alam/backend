import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Helper: Check if string is a valid base64 image
const isValidBase64Image = (str) => {
  return /^data:image\/(jpeg|png|jpg|gif|webp);base64,/.test(str);
};

// POST /api/books
router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image } = req.body;

    if (!title || !caption || rating === undefined || !image) {
      return res.status(400).json({ message: "Please provide title, caption, rating, and image" });
    }

    // Validate base64 image format
    if (!isValidBase64Image(image)) {
      return res.status(400).json({ message: "Invalid image format. Must be a base64 data URL (jpeg/png/jpg/gif/webp)." });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "bookworm",
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ message: "Failed to upload image. Please check the image format or size." });
    }

    const newBook = new Book({
      title,
      caption,
      rating: numRating,
      image: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      user: req.user._id,
    });

    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/books (paginated)
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const books = await Book.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");

    const totalBooks = await Book.countDocuments();

    res.json({
      books,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.error("Error in get all books route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/books/user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username profileImage");
    res.json(books);
  } catch (error) {
    console.error("Get user books error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/books/:id (fixed)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete from Cloudinary using the stored publicId (safe and reliable)
    if (book.publicId) {
      try {
        await cloudinary.uploader.destroy(book.publicId);
        console.log(`Deleted Cloudinary image: ${book.publicId}`);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
        // Still proceed to delete the book record
      }
    } else {
      console.warn(`Book ${book._id} has no publicId, skipping Cloudinary deletion.`);
    }

    await book.deleteOne();
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;