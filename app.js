//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

const homeStartingContent = "Application are under progress so please visit to learngraduation.blogspot.com or click on below link"
const contactContent = "Contact us at agnipro(at)gmail(dot)com"
const aboutContent = "this is blog post templet designed by agnipro and the creator is abhidhek mehta"


const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));


mongoose.connect("mongodb+srv://agnipro:<agnipro%20>@agnipro.absogmm.mongodb.net/?retryWrites=true&w=majority", {
    useNewUrlParser: true
});

const postSchema = {
    _id:String,
    title: String,
    content: String
}
const Post = mongoose.model("Post", postSchema);


app.get("/", function (req, res) {

    Post.find({}, function (err, posts) {
        res.render("home", {
            startingContent: homeStartingContent,
            posts: posts,
        });
    });

});
app.get("/contact", function (req, res) {
    res.render("contact", {
        contactpg: contactContent
    });

});
app.get("/about", function (req, res) {
    res.render("about", {
        aboutpg: aboutContent
    });

});

app.get("/sign", function (req, res) {
    res.render("sign");
});

app.post("/sign", function (req, res) {
    const sId = "abhishek";
    const sPs = "1234"
    if (req.body.userId === sId && req.body.password === sPs) {

        app.get("/compose", function (req, res) {
            res.render("compose");
        });

        res.redirect("/compose");

        app.post("/compose", function(req, res){
            const post = new Post({
               _id: req.body.purl,
              title: req.body.postTitle,
              content: req.body.postBody
            });
          
          
            post.save(function(err){
              if (!err){
                  res.redirect("/");
              }
            });
        });
    } else {
        res.redirect("/sign");

    }

});


app.get("/posts/:postId", function(req, res){

    const requestedPostId = req.params.postId;

      Post.findOne({_id: requestedPostId}, function(err, post){
        res.render("post", {
            _id: post.purl,
          title: post.title,
          content: post.content,
          
        });
      });
    
});


app.listen(3000, function () {
    console.log("server has started");

});
