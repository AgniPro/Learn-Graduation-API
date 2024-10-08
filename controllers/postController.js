import redis from "../utils/redis.js";
import Post from "../models/PostModal.js";
import ErrorHandler from "../utils/ErrorHandler.js";
class postController {
    static getPosts = async (req, res, next) => {
        try {
            const { skip: skipString ,limit:limitReq} = req.query;
            const skip = skipString ? Number(skipString) : 0;
            let limit = skip === 0 ? 4 : 3;
            if (limitReq!==undefined && limitReq>0) {
                limit = Number(limitReq);
            }
            const posts = await Post.find({}, 'title description image createdAt updatedAt url categories likes views tags comments').sort({ _id: -1 })
                .skip(skip)
                .limit(limit);
            return res.status(200).json(posts);
        } catch (err) {
            return next(new ErrorHandler(err.message, 500));
        }
    };
    static popularPost = async (req, res, next) => {
        try {
            const redisPostCatch = await redis.get("popularPost");
            const popularPosts = JSON.parse(redisPostCatch);
            if (redisPostCatch && popularPosts.length > 0) {
                return res.status(200).json(popularPosts);
            }
            const posts = await Post.find({}, 'title description image createdAt updatedAt url categories tags')
                .sort({ views: -1 })
                .limit(4);
            if (posts.length === 0) {
                return res.status(404).json({ message: "No post found" });
            }
            await redis.set("popularPost", JSON.stringify(posts), "EX", 60 * 60 * 24);
            return res.status(200).json(posts);
        } catch (err) {
            return next(new ErrorHandler(err.message, 500));
        }
    };

    static createPost = async (req, res, next) => {
        try {
            let tags = req.body.tags;
            let tagsArray = tags.split(',').map(tag => tag.trim());
            let categories = req.body.categories;
            let categoriesArray = categories.split(',').map(category => category.trim());

            const post = new Post({
                author: req.user._id,
                url: formatUrlForSEO(req.body.url),
                title: req.body.title,
                description: req.body.description,
                image: req.body.image,
                content: req.body.content,
                categories: categoriesArray,
                tags: tagsArray
            });
            await post.save();
            return res.status(200).json("Post has been created.");
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                return res.status(400).json({ error: 'Duplicate key error. The URL already exists.' });
            } else if (err.name === 'ValidationError') {
                return res.status(400).json({ error: 'Validation Error. Please check your input.' });
            } else {
                return res.status(500).json({ error: 'Internal Server Error.' });
            }
        }
    };

    static updatePost = async (req, res) => {
        try {
            const postid = req.query.pid;
            let tags = req.body.tags;
            let tagsArray = tags.split(',').map(tag => tag.trim());
            let categories = req.body.categories;
            let categoriesArray = categories.split(',').map(category => category.trim());
            const uPost = {
                'url': req.body.url,
                'content': req.body.content,
                'description': req.body.description,
                'title': req.body.title,
                'image': req.body.image,
                'categories': categoriesArray,
                'tags': tagsArray
            };
            // Perform the update
            const updatedPost = await Post.findOneAndUpdate({ "_id": postid }, { $set: uPost }, { new: true });

            if (!updatedPost) {
                return res.status(500).json({ success: false, message: "Failed to update post" });
            }
            return res.status(200).json({ success: true, message: "Post has been updated." });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    };
    static deletePost = async (req, res, next) => {
        try {
            const psId = req.query.pId;
            const post = await Post.findOneAndDelete({ "_id": psId });
            console.log(psId);
            if (!post) {
                return res.status(404).json("Post not found.");
            }
            res.status(200).json("Post has been deleted.");
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static getPost = async (req, res, next) => {
        try {
            const postid = req.params.postID;
            const post = await Post.findOneAndUpdate(
                { "url": postid },
                { $inc: { "views": 1 } },
                { new: true, timestamps: false }
            ).populate('author', 'name avatar')
                .populate({
                    path: 'comments.author comments.replies.author',
                    select: 'name avatar role'
                })
                .lean();
            if (!post) {
                return res.status(404).json({ success: false, message: "Post not found" });
            }
            const isLiked = post.likes.includes(req.user);
            const responseData = {
                ...post,
                isLiked
            };
            res.status(200).json(responseData);
        } catch (err) {
            console.error(err); // Log the error for debugging purposes
            return res.status(500).json({ success: false, message: "An error occurred" });
        }
    }

    static searchPost = async (req, res, next) => {
        try {

            const key = new RegExp(escapeRegex(req.query.q), 'gi');
            const skip = req.query.skip ? Number(req.query.skip) : 0;
            const posts = await Post.find({ $or: [{ title: key }, { tags: key }, { categories: key }] }, 'title description image createdAt updatedAt url categories comments likes views tags')
                .sort({ _id: -1 })
                .skip(skip)
                .limit(6);
            if (posts.length === 0) {
                return res.status(404).json({success:false, message: "No post found" });
            }
            res.status(200).json(posts);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    };
    // comment
    static postComment = async (req, res, next) => {
        try {
            const comment = req.body.content
            if (!comment) {
                return res.status(500).json('Please write something to comment')
            }
            const commentData = { content: req.body.content, author: req.user._id, };
            const commentRes = await Post.findOneAndUpdate(
                { _id: req.params.postId },
                { $push: { comments: commentData } },
                { new: true, timestamps: false }
            ).populate({
                path: 'comments.author comments.replies.author',
                select: 'name avatar'
            })
                .lean();
            if (commentRes) {
                res.status(200).json({ success: true, message: 'Comment has added', comments: commentRes.comments })
            } else {
                res.status(500).json({ success: false, message: 'Something went wrong' })
            }
        }
        catch (err) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
   // reply to comment
   static replyToComment = async (req, res, next) => {
    try {
        const replyContent = req.body.content;
        if (!replyContent) {
            return res.status(500).json('Please write something to reply');
        }
        const replyData = { content: replyContent, author: req.user._id };

        const commentRes = await Post.findOneAndUpdate(
            { _id: req.params.postId, 'comments._id': req.params.commentId },
            { $push: { 'comments.$.replies': replyData } },
            { new: true, timestamps: false }
        ).populate({
            path: 'comments.author comments.replies.author',
            select: 'name avatar'
        }).lean();

        if (!commentRes) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        res.status(200).json({ success: true, message: 'Reply has been added', comments: commentRes.comments });
    } catch (err) {
        return next(new ErrorHandler(err.message, 500));
    }
}
    // comment deletion
    static deleteComment = async (req, res, next) => {
        try {
            const { postId, commentId } = req.params;

            const post = await Post.findOneAndUpdate(
                { _id: postId },
                { $pull: { comments: { _id: commentId } } },
                { new: true, timestamps: false }
            ).populate({
                path: 'comments.author comments.replies.author',
                select: 'name avatar'
            }).lean();

            if (post) {
                res.status(200).json({ success: true, message: 'Comment has been deleted', comments: post.comments });
            } else {
                res.status(404).json({ success: false, message: 'Post or comment not found' });
            }
        } catch (err) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
    // delete comment reply
    static deleteReply = async (req, res, next) => {
        try {
            const { postId, commentId, replyId } = req.params;
    
            const post = await Post.findOneAndUpdate(
                { _id: postId, 'comments._id': commentId },
                { $pull: { 'comments.$.replies': { _id: replyId } } },
                { new: true, timestamps: false }
            ).populate({
                path: 'comments.author comments.replies.author',
                select: 'name avatar'
            }).lean();
    
            if (post) {
                res.status(200).json({ success: true, message: 'Reply has been deleted', comments: post.comments });
            } else {
                res.status(404).json({ success: false, message: 'Post, comment, or reply not found' });
            }
        } catch (err) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
    // like
    static postLike = async (req, res, next) => {
        const userID = req.user._id;
        const postId = req.params.postId;
        try {
            const post = await Post.findById(postId);
            if (!post) {
                return res.status(404).json({ success: false, message: 'Post not found.' });
            }
            const isLiked = post.likes.includes(userID);
            const update = isLiked
                ? { $pull: { likes: userID } } // If liked, remove like
                : { $addToSet: { likes: userID } }; // If not liked, add like

            Post.updateOne({ _id: postId }, update, { timestamps: false })
                .then(result => {
                    const message = isLiked ? 'Like has been removed.' : 'Like has been added.';

                    res.status(200).json({ success: true, message });
                })
                .catch(err => {
                    res.status(500).json({ message: 'Error updating like.', success: false });
                });

        } catch (error) {
            return res.status(500).json("Error on updating like::" + error.message);
        }
    };
};

// some functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
const formatUrlForSEO = (url) => {
    return url
        .trim() // Remove leading and trailing whitespace
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
};

export default postController;