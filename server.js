import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/connectdb.js'
import passport from 'passport';
import userRoutes from './routes/userRoutes.js'
import './config/passport-jwt-strategy.js'
import setTokensCookies from './utils/setTokensCookies.js';
import './config/google-strategy.js';    // Added for google auth
import postRouter from './routes/postRouter.js';


const app = express()
const port = process.env.PORT
const DATABASE_URL = process.env.DATABASE_URL
// This will solve CORS Policy Error
const corsOptions = {
  // set origin to a specific origin.
  origin: process.env.FRONTEND_HOST,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions))

// Database Connection
connectDB(DATABASE_URL)

// JSON
app.use(express.json())

// Passport Middleware
app.use(passport.initialize());

// Cookie Parser
app.use(cookieParser())

// Load Routes
app.use("/api/user", userRoutes);
app.use("/api",postRouter);

// Google Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_HOST}` }),
  (req, res) => {

    // Access user object and tokens from req.user
    const { user, accessToken, refreshToken, accessTokenExp, refreshTokenExp } = req.user;
    setTokensCookies(res, accessToken, refreshToken, accessTokenExp, refreshTokenExp);

    // Successful authentication, redirect home.
    res.redirect(`${process.env.FRONTEND_HOST}`);
  });

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})