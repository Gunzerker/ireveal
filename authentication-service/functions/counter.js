const models = require("../models/db_init");
const UserModel = models["users"];

module.exports = {
    counterFollowers: function ( user_id, step) {
        return UserModel.increment(
            { "followers_count": +step },
            { where: { user_id } }
        )
    },
    counterFollowing: function ( user_id, step) {
        return UserModel.increment(
            { "following_count": +step },
            { where: { user_id } }
        )
    },
    counterPosts: function ( user_id, step) {
        return UserModel.increment(
            { "posts_count": +step },
            { where: { user_id } }
        )
    },
    counterLikes: function ( user_id, step) {
        return UserModel.increment(
            { "likes_count": +step }, 
            { where: { user_id } }
        )
    },
    counterViews: function ( user_id, step) {
        return UserModel.increment(
            { "views_count": +step },
            { where: { user_id } }
        )
    }

}
