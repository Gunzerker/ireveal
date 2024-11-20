const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSuggestionSchema = new Schema(
  {
    country: String,
    city: String,
    address: String,
    long: String,
    lat: String,
    post_counts : {type:Number , default:0}
  },
  { timestamps: true }
);

module.exports = mongoose.model("locationSuggestion", locationSuggestionSchema);
