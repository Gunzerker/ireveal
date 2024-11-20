const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postsSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "users" },
    title: String,
    type: String,
    description: String,
    visibility: Number, // 0:public , 1:followers only , 2 specific location
    tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
    hashTags: [{ type: Schema.Types.ObjectId, ref: "hashTags" }],
    allowInteratction: Boolean,
    allowComment: Boolean,
    postAnonymosly: Boolean,
    alert: Boolean,
    whistleBlowing: Boolean,
    images: [Schema.Types.Mixed],
    videos: [Schema.Types.Mixed],
    upVote_count: { type: Number, default: 0 },
    downVote_count: { type: Number, default: 0 },
    supporter_count: { type: Number, default: 0 },
    share_count: { type: Number, default: 0 },
    views_count: { type: Number, default: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: "posts" },
    type: {
      enum: ["post", "sharedPost", "support"],
      type: String,
    },
    sensitiveContent: Boolean,
    location: [Schema.Types.Mixed],
    active : {type:Boolean , default : true},
    weight : {type:Number , default : 0},
    actif:{type:Boolean , default:true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("posts", postsSchema);
