//jshint esversion:6

require("dotenv").config();
const express = require("express");
const sesssion = require("express-session");
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const _ = require("lodash");

const homeStartingContent = "Application are under progress so please visit to learngraduation.blogspot.com or click on below link"
const contactContent = "Contact us at agnipro(at)gmail(dot)com"
const aboutContent = "this is blog post templet designed by agnipro and the creator is abhidhek mehta"


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(sesssion({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } //1 hour
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

// Connection to database

mongoose.set('strictQuery', false);

// mongodb+srv://agnipro:agnipro7257278@agnipro.absogmm.mongodb.net/learngraduation    || mongodb://127.0.0.1:27017/learngraduation
mongoose.connect("mongodb+srv://agnipro:agnipro7257278@agnipro.absogmm.mongodb.net/learngraduation", {
    useNewUrlParser: true
});

const postSchema = {
    purl:String,
    title: String,
    disc: String,
    thumbnail:String,
    content: String
}

const Post = mongoose.model("Post", postSchema);

// Authentication section

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        passReqToCallback: true
    },
    function (request, accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["email", "profile"]
    }));

app.get("/auth/google/compose",
    passport.authenticate("google", {
        successRedirect: "/compose",
        failureRedirect: "/login"
    }));

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });

});


app.post("/register", function (req, res) {
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/");
            })
        }
    })

});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/");
            });
        }
    });
});


// Main blog Routes

app.get("/", function (req, res) {
    User.find({
        "/": {
            $ne: null
        }
    }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                Post.find({}, function (err, posts) {
                    res.render("home", {
                        startingContent: homeStartingContent,
                        posts: posts,
                    });
                });
            }
        }
    });

});

app.get("/contact", function (req, res) {
    res.render("pages/contact", {
        contactpg: contactContent
    });

});
app.get("/about", function (req, res) {
    res.render("pages/about", {
        aboutpg: aboutContent
    });

});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");

});

// For admin users 

app.get("/dashboard",function(req,res){
    if (req.isAuthenticated()){
        res.render("dashboard");
    }else{
        res.redirect("/login");
    }
});


// update post content

app.post("/update", function(req, res){
    const  submittedPost = req.body.pContent;

    Post.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });


app.get("/compose", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("compose");
    } else {
        res.redirect("/login");
    }

});

app.post("/submit", function (req, res) {
    const post = new Post({
        purl:req.body.pUrl,
        title: req.body.pTitle,
        disc: req.body.pDisc,
        thumbnail:req.body.thumbnail,
        content: req.body.pContent
      });

      if (req.isAuthenticated()){
        post.save(function(err){
            if (!err){
                res.redirect("/");
            }
          });
    }else{
        res.redirect("/login")
    }
   
});

app.get("/posts/:postUrl", function (req, res) {

    const requestedPostUrl = req.params.postUrl;

    Post.findOne({
        purl: requestedPostUrl
    }, function (err, post) {
        res.render("post", {
            
            purl: post.purl,
            title: post.title,
            disc: post.disc,
            thumbnail:post.thumbnail,
            content: post.content,

        });
    });

});


app.listen(3000, function () {
    console.log("server has started");

});