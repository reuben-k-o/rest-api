const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");

const Post = require("../models/post");
const User = require("../models/user");
const errorFn = require("../util/error");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts successfully fetched from the database",
      posts: posts,
      totalItems,
    });
  } catch (err) {
    errorFn.errorHandler(err, next);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorFn.errorCheck("Validation failed, you entered invalid data!", 422);
  }

  if (!req.file) {
    errorFn.errorCheck("No Image provided", 422);
  }

  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;

  let creator;

  const post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId,
  });
  try {
    const result = post.save();
    console.log(result);
    const user = await User.findById(req.userId);
    creator = user;
    user.posts.push(post);
    const resSave = await user.save();
    res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (err) {
    errorFn.errorHandler(err, next);
  }
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;

  Post.findById(postId)
    .populate("creator")
    .then((post) => {
      if (!post) {
        errorFn.errorCheck("No post found", 404);
      }
      res
        .status(200)
        .json({ message: "Post fetched successfully", post: post });
    })
    .catch((err) => {
      errorFn.errorHandler(err, next);
    });
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorFn.errorCheck("Validation failed, you entered invalid data!", 422);
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    errorFn.errorCheck("No image picked", 422);
  }
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        errorFn.errorCheck("No post found!", 404);
      }

      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      if (post.creator.toString() !== req.userId) {
        errorFn.errorCheck("Not authorized to update", 403);
      }

      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then((result) => {
      res.status(200).json({
        message: "Post updated",
        post: result,
      });
    })
    .catch((err) => {
      errorFn.errorHandler(err, next);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        errorFn.errorCheck("No post found!", 404);
      }

      //Check Logged in user
      if (post.creator.toString() !== req.userId) {
        errorFn.errorCheck("Not allowed to delete post", 403);
      }
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then(() => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      console.log(result);
      res
        .status(200)
        .json({ message: "Post deleted successfully", post: result });
    })
    .catch((err) => {
      errorFn.errorHandler(err, next);
    });
};
