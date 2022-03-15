const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const { errorHandler, errorCheck } = require("../util/error");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(
      "Validation failed, you entered invalid data, please try again!"
    );
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPassword,
    });
    const result = await user.save();
    res
      .status(201)
      .json({ message: "User created successfully", userId: result._id });
  } catch (err) {
    errorHandler(err, next);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      errorCheck("No such user with this email address was found!", 401);
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      errorCheck("Wrong Password, try again!", 401);
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      "somesuperlongsecretsecrets",
      { expiresIn: "1h" }
    );
    res.status(200).json({ token, userId: user._id.toString() });
  } catch (err) {
    errorHandler(err, next);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      status: user.status,
    });
  } catch (err) {
    errorHandler(err, next);
  }
};

exports.updateStatus = async (req, res, next) => {
  const { status: updatedStatus } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    user.status = updatedStatus;
    await user.save();
    res.status(200).json({
      message: "User status updated!",
    });
  } catch (errorHandler) {
    errorHandler(err, next);
  }
};
