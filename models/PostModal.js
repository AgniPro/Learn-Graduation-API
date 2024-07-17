import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const CommentSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true });

const postSchema = new Schema({
  url: {
    type: String,
    require: true,
    set: function (v) { return v.replace(/\s+/g, ''); },
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: { type: String },
  image: {
    type: String
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
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
  views: { type: Number, default: 0 }
}, { timestamps: true });

const Post = new mongoose.model("Post", postSchema);
export default Post;