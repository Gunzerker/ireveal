const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const savedPostsSchema = new Schema(
  {
    user_id: String,
    email: String,
    country_code: String,
    phone_number: String,
    username: String,
    fullName: String,
    gender: String,
    profilVisibility: String,
    profile_image: String,
    profile_cover: String,
    address: String,
    country: String,
    state: String,
    longitude: String,
    latitude: String,
    profilLink: String,
    firebasetoken: String,
    description: String,
    facebook: String,
    twitter: String,
    youtube: String,
    site: String,
    // interestsId is a string cause its passed as form-data that contains an array of intergers : "[4,5,6]"
    interestsId: String,
    status: String,
    active: String,
    whistleblowingNotification: Boolean,
    alertNotification: Boolean,
    commentsNotification: Boolean,
    topAndDownNotification: Boolean,
    postViewsNotification: Boolean,
    getContentFromPublicNotification: Boolean,
    muteNotification: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", savedPostsSchema);
