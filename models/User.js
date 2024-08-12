import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "please enter your name"],
      trim: true,
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
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      minLength: [6, "password must be at least 6 characters"],
      select: false,
      trim: true,
    },
    avatar: {
      public_id: String,
      url: {
        type: String,
        default:
          "https://2.bp.blogspot.com/-oug9Ov-nEv4/YPAvjB73VgI/AAAAAAAAACw/dXeqmhAqIqcwKwPCxPPkPb8EB1OZ1DJpgCK4BGAYYCw/w60/logo.png",
      },
    },
    role: {
      type: String,
      default: "user",
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseID: String,
      },
    ],
    lastActive: {
      type: Date,
    },
  },
  { timestamps: true}
);

const UserModel = mongoose.model("user", userSchema)

export default UserModel;