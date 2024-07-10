require('dotenv').config();
const { redis } = require("./redis");
const jwt = require("jsonwebtoken");

// parse environment variable to integrate with fallback values
const accessTokenExpires = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "300",
    10
);
const refressTokenExpires = parseInt(
    process.env.REFRESS_TOKEN_EXPIRE || "1200",
    10
);

// options for cookie
const accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
    maxAge: accessTokenExpires * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
const refressTokenOptions = {
    expires: new Date(Date.now() + refressTokenExpires * 24 * 60 * 60 * 1000),
    maxAge: accessTokenExpires * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
const sendToken = (user, statusCode, res) => {
    const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN ||'', {
        expiresIn: accessTokenExpires,
    });
    const refressToken = jwt.sign({ id: user._id },process.env.REFRESH_TOKEN ||'', {
        expiresIn: refressTokenExpires,
    });

    //  upload session to redis
    redis.set(user._id, JSON.stringify(user), "EX", 60480); // 7 days

    // only set secure to true in prductction
    if (process.env.NODE_ENV === "production") {
        accessTokenOptions.secure = true;
    }
    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refressToken, refressTokenOptions);
    res.status(statusCode).json({
        succes: true,
        user,
        accessToken, refressToken
    });
};
module.exports = {accessTokenOptions,refressTokenOptions,sendToken};