//jshint esversion:6
require("dotenv").config();
const cloudinary = require('cloudinary').v2
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const userRouter = require("./routes/userRouter");
const postRouter = require("./routes/postRouter");
const ErrorHandler = require("./utils/ErrorHandler");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// cors =>cross-domain
app.use(
  cors({
    origin: [process.env.ORIGIN||"http://localhost:3000/"],
    credentials: true,
  })
);
// database connectio
const dbUrl= process.env.DB_URI || "";
const connectDB= async () => {
    try {
        await mongoose.connect(dbUrl).then((data) =>{
            console.log("Mongose connected");
        })
        
    } catch (error) {
        console.log("Mongose connection error");
        setTimeout(connectDB, 5000);
    }
};

// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});

// routes
app.use(
    "/api",
    userRouter,postRouter
  );

app.get("/test", (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "API response",
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port " + process.env?.PORT || 3000);
    connectDB();
});

// End
