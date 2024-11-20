const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    from_user: { type: Schema.Types.ObjectId, ref: "users" },
    to_user: { type: Schema.Types.ObjectId, ref: "users" },
    type: String, //up , down , multiUp , multiDown , support , multiSupport , alert , whistleblowing , views
    data: {
      post: { type: Schema.Types.ObjectId, ref: "posts" },
      numberOfUsers: { type: Number, default: 1 },
      thumbNail: [Schema.Types.Mixed],
    },
    readStatus: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("notifications", notificationSchema);
