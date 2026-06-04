import Blog from "../models/blog.js";
import Category from "../models/category.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import { AppError } from "../utills/errorHandler.js";

// GET ALL BLOGS — filter + pagination

const decorateBlogs = async (blogs, userId) => {
  const ids = blogs.map((blog) => blog._id);
  const [commentCounts, likeCounts, userLikes] = await Promise.all([
    Comment.aggregate([
      { $match: { blog: { $in: ids }, isDeleted: false } },
      { $group: { _id: "$blog", count: { $sum: 1 } } },
    ]),
    Like.aggregate([
      { $match: { blog: { $in: ids } } },
      { $group: { _id: "$blog", count: { $sum: 1 } } },
    ]),
    userId ? Like.find({ blog: { $in: ids }, user: userId }).select("blog") : [],
  ]);

  const commentMap = new Map(commentCounts.map((item) => [item._id.toString(), item.count]));
  const likeMap = new Map(likeCounts.map((item) => [item._id.toString(), item.count]));
  const likedSet = new Set(userLikes.map((item) => item.blog.toString()));

  return blogs.map((blog) => {
    const data = blog.toObject();
    const id = blog._id.toString();
    return {
      ...data,
      commentCount: commentMap.get(id) || 0,
      likeCount: likeMap.get(id) || 0,
      likedByMe: likedSet.has(id),
    };
  });
};

const getAllBlogs = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  const filter = query.includeDrafts
    ? { isDeleted: false, author: query.author }
    : { isPublic: true, status: "published", isDeleted: false };

  if (query.search) {
    const pattern = { $regex: query.search, $options: "i" };
    filter.$or = [{ title: pattern }, { content: pattern }, { tags: pattern }];
  }
  if (query.tag) filter.tags = { $regex: `^${query.tag}$`, $options: "i" };
  if (query.category) filter.category = query.category;

  const [blogs, count] = await Promise.all([
    Blog.find(filter)
      .populate("author", "name email")
      .populate("category", "title")
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 }),
    Blog.countDocuments(filter),
  ]);

  return { blogs: await decorateBlogs(blogs, query.userId), count };
};

// GET SINGLE BLOG BY ID OR SLUG

const getBlogById = async (id) => {
  const selector = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
  const blog = await Blog.findOne(selector)
    .populate("author", "name email")
    .populate("category", "title");
  return blog;
};

const getEngagementForBlog = async (blogId, userId) => {
  const [commentCount, likeCount, likedByMe] = await Promise.all([
    Comment.countDocuments({ blog: blogId, isDeleted: false }),
    Like.countDocuments({ blog: blogId }),
    userId ? Like.exists({ blog: blogId, user: userId }) : null,
  ]);

  return { commentCount, likeCount, likedByMe: Boolean(likedByMe) };
};

// CREATE BLOG

const createBlog = async (data) => {
  // Category exist karti hai ya nahi check karo
  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) throw new AppError("Category not found", 404);
  }

  const blog = await Blog.create(data);

  // Populated blog return karo
  return await Blog.findById(blog._id)
    .populate("author", "name email")
    .populate("category", "title");
};

// UPDATE BLOG

const updateBlog = async (id, data) => {
  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) throw new AppError("Category not found", 404);
  }

  const blog = await Blog.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate("author", "name email")
    .populate("category", "title");

  return blog;
};

// DELETE BLOG — soft delete
const deleteBlog = async (id) => {
  const blog = await Blog.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  return blog;
};

const getComments = async (blogId) => {
  return Comment.find({ blog: blogId, isDeleted: false })
    .populate("author", "name email")
    .sort({ createdAt: -1 });
};

const createComment = async ({ blog, author, content }) => {
  const found = await Blog.findOne({ _id: blog, isDeleted: false });
  if (!found) throw new AppError("Blog not found", 404);
  return Comment.create({ blog, author, content });
};

const deleteComment = async ({ commentId, user }) => {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) throw new AppError("Comment not found", 404);
  if (comment.author.toString() !== user.id && user.role !== "Admin" && user.role !== "admin") {
    throw new AppError("You can only delete your own comments", 403);
  }
  comment.isDeleted = true;
  await comment.save();
  return comment;
};

const toggleLike = async ({ blog, user }) => {
  const found = await Blog.findOne({ _id: blog, isDeleted: false });
  if (!found) throw new AppError("Blog not found", 404);

  const existing = await Like.findOne({ blog, user });
  if (existing) {
    await existing.deleteOne();
    return { liked: false, likeCount: await Like.countDocuments({ blog }) };
  }

  await Like.create({ blog, user });
  return { liked: true, likeCount: await Like.countDocuments({ blog }) };
};

export default {
  getAllBlogs,
  getBlogById,
  getEngagementForBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getComments,
  createComment,
  deleteComment,
  toggleLike,
};
