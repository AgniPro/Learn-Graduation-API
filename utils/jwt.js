require('dotenv').config();
const { redis } = require("./redis");
const jwt = require("jsonwebtoken");

// parse environment variable to integrate with fallback values
const accessTokenExpires =parseInt( process.env.ACCESS_TOKEN_EXPIRE || 7 * 24);

const refreshTokenExpires =parseInt(process.env.REFRESS_TOKEN_EXPIRE || 28 * 24);


// options for cookie
const accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
    maxAge: accessTokenExpires * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
const refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpires * 60 * 60 * 1000),
    maxAge: refreshTokenExpires * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
const sendToken = (newUser, statusCode, res) => {
    const accessToken = jwt.sign({ id: newUser._id }, process.env.ACCESS_TOKEN || '', {
        expiresIn: `${accessTokenExpires}h`,
    });
    const refreshToken = jwt.sign({ id: newUser._id }, process.env.REFRESH_TOKEN || '', {
        expiresIn: `${refreshTokenExpires}h`,
    });

    //  upload session to redis
    redis.set(newUser._id, JSON.stringify(newUser), "EX", 60480); // 7 days

    // only set secure to true in prductction
    if (process.env.NODE_ENV === "production") {
        accessTokenOptions.secure = true;
        refreshTokenOptions.secure = true;
    }
    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions)
    res.status(statusCode).json({
        succes: true,
        newUser,
        accessToken, refreshToken
    });
};
module.exports = {accessTokenOptions,refreshTokenOptions,sendToken};