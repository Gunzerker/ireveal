const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subellSchema = new Schema(
  {
    from_user: { type: Schema.Types.ObjectId, ref: "users" },
    to_user: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("subell", subellSchema);
