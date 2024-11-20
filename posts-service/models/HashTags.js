const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hashTagsSchema = new Schema(
  {
   tag:String,
   posts_counter:Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("hashTags", hashTagsSchema);