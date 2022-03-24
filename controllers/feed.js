const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");

const Post = require("../models/post");
const User = require("../models/user");
const errorHelper = require("../util/error");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts successfully fetched from the database",
      posts: posts,
      totalItems,
    });
  } catch (err) {
    errorHelper.errorHandler(err, next);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorHelper.errorCheck("Validation failed, you entered invalid data!", 422);
  }

  if (!req.file) {
    errorHelper.errorCheck("No Image provided", 422);
  }

  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;

  const post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId,
  });

  try {
    const result = await post.save();
    console.log(result);
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();

    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });

    res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    errorHelper.errorHandler(err, next);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      errorHelper.errorCheck("No post found", 404);
    }
    res.status(200).json({ message: "Post fetched successfully", post: post });
  } catch (err) {
    errorHelper.errorHandler(err, next);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorHelper.errorCheck("Validation failed, you entered invalid data!", 422);
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    errorHelper.errorCheck("No image picked", 422);
  }
  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      errorHelper.errorCheck("No post found!", 404);
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    if (post.creator._id.toString() !== req.userId) {
      errorHelper.errorCheck("Not authorized to update", 403);
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;

    const resSave = await post.save();
    io.getIO().emit("posts", { action: "update", post: resSave });
    res.status(200).json({
      message: "Post updated",
      post: resSave,
    });
  } catch (err) {
    errorHelper.errorHandler(err, next);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      errorHelper.errorCheck("No post found!", 404);
    }

    //Check Logged in user
    if (post.creator.toString() !== req.userId) {
      errorHelper.errorCheck("Not allowed to delete post", 403);
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    const result = await user.save();
    console.log(result);

    io.getIO().emit("posts", { action: "delete", post: postId });

    res
      .status(200)
      .json({ message: "Post deleted successfully", post: result });
  } catch (err) {
    errorHelper.errorHandler(err, next);
  }
};
