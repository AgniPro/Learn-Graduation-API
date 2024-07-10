class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message); // Pass the message to the base Error class
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor); 
    }
}

module.exports = ErrorHandler;