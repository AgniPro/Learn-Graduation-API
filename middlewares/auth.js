import passport from "passport";
import accessTokenAutoRefresh from "./accessTokenAutoRefresh.js";
import UserModel from "../models/User.js";

// authenticated user
const isAuthenticated = async (req, res, next) => {
    accessTokenAutoRefresh(req, res, async () => {
        passport.authenticate('jwt', { session: false })(req, res, async () => {
            const user = await UserModel.findById(req.user._id);
            if (user) {
                user.lastActive = new Date();
                await user.save();
            }
            next();
        });
    });
}
// authorize user role
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role || '')) {
           return res.status(403).json({ success: false, message: "You are not authorized to access this resource" });
        }
        next();
    };
};

const isUser = (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    req.headers['authorization'] = `Bearer ${accessToken}`
    passport.authenticate('jwt', { session: false }, (error, user, info) => {
        if (user) {
            req.user = user._id;
        } else {
            req.user = null;
        }
        next();
    })(req, res, next);
};

export { isAuthenticated, authorizeRole, isUser };