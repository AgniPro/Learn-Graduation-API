const {redis} = require("../utils/redis");
const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/ErrorHandler");

// authenticated user
const isAthenicated = async (req, res, next) => {
    const access_token = req.cookies.access_token;
    if (!access_token) {
        return next(new ErrorHandler("Please login to access this resource", 401));
    }
    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN || "");
    if(!decoded){
        return next(new ErrorHandler("Invalid token", 401));
    }
    const user = await redis.get(decoded.id);
    if (!user) {
        return next(new ErrorHandler("User not found", 401));
    }
    req.user = JSON.parse(user);
    next();
}
// authorize user role
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol||'')) {
            return next(new ErrorHandler(`Role ${req.user?.role} is not allowed to access this`, 403));
        }
        next();
    };
};

module.exports = { isAthenicated, authorizeRole };