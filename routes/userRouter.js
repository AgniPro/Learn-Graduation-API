const express= require("express");
const userRouter= express.Router();
const { registrationUser,activateUser,getUserInfo,loginUser,logoutUser, updateAccessToken, socialAuth, updateUserInfo, updatePassword, updateProfilePicture, getAllUsers, updateUserRole, deleteUser }= require("../controllers/user.controller");
const {authorizeRole,isAthenicated}= require("../middlewares/auth");

userRouter.post("/register", registrationUser);
userRouter.post("/activate-user", activateUser);
userRouter.get("/me",isAthenicated,getUserInfo);
userRouter.post("/login",loginUser);
userRouter.post("/logout",isAthenicated,logoutUser);
userRouter.get("/refresh",isAthenicated,updateAccessToken);
userRouter.post("/social-auth",socialAuth);
userRouter.put("/update-user-info",isAthenicated,updateUserInfo);
userRouter.put("/update-user-password",isAthenicated,updatePassword);
userRouter.put("/update-user-avatar",isAthenicated,updateProfilePicture);
userRouter.get("/get-users",isAthenicated,authorizeRole("admin"),getAllUsers);
userRouter.put("/update-user-role",isAthenicated,authorizeRole("admin"),updateUserRole);
userRouter.delete("/delete-user/:id",isAthenicated,authorizeRole("admin"),deleteUser);

module.exports= userRouter;