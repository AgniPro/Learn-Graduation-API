require('dotenv').config();
const mongoose = require('mongoose');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
  name: {
      type: String,
      required: [true, "please enter your name"],
    },
    email: {
      type: String,
      required: [true, "please enter your email"],
      validate: {
        validator: function (value) {
          return emailRegex.test(value);
        },
        message: "Please enter a valid email address",
      },
      unicode: true,
    },
    password: {
      type: String,
      minLength: [6, "password must be at least 6 characters"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseID: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);