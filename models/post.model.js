require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema({
  author: {
    type: String,
    require: true
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
    require: true
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

module.exports = new mongoose.model("Post", postSchema);