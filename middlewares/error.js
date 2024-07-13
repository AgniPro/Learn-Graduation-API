
import ErrorHandler from "../utils/ErrorHandler";
export const ErrorMiddleware = (
    err,
    req,
    res,
    next
) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    // wrong mongodb error
    if (err.name === "CastError") {
        const message = "Resourse not found.";
        err = new ErrorHandler(message, 400);
    }
    // Duplicate key error
    if (err.code === 11000) {
        const message = "Duplicate key error";
        err = new ErrorHandler(message, 400);
    }
    // Wrong Jwt error
    if (err.name === "JsonWebTokenError") {
        const message = "Json Web Token is Invalid.";
        err = new ErrorHandler(message, 400);
    }
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};
