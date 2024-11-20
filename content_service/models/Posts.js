const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postsSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: [true, "owner should always exists"],
    },
    user_id: String, // the user id in postgres
    title: String,
    type: String,
    description: String,
    visibility: Number, // 0:public , 1:followers only , 2 specific location
    tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
    hashTags: [{ type: Schema.Types.ObjectId, ref: "hashTags" }],
    allowInteratction: { type: Boolean, default: true },
    allowComment: { type: Boolean, default: true },
    postAnonymosly: { type: Boolean, default: false },
    alert: { type: Boolean, default: false },
    whistleBlowing: { type: Boolean, default: false },
    images: [Schema.Types.Mixed],
    videos: [Schema.Types.Mixed],
    comments_count: { type: Number, default: 0, minimum: 0 },
    upVote_count: { type: Number, default: 0, minimum: 0 },
    downVote_count: { type: Number, default: 0, minimum: 0 },
    supporter_count: { type: Number, default: 0, minimum: 0 },
    share_count: { type: Number, default: 0, minimum: 0 },
    external_share_count: { type: Number, default: 0, minimum: 0 },
    views_count: { type: Number, default: 0, minimum: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: "posts" },
    type: {
      enum: ["post", "sharedPost", "support"],
      type: String,
    },
    // add post interests
    interests: [Schema.Types.Mixed],
    sensitiveContent: Boolean,
    location: [Schema.Types.Mixed],
    specificLocation: [Schema.Types.Mixed],
    active: { type: Boolean, default: true },
    weight: { type: Number, default: 1 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("posts", postsSchema);
