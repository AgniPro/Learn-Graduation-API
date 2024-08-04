import express from 'express';
import UserController from '../controllers/userController.js';
import { authorizeRole, isAuthenticated } from '../middlewares/auth.js';
const router = express.Router();
// Public Routes
router.post('/register', UserController.userRegistration)
router.post('/verify-email', UserController.verifyEmail)
router.post('/login', UserController.userLogin)
router.post('/refresh-token', UserController.getNewAccessToken)
router.post('/reset-password-link', UserController.sendUserPasswordResetEmail)
router.post('/reset-password/:id/:token', UserController.userPasswordReset)

// Protected Routes
router.get('/me',isAuthenticated, UserController.userProfile)
router.put('/change-password',isAuthenticated, UserController.changeUserPassword)
router.post('/logout', isAuthenticated, UserController.userLogout)
router.put("/update-user-info",isAuthenticated,UserController.updateUserInfo);
router.put("/update-user-avatar",isAuthenticated,UserController.updateProfilePicture);
// Admin Routes
router.get("/get-users",isAuthenticated,authorizeRole("admin"),UserController.getAllUsers);
router.put("/update-user-role",isAuthenticated,authorizeRole("admin"),UserController.updateUserRole);
router.delete("/delete-user/:id",isAuthenticated,authorizeRole("admin"),UserController.deleteUser);

export default router