//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const sesssion = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs','trust proxy', 1);

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(sesssion({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000
    },
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.set('strictQuery', false);
mongoose.connect("mongodb+srv://"+ process.env.DBPAS +".absogmm.mongodb.net/learngraduation");
// mongodb+srv://"+ process.env.DBPAS +".absogmm.mongodb.net/learngraduation     mongodb://127.0.0.1:27017/learngraduation

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,

  }, {
    timestamps: true
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
        callbackURL: "http://localhost:3000/auth/google/secrets",
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

// auth section

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["email", "profile"]
    }));

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
    }));

app.get("/login", function (req, res) {
    res.render("login", { udetail : "Login" , ulink:"login"});
});

app.get("/register", function (req, res) {
    res.render("register",{ udetail : "Login" , ulink:"login"});

});


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
                res.redirect("/dashboard");
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
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("dashboard");
            });
        }
    });
});

// home functions

const postSchema = new mongoose.Schema ({
    username:String,
    url:String,
    title:String,
    disc:String,
    pimg:String,
    content:String,
  },
   {
    timestamps: true
});
const Post = new mongoose.model("Post", postSchema);



app.get("/", function (req, res) {
    Post.find({}, function(err, posts){

        if (req.isAuthenticated()) {
            res.render("home", {posts: posts , udetail : "Dashboard" , ulink:"dashboard"});

        } else {

           res.render("home", {posts: posts , udetail : "Login" , ulink:"login"});
        }

    }).sort({_id: -1}).limit(6);

    
 });
app.get("/dashboard", function (req, res) {
   if (req.isAuthenticated()) {

    const username = new RegExp(escapeRegex(req.user.username), 'gi');
    Post.find({"username":username}, function(err, posts){
        if(err){
            console.log(err);
        }else{
            if (posts){
                res.render("dashboard", {posts: posts , userId:username , udetail : "Dashboard" , ulink:"dashboard"})
                
            }
        }
       }).sort({
        _id: -1
    }).limit(6);


} else {
    res.redirect("/login");
}

});

app.get("/compose", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("compose" , { udetail : "Dashboard" , ulink:"dashboard"});
    } else {
        res.redirect("/login");
    }

});


app.post("/submit", function(req, res){
    if (req.isAuthenticated()) {
        const post = new Post({
            username: req.user.username,
            url:req.body.url,
            title:req.body.title,
            disc:req.body.disc,
            pimg:req.body.pimg,
            content:req.body.content,

        });
        post.save(function (err) {
            if (!err) {
                res.sendStatus(200);
            }
        });
    } else {
        res.status(500).send('An error occurred');
    }

    });

app.get("/update",function(req,res){
    if (req.isAuthenticated()){
        const key = req.query.url;
        Post.findOne({url: key}, function (err, post) {
            const postdate = date(post.createdAt,post.updatedAt);
            res.render("update", {
                url: post.url,
                title: post.title,
                disc: post.disc,
                pimg: post.pimg,
                content: post.content,
                date: postdate, udetail : "Dashboard" , ulink:"dashboard"
    
            });
        });

    }else {
        res.redirect("/login")
    }

});

app.post("/update",function(req,res){
    if (req.isAuthenticated()){
        const content = req.body.content;
        const disc = req.body.disc;
        const title=req.body.title;
        const pimg=req.body.pimg;
        const url = req.body.url;
        Post.findOneAndUpdate({"url": url}, {$set:{"content": content , "disc":disc , "title": title,"pimg": pimg }}, {new: true}, (err, doc) => {
        if (err) {
            console.log("Something wrong when updating data!");
        }else{
            res.sendStatus(200);
        }
        });
    }else {
        res.status(500).send('An error occurred');
}
});    


app.post("/delete", function(req,res){
    if (req.isAuthenticated()){
        const postid = req.body.del;
        
        Post.findOneAndDelete({"url": postid}, (err, doc) => {
        if (err) {
            console.log("Something wrong when updating data!");
        }else{
            res.redirect("/dashboard")
        }
        });
    }else {
    res.redirect("/login")
    }
});


app.get("/p/:postUrl", function (req, res) {

    const reqPostUrl = req.params.postUrl;
    Post.findOne({url: reqPostUrl}, function (err, post) {
        const postdate = date(post.createdAt,post.updatedAt);
        
        res.render("post", {
            url: post.url,
            title: post.title,
            disc: post.disc,
            pimg: post.pimg,
            content: post.content,
            date: postdate, udetail : "" , ulink:""

        });
    });

});

app.get("/search", function (req, res) {

    const key = new RegExp(escapeRegex(req.query.q), 'gi');
    Post.find({
        title: key
    }, function (err, articles) {
        if (err) {
            console.log(err);
        } else {
            if (articles.length < 1) {
                res.redirect("/");
            } else {
                res.render("search", {
                    articles: articles, udetail : "" , ulink:""
                });
            }
        }
    }).limit(6);

});

// some functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function date(pdate,udate) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (pdate.toString() === udate.toString()) {
        fdate= pdate; pubinfo= "publish :";
    }else{
        fdate=udate; pubinfo ="updated :"
    }
    var fdate ; var pubinfo ;
    var date = new Date(fdate);
    return date = pubinfo + " " + date.getDate() + "-" + months[date.getMonth()] + "-" + date.getFullYear();
};



app.listen(3000, function () {
    console.log("server is started");

});