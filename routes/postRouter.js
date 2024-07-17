import express from 'express';
const postRouter = express.Router();
import postController from '../controllers/postController.js';
import {isAuthenticated,authorizeRole} from '../middlewares/auth.js';

postRouter.get('/get-posts', postController.getPosts);
postRouter.get('/p/:postID', postController.getPost);
postRouter.get('/popular-posts', postController.popularPost);
postRouter.get('/search-posts', postController.searchPost);
postRouter.post('/create-post', isAuthenticated,authorizeRole("admin"), postController.createPost);
postRouter.put('/update-post', isAuthenticated,authorizeRole("admin"), postController.updatePost);
postRouter.delete('/delete-post', isAuthenticated,authorizeRole("admin"), postController.deletePost);
postRouter.put('/p/:postId/comment', isAuthenticated, postController.postComment);
postRouter.put('/p/:postId/like', isAuthenticated, postController.postLike);

export default postRouter;