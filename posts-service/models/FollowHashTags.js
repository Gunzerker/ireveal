const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const followHashTagsSchema = new Schema(
  {
    id_user: { type: Schema.Types.ObjectId, ref: "users" },
    id_hashTag: { type: Schema.Types.ObjectId, ref: "hashTags" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("followHashTags", followHashTagsSchema);
