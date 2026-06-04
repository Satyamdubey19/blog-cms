import express from "express";
import authmiddleware, { optionalAuthMiddleware } from "../middleware/authmiddleware.js";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getAdminStaticsOfUserBlog,
  getMyBlogs,
  getBlogComments,
  createBlogComment,
  deleteBlogComment,
  toggleBlogLike,
} from "../controllers/blogController.js";
import { adminOnly } from "../middleware/adminmiddleware.js";
import { upload } from "../utills/cloudinary.js";

const router = express.Router();

//  routes
router.get("/", optionalAuthMiddleware, getAllBlogs);
router.get("/mine", authmiddleware, getMyBlogs);

// admin routes
router.get("/stats", authmiddleware, adminOnly, getAdminStaticsOfUserBlog);

router.get("/:id", optionalAuthMiddleware, getBlogById);
router.get("/:id/comments", getBlogComments);

//  user+admin routes
router.post("/", authmiddleware, upload.single("image"), createBlog);
router.put("/:id", authmiddleware, upload.single("image"), updateBlog);
router.delete("/:id", authmiddleware, deleteBlog);
router.post("/:id/comments", authmiddleware, createBlogComment);
router.delete("/:id/comments/:commentId", authmiddleware, deleteBlogComment);
router.post("/:id/likes", authmiddleware, toggleBlogLike);

export default router;
