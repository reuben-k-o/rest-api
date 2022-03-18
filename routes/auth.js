const express = require("express");
const { check } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.put(
  "/signup",
  [
    check("name").trim().not().isEmpty(),
    check("email")
      .isEmail()
      .withMessage("Enter a valid Email!")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-mail address already exists");
          }
        });
      }),
    check("password").trim().isLength({ min: 5 }),
  ],
  authController.signup
);

router.post("/login", authController.login);

router.get("/status", isAuth, authController.getStatus);
router.patch(
  "/status",
  [check("status").trim().not().isEmpty()],
  isAuth,
  authController.updateStatus
);
module.exports = router;
