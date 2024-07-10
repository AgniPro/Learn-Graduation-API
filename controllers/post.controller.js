require("dotenv").config();
const { redis } = require('../utils/redis');
const Post = require("../models/post.model.js");
const ErrorHandler = require("../utils/ErrorHandler.js");


const getPosts = async (req, res, next) => {
    try {
        const { skip: skipString } = req.query;
        const skip = skipString ? Number(skipString) : 0;
        const limit = skip === 0 ? 4 : 3;
        const posts = await Post.find({}, 'title description image createdAt updatedAt url categories comments likes views tags')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json(posts);
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};

const popularPost = async (req, res, next) => {
    try {
        const posts = await Post.find({}, 'title description image createdAt updatedAt url categories comments likes views tags')
            .sort({ views: -1 })
            .limit(4);
        if (posts.length === 0) {
            res.status(404).json({ message: "No post found" });
        }
        res.status(200).json(posts);
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};

const createPost = async (req, res, next) => {
    try {
        let tags = req.body.tags;
        let tagsArray = tags.split(',').map(tag => tag.trim());
        let categories = req.body.categories;
        let categoriesArray = categories.split(',').map(category => category.trim());

        const post = new Post({
            author: req.jwtuser.name,
            url: req.body.url,
            title: req.body.title,
            discription: req.body.discription,
            image: req.body.image,
            content: req.body.content,
            categories: categoriesArray,
            tags: tagsArray
        });
        await post.save();
        res.status(200).json("Post has been created.");
    } catch (err) {
        if (err.name === 'MongoError' && err.code === 11000) {
            res.status(400).json({ error: 'Duplicate key error. The URL already exists.' });
        } else if (err.name === 'ValidationError') {
            res.status(400).json({ error: 'Validation Error. Please check your input.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error.' });
        }
    }
};

const updatePost = async (req, res, next) => {
    try {
        let tags = req.body.tags;
        let tagsArray = tags.split(',').map(tag => tag.trim());
        let categories = req.body.categories;
        let categoriesArray = categories.split(',').map(category => category.trim());
        const uPost = { "content": req.body.content, "discription": req.body.discription, "title": req.body.title, "image": req.body.image, "categories": categoriesArray, "tags": tagsArray }
        const postid = req.params.postUrl;
        Post.findOneAndUpdate({ "url": postid }, { $set: uPost }, { new: true }, (err, doc) => {
            if (err) {
                res.status(501).json(err);
            } else {
                res.status(200).json("Post has been updated.");
            }
        });
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};

const deletePost = async (req, res, next) => {
    try {
        const postid = req.params.postUrl;
        const post = await Post.findOneAndDelete({ "url": postid });
        res.status(200).json("Post has been deleted.");
    }
    catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
}
const getPost = async (req, res, next) => {
    try {
        const postid = req.params.postID;
        const post = await Post.findOne({
            "url":
                postid
        });
        res.status(200).json(post);
    }
    catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
}
const searchPost = async (req, res, next) => {
    try {

        const key = new RegExp(escapeRegex(req.query.q), 'gi');
        const skip = req.query.skip ? Number(req.query.skip) : 0;
        const posts = await Post.find({ $or: [{ title: key }, { tags: key }, { categories: key }] }, 'title description image createdAt updatedAt url categories comments likes views tags')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(6);
        res.status(200).json(posts);

    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
};
// comment
const postComment = async (req, res, next) => {
    try {
        const postid = req.params.postID;
        const comment = { content: req.body.content, author: req.jwtuser.name };
        Post.updateOne({ _id: req.params.postId }, { $push: { comments: comment } }, {
            timestamps: false
        })
            .then(result => {
                res.status(200).json('Comment has been added.');
            })
            .catch(err => {
                res.status(500).json('Error adding comment.');
            });
    }
    catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
}
// like
const postLike = async (req, res, next) => {
    const email = req.jwtuser.name;

    await Post.findOne({ _id: req.params.postId }, function (err, post) {
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
}

// some functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = { getPosts, createPost, updatePost, deletePost, getPost, searchPost, postComment, postLike, popularPost };