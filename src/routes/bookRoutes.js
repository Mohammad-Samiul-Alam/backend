import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/books - Create a new book
router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image } = req.body;

    // Validate required fields (allow rating = 0? Typically rating 1-5)
    if (!title || !caption || rating === undefined || !image) {
      return res.status(400).json({ message: "Please provide title, caption, rating, and image" });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    // Upload image to Cloudinary
    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "bookworm", // optional: organize images
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ message: "Failed to upload image. Please check the image format or size." });
    }

    const imageUrl = uploadResponse.secure_url;
    const publicId = uploadResponse.public_id; // store for later deletion

    // Save to database
    const newBook = new Book({
      title,
      caption,
      rating: numRating,
      image: imageUrl,
      publicId,          // <-- add this field to your Book schema
      user: req.user._id,
    });

    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/books?page=1&limit=5 - Paginated books (feed)
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // changed default to 5
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

// GET /api/books/user - Recommended books of the logged-in user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username profileImage"); // for consistency
    res.json(books);
  } catch (error) {
    console.error("Get user books error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/books/:id - Delete a book
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Authorization check
    if (book.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete image from Cloudinary using stored publicId
    if (book.publicId) {
      try {
        await cloudinary.uploader.destroy(book.publicId);
        console.log(`Deleted Cloudinary image: ${book.publicId}`);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
        // Continue to delete the book record anyway
      }
    } else if (book.image && book.image.includes("cloudinary")) {
      // Fallback for old books without publicId (remove after migration)
      const publicId = book.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await book.deleteOne();
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;