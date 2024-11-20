const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clubsSchema = new Schema(
  {
    id_user: { type: Schema.Types.ObjectId, ref: "users" },
    id_post: { type: Schema.Types.ObjectId, ref: "posts" },
    content: {
      text: String,
      tags: [{ type: String }],
      hashTags: [{ type: Schema.Types.ObjectId, ref: "hashTags" }],
    },
    main_comment: { type: Schema.Types.ObjectId, ref: "comments" },
    childsCount: { type: Number, default: 0, min: 0 },
    isAnonymous: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("comments", clubsSchema);
