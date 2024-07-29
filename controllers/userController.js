import UserModel from '../models/User.js'
import bcrypt from 'bcrypt'
import sendEmailVerificationOTP from '../utils/sendEmailVerificationOTP.js';
import EmailVerificationModel from '../models/EmailVerification.js';
import generateTokens from '../utils/generateTokens.js';
import setTokensCookies from '../utils/setTokensCookies.js';
import refreshAccessToken from '../utils/refreshAccessToken.js';
import UserRefreshTokenModel from '../models/UserRefreshToken.js';
import jwt from "jsonwebtoken"
import sendMail from '../utils/sendMail.js';
import cloudinary from 'cloudinary';
import redis from '../utils/redis.js';

class UserController {
  // User Registration
  static userRegistration = async (req, res) => {
    try {
      // Extract request body parameters
      const { name, email, password, password_confirmation } = req.body;

      // Check if all required fields are provided
      if (!name || !email || !password || !password_confirmation) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      // Check if password and password_confirmation match
      if (password !== password_confirmation) {
        return res.status(400).json({ success: false, message: "Password and Confirm Password don't match" });
      }

      // Check if email already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "Email already exists" });
      }

      // Generate salt and hash password
      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = await new UserModel({ name, email, password: hashedPassword }).save();
      // Generate a random 4-digit number
      const activationCode = Math.floor(1000 + Math.random() * 9000);

      // Save OTP in Database
      await new EmailVerificationModel({ userId: newUser._id, otp: activationCode }).save();

      //  OTP Verification Link

      const data = { user: { name: newUser.name }, activationCode };

      await sendMail({ email: newUser.email, subject: "Verification Code for registation in LearnGraduation", template: "activation-mail.ejs", data });

      // Send success response
      res.status(201).json({
        success: true,
        message: "Registration Success",
        user: { id: newUser._id, email: newUser.email }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to Register, please try again later" });
    }
  }

  // User Email Verification
  static verifyEmail = async (req, res) => {
    try {

      // Extract request body parameters
      const { email, otp } = req.body;

      // Check if all required fields are provided
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const existingUser = await UserModel.findOne({ email });

      // Check if email doesn't exists
      if (!existingUser) {
        return res.status(404).json({ success: false, message: "Email doesn't exists" });
      }

      // Check if email is already verified
      if (existingUser.is_verified) {
        return res.status(400).json({ success: false, message: "Email is already verified" });
      }

      // Check if there is a matching email verification OTP
      const emailVerification = await EmailVerificationModel.findOne({ userId: existingUser._id, otp });
      if (!emailVerification) {
        if (!existingUser.is_verified) {
          // console.log(existingUser);
          await sendEmailVerificationOTP(req, existingUser);
          return res.status(400).json({ success: false, message: "Invalid OTP, new OTP sent to your email" });
        }
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      // Check if OTP is expired
      const currentTime = new Date();
      // 15 * 60 * 1000 calculates the expiration period in milliseconds(15 minutes).
      const expirationTime = new Date(emailVerification.createdAt.getTime() + 5 * 60 * 1000);
      if (currentTime > expirationTime) {
        // OTP expired, send new OTP
        await sendEmailVerificationOTP(req, existingUser);
        return res.status(400).json({ success: false, message: "OTP expired, new OTP sent to your email" });
      }

      // OTP is valid and not expired, mark email as verified
      existingUser.is_verified = true;
      await existingUser.save();

      // Delete email verification document
      await EmailVerificationModel.deleteMany({ userId: existingUser._id });
      return res.status(200).json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to verify email, please try again later" });
    }
  }

  // User Login
  static userLogin = async (req, res) => {
    try {
      const { email, password } = req.body
      // Check if email and password are provided
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
      }
      // Find user by email
      const user = await UserModel.findOne({ email }).select('+password');

      // Check if user exists
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid Email or Password" });
      }

      // Check if user exists
      if (!user.is_verified) {
        return res.status(401).json({ success: false, message: "Your account is not verified" });
      }
      // Compare passwords / Check Password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      // Generate tokens
      const { accessToken, refreshToken, accessTokenExp, refreshTokenExp } = await generateTokens(user)

      // Set Cookies
      const uid= user._id.toHexString();
      let isauth = 2119518;
      if (user.role==='admin') {
        isauth=1415914;
       }
      setTokensCookies(res, accessToken, refreshToken, accessTokenExp, refreshTokenExp,uid,isauth);

      // Send success response with tokens
      res.status(200).json({
        user: { id: user._id, email: user.email, name: user.name, roles: user.role },
        success: true,
        message: "Login successful",
        access_token: accessToken,
        refresh_token: refreshToken,
        access_token_exp: accessTokenExp,
        is_auth: true
      });


    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to login, please try again later" });
    }
  }

  // Get New Access Token OR Refresh Token
  static getNewAccessToken = async (req, res) => {
    try {
      // Get new access token using Refresh Token
      const { newAccessToken, newRefreshToken, newAccessTokenExp, newRefreshTokenExp ,uid,isauth} = await refreshAccessToken(req, res)

      // Set New Tokens to Cookie
      setTokensCookies(res, newAccessToken, newRefreshToken, newAccessTokenExp, newRefreshTokenExp,uid,isauth)

      res.status(200).send({
        success: true,
        message: "New tokens generated",
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        access_token_exp: newAccessTokenExp
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to generate new token, please try again later" });
    }
  }

  // Profile OR Logged in User
  static userProfile = async (req, res) => {
    res.send({ "user": req.user })
  }

  // Change Password
  static changeUserPassword = async (req, res) => {
    try {
      const { password, password_confirmation } = req.body;

      // Check if both password and password_confirmation are provided
      if (!password || !password_confirmation) {
        return res.status(400).json({ success: false, message: "New Password and Confirm New Password are required" });
      }

      // Check if password and password_confirmation match
      if (password !== password_confirmation) {
        return res.status(400).json({ success: false, message: "New Password and Confirm New Password don't match" });
      }

      // Generate salt and hash new password
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);

      // Update user's password
      await UserModel.findByIdAndUpdate(req.user._id, { $set: { password: newHashPassword } });

      // Send success response
      res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to change password, please try again later" });
    }
  }

  // Send Password Reset Link via Email
  static sendUserPasswordResetEmail = async (req, res) => {
    try {
      const { email } = req.body;
      // Check if email is provided
      if (!email) {
        return res.status(400).json({ success: false, message: "Email field is required" });
      }
      // Find user by email
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: "Email doesn't exist" });
      }
      // Generate token for password reset
      const secret = user._id + process.env.JWT_ACCESS_TOKEN_SECRET_KEY;
      const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '5m' });
      // Reset Link
      const resetLink = `${process.env.FRONTEND_HOST}/account/reset-password-confirm/${user._id}/${token}`;
      // Send password reset email  

      const data = { user: { name: user.name }, resetLink };
      await sendMail({ email: user.email, subject: "Password reset link of LearnGraduation", template: "reset-password.ejs", data });

      // Send success response
      res.status(200).json({ success: true, message: "Password reset email sent. Please check your email." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to send password reset email. Please try again later." });
    }
  }

  // Password Reset
  static userPasswordReset = async (req, res) => {
    try {
      const { password, password_confirmation } = req.body;
      const { id, token } = req.params;
      // Find user by ID
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      // Validate token
      const new_secret = user._id + process.env.JWT_ACCESS_TOKEN_SECRET_KEY;
      jwt.verify(token, new_secret);

      // Check if password and password_confirmation are provided
      if (!password || !password_confirmation) {
        return res.status(400).json({ success: false, message: "New Password and Confirm New Password are required" });
      }

      // Check if password and password_confirmation match
      if (password !== password_confirmation) {
        return res.status(400).json({ success: false, message: "New Password and Confirm New Password don't match" });
      }

      // Generate salt and hash new password
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);

      // Update user's password
      await UserModel.findByIdAndUpdate(user._id, { $set: { password: newHashPassword } });

      // Send success response
      res.status(200).json({ success: true, message: "Password reset successfully" });

    } catch (error) {
      console.log(error);
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({ success: false, message: "Token expired. Please request a new password reset link." });
      }
      return res.status(500).json({ success: false, message: "Unable to reset password. Please try again later." });
    }
  }

  // Logout
  static userLogout = async (req, res) => {
    try {
      // Optionally, you can blacklist the refresh token in the database
      const refreshToken = req.cookies.refreshToken;
      await UserRefreshTokenModel.findOneAndUpdate(
        { token: refreshToken },
        { $set: { blacklisted: true } }
      );
        res.clearCookie('accessToken', { domain: '.learngraduation.onrender.com', path: '/' });
        res.clearCookie('refreshToken', { domain: '.learngraduation.onrender.com', path: '/' });
        res.clearCookie('is_auth', { domain: '.learngraduation.vercel.app', path: '/' });
        res.clearCookie('uid', { domain: '.learngraduation.vercel.app', path: '/' });

      res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Unable to logout, please try again later" });
    }

  }
  // Update user info
  static updateUserInfo = async (req, res, next) => {
    try {
      const { name } = req.body;
      const userId = req.user?._id;
      const userData = await UserModel.findByIdAndUpdate(userId);
      if (name && userData) {
        if(userData.name !== name){
        userData.name = name;}
        else{
          return res.status(400).json({ success: false, message: "Name is already updated" });
        }
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
      return res.status(500).json({ success: false, message: "Unable to update user information" });
    }
  }
  // update profile picture
  static updateProfilePicture = async (req, res, next) => {
    try {
      const { avatar } = req.body;

      const userId = req.user?._id;

      const userData = await UserModel.findById(userId);

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
        message: "Profile picture updated successfully",
        success: true,
        userData,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update profile picture" });
    }
  };
// get all users
static getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.find().short({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "All users",
      users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to get all users" });
  }
};
// update user role
static updateUserRole = async (req, res, next) => {
  try {
    const { id, role } = req.body;
    const userRole = await UserModel.findByIdAndUpdate(id, { role }, { new: true });
    res.status(201).json({
      success: true,
      userRole,
    });
  }
  catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update user role" });
  }
};

// delete user by admin
static deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = await UserModel.findByIdAndDelete(id);
    if (!userData) {
      return res.status(404).json({success: false, message: "User not found"});
    }
    await redis.del(id);
    res.status(200).json({
      success: true,
      message: "User deleted",
    });
  }
  catch (error) {
    return res.status(500).json({ success: false, message: "Unable to delete user" });
  }
};


}


export default UserController;
