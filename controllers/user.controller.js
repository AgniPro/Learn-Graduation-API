require("dotenv").config();
const user = require("../models/user.module");
const ErrorHandler = require("../utils/ErrorHandler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const path = require("path");
const sendMail = require("../utils/sendMail.js");
const { accessTokenOptions, refreshTokenOptions, sendToken, } = require("../utils/jwt.js");
const { redis } = require("../utils/redis.js");
const cloudinary = require("cloudinary");

// User registration
const registrationUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return next(new ErrorHandler("Please fill in all fields", 400));
    }
    const isEmailExist = await user.findOne({ email });
    if (isEmailExist) {
      return next(new ErrorHandler("Email already exists", 400));
    }
    const userdata = {
      name,
      email,
      password,
    };
    const activationToken = createActivationToken(userdata);
    const activationCode = activationToken.activationCode;

    const data = { user: { name: userdata.name }, activationCode };
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activation-mail.ejs"),
      data
    );
    try {
      await sendMail({
        email: userdata.email,
        subject: "Verification Code for registation in LearnGraduation",
        template: "activation-mail.ejs",
        data,
      });
      res.status(200).json({
        success: true,
        message: `Please check your email: ${userdata.email} for Verification Code`,
        activationToken: activationToken.token,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const createActivationToken = (userdata) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      userdata,
      activationCode,
    },
    process.env.ACTIVATION_SECRET,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

// User activation

const activateUser = async (req, res, next) => {
  try {
    const { activation_token, activation_code } =
      req.body;
    const newUser = jwt.verify(
      activation_token,
      process.env.ACTIVATION_SECRET
    );
    if (newUser.activationCode !== activation_code) {
      return next(new ErrorHandler("invalid activation code ", 400));
    }
    const { name, email, password } = newUser.userdata;

    const existUser = await user.findOne({ email });

    if (existUser) {
      return next(new ErrorHandler("Email alredy exist", 400));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createUser = await user.create({
      name,
      email,
      password: hashedPassword,
    });
    res.status(200).json({
      success: true,
      message: "Account created go to Login page",
      user: createUser.name,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
// User login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }
    const existUser = await user.findOne({ email }).select("+password");
    if (!existUser) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }
    const isPasswordMatch = await bcrypt.compare(password, existUser.password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }
    let userData = existUser.toObject();
    delete userData.password;
    sendToken(userData, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
// logout user
const logoutUser = async (req, res, next) => {
  try {
    const userID = req.user?._id || "";
    await redis.del(userID);
    res.cookie("access_token", "", { maxAge: 1 });
    res.cookie("refresh_token", "", { maxAge: 1 });
    res.status(200).json({
      succes: true,
      message: "Logged out succesfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// update access token
const updateAccessToken = async (req, res, next) => {
  try {
    const refresh_token = req.cookies.refresh_token;
    if (!refresh_token) {
      return next(new ErrorHandler("Please login or register", 400));
    }
    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN);
    const message = "Refresh token not valid"
    if (!decoded) {
      return next(new ErrorHandler(message, 400));
    }
    const session = await redis.get(decoded.id);
    if (!session) {
      return next(new ErrorHandler(message, 400));
    }
    let userData = JSON.parse(session);
    delete userData.password;
    sendToken(userData, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}

// Get user information
const getUserInfo = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userJson = await redis.get(userId);
    if (userJson) {
      const user = JSON.parse(userJson);
      res.status(201).json({
        success: true,
        user,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// social Auth
const socialAuth = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    let existUser = await user.findOne({ email });
    if (!existUser) {
      let newUser = await user.create({ email, name, avatar: { url: avatar } });
      delete newUser?.password;
      sendToken(newUser, 200, res);
    } else {
      delete existUser?.password;
      sendToken(existUser, 200, res);
    }
  }
  catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}

// update user information
const updateUserInfo = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user?._id;
    const userData = await user.findByIdAndUpdate(userId);
    if (name && userData) {
      userData.name = name;
    }
    await userData?.save();
    await redis.set(userId, JSON.stringify(userData));
    res.status(200).json({
      success: true,
      message: "User information updated",
      userData,
    });
  }
  catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}

// update user password
const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return next(new ErrorHandler("please enter old and new password", 400));
    }
    const userId = req.user?._id;
    const user = await user.findById(userId).select("+password");
    if (user?.password === undefined) {
      return next(new ErrorHandler("invalid user", 400));
    }
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Old password is incorrect", 400));
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await redis.set(userId, JSON.stringify(user));
    res.status(200).json({
      success: true,
      message: "Password updated",
      user,
    });
  }
  catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}

// update profile picture
const updateProfilePicture = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    const userId = req.user?._id;

    const userData = await user.findById(userId);

    if (avatar && userData) {
      if (userData?.avatar?.public_id) {

        await cloudinary.v2.uploader.destroy(userData?.avatar?.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });
        userData.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      } else {
        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });
        userData.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
    }
    await userData?.save();
    await redis.set(userId, JSON.stringify(userData));
    res.status(200).json({
      success: true,
      userData,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Admin routes
// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await user.find().short({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// update user role by admin
const updateUserRole = async (req, res, next) => {
  try {
    const { id, role } = req.body;
    const userRole = await user.findByIdAndUpdate(id, { role }, { new: true });
    res.status(201).json({
      success: true,
      userRole,
    });
  }
  catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
// delete user by admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = await user.findByIdAndDelete(id);
    if (!userData) {
      return next(new ErrorHandler("User not found", 400));
    }
    await redis.del(id);
    res.status(200).json({
      success: true,
      message: "User deleted",
    });
  }
  catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};



module.exports = {
  registrationUser, activateUser, loginUser, getUserInfo,
  logoutUser, updateAccessToken, socialAuth, updateUserInfo,
  updatePassword, updateProfilePicture, getAllUsers, updateUserRole, deleteUser

};