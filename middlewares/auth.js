import passport from "passport";
import accessTokenAutoRefresh from "./accessTokenAutoRefresh.js";

// authenticated user
const isAuthenticated = async (req, res, next) => {
    accessTokenAutoRefresh(req, res, () => passport.authenticate('jwt', { session: false })(req, res, next));
}
// authorize user role
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role||'')) {
            res.status(403).json({success:false, message: "You are not authorized to access this resource" });
        }
        next();
    };
};
export { isAuthenticated, authorizeRole };