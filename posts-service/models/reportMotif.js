const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportMotifSchema = new Schema(
  {
    tag_type : String,
    parentId: { type: Schema.Types.ObjectId, ref: "reportsMotif" },
    active : {type:Boolean , default : true},

  },
  { timestamps: true }
);

module.exports = mongoose.model("reportsMotif", reportMotifSchema);