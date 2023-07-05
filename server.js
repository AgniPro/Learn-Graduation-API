//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const jwt = require("jsonwebtoken")
const app = express();

app.use(cookieParser());
const cors = require('cors');
app.use(cors({ origin:process.env.CLIENTURL, 
    credentials: true
}));

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(express.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000,
        secure:true,
        domain:".learngraduation.web.app",
        sameSite:"none"
    } //1 hour
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB_NAME);

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

// auth section

let refreshTokens = []

app.post('/token', (req, res) => {
  const refreshToken = req.body.token
  if (refreshToken == null) return res.sendStatus(401)
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    const accessToken = generateAccessToken({ name: user.name })
    res.json({ accessToken: accessToken })
  })
})
app.delete('/logout', (req, res) => {
  refreshTokens = refreshTokens.filter(token => token !== req.body.token)
  res.sendStatus(204)
})


function generateAccessToken(ffuser) {
  return jwt.sign(ffuser, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '150s' })
}

function authenticateToken(req, res, next) {
  const token = req.cookies.accessToken;
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, ffuser) => {
    console.log(err);
    if (err) return res.sendStatus(403);
    req.ffuser = ffuser;
    next();
  });
}


app.get('/posts', authenticateToken, (req, res) => {
  res.json("succesfully acces the post")
});


// end of jwt

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["email", "profile"]
    }));

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        successRedirect: process.env.CLIENTURL,
        failureRedirect: process.env.CLIENTURL+"/login"
    }));


app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
          return next(err);
        }
        res
          .clearCookie("connect.sid", {
            sameSite: "none",
            secure: true,
          })
          .status(200)
          .json({authenticated: false,loginmsg:"User has been logged out."});
      });

});

app.post("/register", function (req, res) {
    
    User.find({ username: req.body.username }, function (err, user) {
        if (err) {
          console.log(err);
        } else {
          if (user.length) {
            return res.status(409).json("User already exists!");
          } else {
            User.register(
              {
                username: req.body.username,
              },
              req.body.password,
              function (err, user) {
                if (err) {
                  return res.status(500).json(err);
                } else {
                  passport.authenticate("local")(req, res, function () {
                    return res.status(200).json("User has been created.");
                  });
                }
              }
            );
          }
        }
      });
});

app.post("/login", async function (req, res) {
  try {
    const requser = req.body.username;
    const fuser = await User.find({ username: requser });
    if (fuser.length === 0) {
      return res.status(404).json("User not found!");
    } else {
      passport.authenticate("local", function (err, user, info) {
        if (err) {
          res
            .status(400)
            .json({
              loggedIn: false,
              loginmsg: "something went wrong",
            });
        } else if (!user) {
          res
            .status(401)
            .json({
              loggedIn: false,
              loginmsg: "Incorrect email or password",
            });
        } else {
          req.logIn(user, function (err) {
            if (err) {
              res
                .status(400)
                .json({
                  loggedIn: false,
                  loginmsg: "Something went wrong",
                });
            } else {
              console.log(user);
              const username =user.email
              const ffuser = { name: username }
              const accessToken = generateAccessToken(ffuser)
              const refreshToken = jwt.sign(ffuser, process.env.REFRESH_TOKEN_SECRET)
              refreshTokens.push(refreshToken)
              req.session.user = { id: user._id, name: user.email };
              res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 250000 ,secure:true,
        domain:".learngraduation.web.app",
        sameSite:"none"});
              res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 604800000 ,secure:true,
        domain:".learngraduation.web.app",
        sameSite:"none" });
              res.json({ loggedIn: true,loginmsg: "Succesfully Login",accessToken:accessToken,refreshToken:refreshToken});

              
            }
          });
        }
      })(req, res);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred");
  }
});



app.get('/check-auth',authenticateToken, (req, res) => {
    // if (req.isAuthenticated()) {
    //   res.send({ authenticated: true });
    // } else {
    //   res.send({ authenticated: false });
    // }
    res.send({ authenticated: true });
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



app.get("/", function (req, res){
    const skip= req.query.skip ? Number(req.query.skip) : 0;
    
    Post.find({}, function (err, post) {
        res.status(200).json(post);
    }).sort({
        _id: -1
    }).skip(skip).limit(2);
        
 
 });

app.get("/dashboard", function (req, res) {
  if (req.isAuthenticated()) {
      const username = new RegExp(escapeRegex(req.user.username), 'gi');
      Post.find({ "username": username }, function (err, posts) {
          if (err) {
              console.log(err);
              res.status(500).json({ message: "An error occurred" });
          } else {
              if (posts.length === 0) {
                  res.status(204).json({ message: "No posts found" });
              } else {
                  res.json(posts);
              }
          }
      }).sort({
          _id: -1
      }).limit(6);
  } else {
      res.sendStatus(401);
  }
});

app.post("/", function(req, res){
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
                res.status(200).json("Post has been created.");
            }
        });
    } else {
        res.status(401).json("Not authenticated!");
    }

    });

app.put("/:postUrl",function(req,res){
  const postid = req.params.postUrl;
    if (req.isAuthenticated()){
        const content = req.body.content;
        const disc = req.body.disc;
        const title=req.body.title;
        const pimg=req.body.pimg;
        Post.findOneAndUpdate({"url": postid}, {$set:{"content": content , "disc":disc , "title": title,"pimg": pimg }}, {new: true}, (err, doc) => {
        if (err) {
          res.status(501).json(err);
        }else{
            res.status(200).json("Post has been updated.");
        }
        });
    }else {
        res.status(401).json("Not authenticated!");
}
});    


app.delete("/:postUrl", function(req,res){
    if (req.isAuthenticated()){
        const postid = req.params.postUrl;
        
        Post.findOneAndDelete({"url": postid}, (err, doc) => {
        if (err) {
            console.log("Something when wrong!");
        }else{
            res.status(200).json("Post has been deleted!");
        }
        });
    }else {
        res.status(401).json("Not authenticated!");
    }
});


app.get("/p/:postUrl", function (req, res) {

    const reqPostUrl = req.params.postUrl;
    Post.findOne({url: reqPostUrl}, function (err, post) {
        if (post== null) {
            res.sendStatus(400);
        }else{
            res.status(200).send(post)
        }
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
            res.send(articles);
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
