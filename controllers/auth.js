const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const errorFn = require("../util/error");

exports.signup = (req, res, next) => {
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

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email,
        name,
        password: hashedPassword,
      });
      return user.save();
    })
    .then((result) => {
      res
        .status(201)
        .json({ message: "User created successfully", userId: result._id });
    })
    .catch((err) => {
      errorFn.errorHandler(err, next);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        errorFn.errorCheck(
          "No such user with this email address was found!",
          401
        );
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        errorFn.errorCheck("Wrong Password, try again!", 401);
      }

      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "somesuperlongsecretsecrets",
        { expiresIn: "1h" }
      );
      res.status(200).json({ token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      errorFn.errorHandler(err, next);
    });
};
