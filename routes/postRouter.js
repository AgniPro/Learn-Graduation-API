const express = require('express');
const postRouter = express.Router();
const { createPost, getPost, updatePost, deletePost, postLike, postComment, getPosts, popularPost, searchPost } = require('../controllers/post.controller.js');
const { isAthenicated ,authorizeRole} = require('../middlewares/auth.js');

postRouter.get('/get-posts', getPosts);
postRouter.get('/get-post/:postID', getPost);
postRouter.get('/popular-posts', popularPost);
postRouter.get('/search-posts', searchPost);
postRouter.post('/create-post', isAthenicated,authorizeRole("admin"), createPost);
postRouter.put('/update-post', isAthenicated,authorizeRole("admin"), updatePost);
postRouter.delete('/delete-post', isAthenicated,authorizeRole("admin"), deletePost);
postRouter.put('/post-comment', isAthenicated, postComment);
postRouter.put('/post-like', isAthenicated, postLike);

module.exports = postRouter;