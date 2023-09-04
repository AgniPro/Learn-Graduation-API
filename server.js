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
    jwtToken:String

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
          User.findOneAndUpdate({"googleId":user.googleId}, {$set:{"jwtToken":generateRefreshToken({ name:profile._json.email}),"email":profile._json.email }}, {new: true}, (err,jwtuser) => {
            if (err) {
              res.status(501).json(err);
            }else{
              return cb(err,jwtuser);
            }}
          )
            
        });
    }
));

// auth section

function generateAccessToken(ffuser) {
  return jwt.sign(ffuser, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '360s' })
}
function generateRefreshToken(ffuser){
  return jwt.sign(ffuser, process.env.REFRESH_TOKEN_SECRET ,{ expiresIn: '1800s' })
}

function authenticateToken(req, res, next) {
  const token = req.headers.accesstoken;
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, ffuser) => {
    if (err) return res.sendStatus(403);
    req.jwtuser = ffuser;
    next();
  });
}

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["email", "profile"]
    }));

app.get('/auth/google/success',
    passport.authenticate('google', { failureRedirect: '/login'}),
    (req, res) => {
        const email = req.user.email;
        User.findOne({ email: email }, function (err, fuser) {
          if (err) {
            res.status(501).json(err);
          } else {
            res.redirect(`${process.env.CLIENTURL}?token=${fuser.jwtToken}`);
          }
        });
    }
);

app.get("/logout", function (req, res) {
  const refreshToken = req.headers.refreshtoken;
  if (refreshToken == null) return res.status(403).json("No Key RECIVED")
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    User.findOneAndUpdate({ "jwtToken": refreshToken }, { $set: { "jwtToken": "logout" } }, { new: true }, (err) => {
      if (err) {
        res.status(501).json(err);
      } else {
        res.status(200).json({ authenticated: false, message: "User has been logged out." });
      }
    });
  });
});

app.post("/register", function (req, res) {
    User.find({ username: req.body.username }, function (err, user) {
        if (err) {
          console.log(err);
        } else {
          if (user.length) {
            return res.status(409).json({message:"User already exists!"});
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
                  return res.status(200).json({message:"User has been created."});
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
          res.status(400).json({loggedIn: false,message: "something went wrong"});
        } else if (!user) {
          res.status(401).json({loggedIn: false,message: "Incorrect email or password"});
        } else {
          req.logIn(user, function (err) {
            if (err) {
              res.status(400).json({loggedIn: false,message: "Something went wrong"});
            } else {
              const ffuser = { name: user.username }
              const accessToken = generateAccessToken(ffuser)
              const refreshToken = generateRefreshToken(ffuser)
              req.session.user = { id: user._id, name: user.username };
              User.findOneAndUpdate({"username":user.username}, {$set:{"jwtToken": refreshToken }}, {new: true}, (err) => {
                if (err) {
                  res.status(501).json(err);
                }else{
                  res.json({ loggedIn: true,message: "Succesfully Login",accessToken:accessToken,refreshToken:refreshToken ,user:user.username?.replace("@gmail.com", "")});
                }}
              )
            }
          });
        }
      })(req, res);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({message:"An error occurred"});
  }
});

app.get('/check-auth', (req, res) => {

  const refreshToken = req.headers.refreshtoken;
  if (refreshToken === "undefined") {
    return res.sendStatus(401)
  }
  else if (refreshToken == null) {
    return res.sendStatus(401)
  }
  else {
    User.findOne({ jwtToken: refreshToken }, function (err, fuser) {
      if (fuser == null) {
        res.sendStatus(401);
      } else {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
          if (err) return res.sendStatus(403)
          const newRefreshToken = generateRefreshToken({ name: user.name });
          const accessToken = generateAccessToken({ name: user.name });
          User.findOneAndUpdate({ "username": user.name }, { $set: { "jwtToken": newRefreshToken } }, { new: true }, (err) => {
            if (err) {
              res.status(501).json({message:err});
            } else {
              res.json({authenticated: true, accessToken: accessToken, refreshToken:newRefreshToken, user: user.name?.replace("@gmail.com", "") });
            }
          }
          )
        })
      }
    });
  }
});

app.get('/posts', authenticateToken, (req, res) => {
  res.json("succesfully acces the post")
});

// home functions

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  author: {
    type: String,
    require:true
  },
  content: {
      type: String,
      required: true
  }
}, { timestamps: true });

const postSchema = new Schema({
  url: {
      type: String,
      require:true
  },
  title: {
      type: String,
      required: true
  },
  discription: { type: String },
  image: {
      type: String
  },
  content: {
      type: String,
      required: true
  },
  author: {
      type: String,
      require:true
  },
  categories: [{
      type: String
  }],
  tags: [{
      type: String
  }],
  comments: [CommentSchema],
  likes: [{
    type: String
    
  }],
  views: {type: Number, default: 0}
}, { timestamps: true });

const Post = new mongoose.model("Post", postSchema);

app.get("/", function (req, res){
    const skip= req.query.skip ? Number(req.query.skip) : 0;
    const limit = skip === 0 ? 4 : 3;
    Post.find({}, function (err, post) {
        res.status(200).json(post);
    }).sort({
        _id: -1
    }).skip(skip).limit(limit);
 });

 app.get("/popular", function (req, res) {
  Post.find({}, 'title discription image createdAt updatedAt url').sort({views: -1}).limit(4).exec(function (err, post) {
      if (post == null) {
          res.sendStatus(400);
      } else {
          res.status(200).send(post);
      }
  });
});

app.get("/dashboard",authenticateToken,  (req, res)=> {
      const username = new RegExp(escapeRegex(req.jwtuser.name), 'gi');
      Post.find({ "author": username }, function (err, posts) {
          if (err) {
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
});

app.post("/", authenticateToken, function(req, res) {
  const post = new Post({
      author: req.jwtuser.name,
      url: req.body.url,
      title: req.body.title,
      discription: req.body.discription,
      image: req.body.image,
      content: req.body.content,
      categories:req.body.categories,
      tags:req.body.tags
  });
  post.save(function(err) {
      if (!err) {
          res.status(200).json("Post has been created.");
      } else {
          res.status(400).json({ error: err.message });
      }
  });
});

app.put("/:postUrl", authenticateToken, function (req, res) {
  const uPost = { "content": req.body.content, "discription": req.body.discription, "title": req.body.title, "image": req.params.image, "categories": req.params.categories, "tags": req.params.tags }
  const postid = req.params.postUrl;
  Post.findOneAndUpdate({ "url": postid }, { $set: uPost }, { new: true }, (err, doc) => {
    if (err) {
      res.status(501).json(err);
    } else {
      res.status(200).json("Post has been updated.");
    }
  });
});    

app.delete("/:postUrl",authenticateToken, function(req,res){
        const postid = req.params.postUrl;
        Post.findOneAndDelete({"url": postid}, (err, doc) => {
        if (err) {
            console.log("Something when wrong!");
        }else{
            res.status(200).json("Post has been deleted!");
        }
        });
});

app.get("/p/:postUrl", function (req, res) {

    const reqPostUrl = req.params.postUrl;
    Post.findOne({url: reqPostUrl}, function (err, post) {
        if (post== null) {
            res.sendStatus(400);
        }else{
            post.views += 1;
            post.save( {
              timestamps: false
            });
            res.status(200).send(post)
        }
    });
});

app.get("/search", function (req, res) {

    const key = new RegExp(escapeRegex(req.query.q), 'gi');
    const skip= req.query.skip ? Number(req.query.skip) : 0;
    Post.find({
        title: key
    }, function (err, articles) {
        if (err) {
            console.log(err);
        } else {
            res.send(articles);
        }
    }).skip(skip).limit(6);

});

//  Commment section
app.post('/p/:postId/comments', authenticateToken, function(req, res) {
  const comment = {
    content: req.body.content,
    author: req.jwtuser.name
  };
  Post.updateOne({ _id: req.params.postId }, { $push: { comments: comment } }, {
    timestamps: false
  })
    .then(result => {
      res.status(200).json('Comment has been added.');
    })
    .catch(err => {
      res.status(500).json('Error adding comment.');
    });
});

// likes
app.post('/p/:postId/likes', authenticateToken, function (req, res) {
  const email = req.jwtuser.name;
  
  Post.findOne({ _id: req.params.postId }, function (err, post) {
    if (post.likes.includes(email)) {
      Post.updateOne({ _id: req.params.postId }, { $pull: { likes: email } }, {
        timestamps: false
      })
        .then(result => {
          res.status(200).json('Like has been removed.');
        })
        .catch(err => {
          res.status(500).json('Error removing like.');
        });
    } else {
      Post.updateOne({ _id: req.params.postId }, { $push: { likes: email } }, {
        timestamps: false
      })
        .then(result => {
          res.status(200).json('Like has been added.');
        })
        .catch(err => {
          res.status(500).json('Error adding like.');
        });
    }
  });
});

// some functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

app.listen(3000, function () {
    console.log("server is started");

});
