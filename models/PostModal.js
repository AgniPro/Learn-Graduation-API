import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const ReplySchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
  }
}, { timestamps: true });

const CommentSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  replies: [ReplySchema]
}, { timestamps: true });

const postSchema = new Schema({
  url: {
    type: String,
    required: true,
    set: function (v) { return v.replace(/\s+/g, ''); },
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: { type: String },
  image: {
    type: String
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  categories: [{
    type: String,
    trim: true,
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  comments: [CommentSchema],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  views: { type: Number, default: 0 }
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);
export default Post;