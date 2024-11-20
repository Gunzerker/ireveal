const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const Posts = require("../../models/Posts");
const mongoose = require("mongoose");
const { ApolloError } = require("apollo-server-errors");
const config = require("../../config/config.json");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-ireveal-resources", Key: "", Body: "" };
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");
const SavePosts = require("../../models/SavedPosts");
const HashTags = require("../../models/HashTags");
const axios = require("axios");
const User = require("../../models/Users");
const Reaction = require("../../models/Interaction");
const Comment = require("../../models/Comments");
const FollowHashTags = require("../../models/FollowHashTags");
const reportSchema = require("../../models/report");
const reportMotifSchema = require("../../models/reportMotif");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs")
//const nsfw = require("../../functions/nsfw_filter")

const postsSchema = require("../../models/Posts");
const locationSuggestion = require("../../models/Location_suggestions");
const sharp = require("sharp");
const { streamToBuffer } = require("@jorgeferrero/stream-to-buffer");

function compressImage(file) {
  return new Promise((resolve, reject) => {
    sharp(file)
      .resize(1080)
      .jpeg({ quality: 60, force: true, mozjpeg: true })
      .toBuffer()
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => {});
  });
}

function uploadMedia(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const { createReadStream, filename, mimetype, enconding } = await file;
      console.log(file);
      // Configure the file stream and obtain the upload parameters
      var fileStream = createReadStream();

      fileStream.on("error", function (err) {
        console.log("File Error", err);
      });
      let sensitive = false
      if (mimetype.includes("image")) {
        //const new_file = await streamToBuffer(createReadStream());
        //const returned_file = await compressImage(new_file);
        uploadParams.Body = fileStream;
        uploadParams.Key = uuidv4() + "." + mime.getExtension("image/jpeg");
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = "image/jpeg";
      } else {
        uploadParams.Body = fileStream;
        uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
        console.log(uploadParams.Key);
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = mimetype;
      }

      // call S3 to retrieve upload file to specified bucket
      try{
        const upload = await s3.upload(uploadParams).promise();
              console.log(upload);
      return resolve({
        _id: mongoose.Types.ObjectId(),
        file_name: upload.Key,
        mimetype,
        url: upload.Location,
        sensitive,
      });
      }catch(err){
        console.log(err)
      }
      //if (mimetype.includes("image")) sensitive = await nsfw(upload.Location);

    } catch (err) {
      return reject(err);
    }
  });
}

function uploadMediaforThumb(path , key) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configure the file stream and obtain the upload parameters
      var fileStream = fs.readFileSync(path);

      uploadParams.Body = fileStream;
      uploadParams.Key = key;
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mime.getType(path); // => 'text/plain'

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve(upload.Location);
    } catch (err) {
      return reject(err);
    }
  });
}

async function thumbnailVideo(path, key) {
  return new Promise((resolve, reject) => {
    ffmpeg(path)
      .on("filenames", function (filenames) {
        console.log("Will generate " + "thumbnail-");
      })
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        //return reject(err);
      })
      .on("end", async function () {
        console.log("Screenshots taken");
        let path =
          "./asset/thumbnail-" + key.replace(".mp4", ".jpeg");
        let s3_key = "thumbnail-" + key.replace(".mp4", ".jpeg");
        let returned_url = await uploadMediaforThumb(path, s3_key);
        await fs.unlinkSync(path);
        return resolve({ url: returned_url, key: s3_key, path });
      })
      .screenshots({
        timestamps: ["00:00.01"],
        filename: "./thumbnail-" + key.replace(".mp4", ".jpeg"),
        folder: "./asset",
        //size:"1280x720"
      });
  })
}

module.exports = {
  Query: {
    uploads: (parent, args) => {},
    // fetchReports: async (parent, args, context, info) => {
    //   return await reportSchema.find({})
    // }
  },
  Mutation: {
    createPost: async (parent, args, context, info) => {
      /* Handle auth */
      //upload the received media
      console.log("CREATE POST");
      let promise_array = [];
      let images = [];
      let videos = [];
      if (args.media) {
        for (let i = 0; i < args.media.length; i++) {
          promise_array.push(uploadMedia(args.media[i]));
        }
        // resolve all promises
        const resolved_uploads = await Promise.all(promise_array);
        // prepare the post to create
        // split the videos and images
        for (let i = 0; i < resolved_uploads.length; i++) {
          if (resolved_uploads[i].mimetype.includes("image"))
            images.push({
              _id: resolved_uploads[i]._id,
              file_name: resolved_uploads[i].file_name,
              order: i,
              video_duration: args.video_duration[i],
              sensitive: resolved_uploads[i].sensitive
            });
          else{
            const thumbResult = await thumbnailVideo("https://digit-u-ireveal-resources.s3.eu-central-1.amazonaws.com/" + resolved_uploads[i].file_name, resolved_uploads[i].file_name )
            if (args.sound[i] == null)
                    throw new ApolloError("Bad request", 400, {
                      code: 400,
                      message: "Sound attribut should not be null",
                    });
            videos.push({
              _id: resolved_uploads[i]._id,
              file_name: resolved_uploads[i].file_name,
              order: i,
              video_duration: args.video_duration[i],
              thumbnail: thumbResult.url,
              sound: args.sound[i],
              sensitive: resolved_uploads[i].sensitive,
            });
          }
        }
      }
      // check if the hashTags exists else create one
      let hashTags = [];
      if (args.hashTags) {
        for (let i = 0; i < args.hashTags.length; i++) {
            const created_hash_tag = await HashTags.findOneAndUpdate(
              { tag: args.hashTags[i] },
              { $inc: { posts_counter: 1 } },
              { upsert: true , new:true }
            );
            hashTags.push(created_hash_tag._id);
        }
      }
      const post_to_create = {
        owner: context.decoded.obj._id,
        user_id: context.decoded.obj.user_id,
        title: args.title,
        type: args.type,
        videos: videos,
        images: images,
        description: args.description,
        visibility: args.visibility,
        tags: args.tags,
        hashTags: hashTags,
        allowInteratction: args.allowInteratction,
        allowComment: args.allowComment,
        postAnonymosly: args.postAnonymosly,
        alert: args.alert,
        whistleBlowing: args.whistleBlowing,
        sensitiveContent: args.sensitiveContent,
        location: args.location,
        parentId: args.parentId,
        interests:
          context.decoded.obj.interestsId == null
            ? []
            : JSON.parse(context.decoded.obj.interestsId),
        specificLocation: args.specificLocation,
      };
      // assign proper weight
      if (args.alert == true) post_to_create.weight = 3;
      if (args.whistleBlowing == true) post_to_create.weight = 2;
      let created_post = await Posts.create(post_to_create);
      // check if it's a support post
      let parent_post;
      if (args.type == "support") {
        // increment to support counts of main post
        parent_post = await Posts.findOneAndUpdate(
          { _id: args.parentId },
          { $inc: { supporter_count: 1, weight: 10 } },
          {new:true}
        );

        // save the support as interaction
        await Reaction.findOneAndUpdate(
          {
            id_post: args.parentId,
            id_user: context.decoded.obj._id,
            type: "support",
            isAnonymous: context.decoded.obj.isAnonymous,
          },
          { $inc: { post_counts: 1 } },
          { upsert: true, new: true }
        );
      }
      //update posts count

      try {
        const test = await axios.post(
          `${config.auth_service_url}api/user/profilCountServices`,
          { type: "posts_count", user_id: context.decoded.obj.user_id, step: 1 }
        );
      } catch (err) {
        console.log(err);
      }
      await Promise.all([
        await Posts.populate(created_post, { path: "owner" }),
        await Posts.populate(created_post, { path: "tags" }),
        await Posts.populate(created_post, { path: "hashTags" }),
      ]);

      // if (args.parentId != null) {
      // fetch the owner of the post

      //   if (parent_post.supporter_count < 10)
      //     //********send notification to the user
      //     await axios.post(
      //       `${config.notif_service_url}api/notifications/sendToUser`,
      //       {
      //         from_user: context.decoded.obj._id,
      //         to_user: parent_post.owner,
      //         type: "SUPPORT",
      //         data: { post: args.parentId, thumbNail: parent_post.images[0] },
      //       }
      //     )

      //   //*********************************** */
      //   else if (parent_post.supporter_count % 10 == 0)
      //     await axios.post(
      //       `${config.notif_service_url}api/notifications/sendToUser`,
      //       {
      //         from_user: context.decoded.obj._id,
      //         to_user: parent_post.owner,
      //         type: "MULTISUPPORT",
      //         data: {
      //           post: args.postId,
      //           numberOfUsers: parent_post.supporter_count - 1,
      //           thumbNail: parent_post.images[0],
      //         },
      //       }
      //     );
      // }

      // broadcast to subscribers
      await axios.post(
        `${config.notif_service_url}api/notifications/broadcastTopic`,
        {
          topics: [`${created_post.owner._id}`],
          from_user: context.decoded.obj._id,
          type: "BELL-NOTIF",
          data: { post: created_post._id },
        }
      );

      if (created_post.alert == true)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/broadcastTopic`,
          {
            topics: ["alert"],
            from_user: context.decoded.obj._id,
            type: "ALERT",
            data: { post: created_post._id },
          }
        );

      if (created_post.whistleBlowing == true)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/broadcastTopic`,
          {
            topics: ["whistleblowing"],
            from_user: context.decoded.obj._id,
            type: "WHISTLEBLOWING",
            data: { post: created_post._id },
          }
        );

      if (created_post.whistleBlowing == true)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/broadcastTopic`,
          {
            topics: ["whistleblowing"],
            from_user: context.decoded.obj._id,
            type: "WHISTLEBLOWING",
            data: { post: created_post._id },
          }
        );

      // check if the location already exists or create a new one
      /*if (args.location) {
        if (args.location.length != 0) {

          await locationSuggestion.findOneAndUpdate(
            {
              country: args.location[0].country,
              city: args.location[0].city,
              address: args.location[0].address,
              long: args.location[0].long,
              lat: args.location[0].lat,
            },
            { $inc: { post_counts: 1 } },
            { new: true, upsert: true, useFindAndModify: false }
          );
        }
      }*/
      created_post.user_reaction = [];
      let images_to_filter = { post_id: created_post._id, urls: [], file_name :[]};
      for (let i =0 ; i<created_post.images.length;i++){
        images_to_filter.file_name.push(created_post.images[i].file_name);
        images_to_filter.urls.push(
          `${config.ireveal_bucket}` + created_post.images[i].file_name
        );
      }
      try{
        axios.post(
          `https://ireveal-content.digit-dev.com/check`,
          images_to_filter
        );
      }catch(err){
        console.log(err)
      }
      return created_post;
    },
    externalShare: async (parent, args, context, info) => {
      //update the weight and total external share
      await Posts.findOneAndUpdate(
        { _id: args.postId },
        { $inc: { external_share_count: 1, weight: 10 } },
        { useFindAndModify: false }
      );
      return `${config.post_service_url}` + args.postId;
    },

    report: async (parent, args, context, info) => {
      const check = await reportSchema.findOne({
        post_id: args.signalInput.post_id,
        user_id: context.decoded.obj.user_id,
      });
      console.log(check);
      if (check) {
        console.log("here");
        return await reportSchema.findOneAndUpdate({
          user_id: context.decoded.obj.user_id,
          post_id: args.signalInput.post_id,
        });
      } else {
        return await reportSchema.create({
          user_id: context.decoded.obj.user_id,
          post_id: args.signalInput.post_id,
        });
      }
    },

    reportMotif: async (parent, args, context, info) => {
      try {
        if (args.signalMotifInput.parentId) {
          const check = await reportMotifSchema.find({
            parentId: args.signalMotifInput.parentId,
          });
          if (check) {
            return await reportMotifSchema.create({
              tag_type: args.signalMotifInput.tag_type,
              parentId: args.signalMotifInput.parentId,
            });
          }
        } else {
          return await reportMotifSchema.create({
            tag_type: args.signalMotifInput.tag_type,
          });
        }
      } catch (err) {
        throw new ApolloError(err);
      }
    },

    postReact: async (parent, args, context, info) => {
      /* check if it's a like or remove like */

      // fetch the post
      const post = await Posts.findOne({ _id: args.postId }).populate("owner");
      if (args.type == "up") {
        /*if like not exists insert one */
        const user_like = await Reaction.findOne({
          id_post: args.postId,
          type: "up",
          id_user: context.decoded.obj._id,
        });
        if (user_like) {
          //delete the like
          await Reaction.deleteOne({ _id: user_like._id });
          //decrease the like counter
          await Posts.findOneAndUpdate(
            { _id: args.postId },
            { $inc: { upVote_count: -1 } }
          );
        } else {
          // check if the user already dislikes the post
          const user_dislike = await Reaction.findOne({
            id_post: args.postId,
            type: "down",
            id_user: context.decoded.obj._id,
          });
          if (user_dislike) {
            //delete the dislike
            await Reaction.deleteOne({ _id: user_dislike._id });
            //decrease the dislike counter
            await Posts.findOneAndUpdate(
              { _id: args.postId },
              { $inc: { downVote_count: -1 } }
            );
          }
          //create the like
          await Reaction.create({
            id_user: context.decoded.obj._id,
            id_post: args.postId,
            type: "up",
            isAnonymous: context.decoded.obj.isAnonymous,
          });
          // increase the like counter
          const updated_post = await Posts.findOneAndUpdate(
            { _id: args.postId },
            { $inc: { upVote_count: 1, weight: 5 } }
          );
          if (updated_post.upVote_count < 10)
            //********send notification to the user
            await axios.post(
              `${config.notif_service_url}api/notifications/sendToUser`,
              {
                from_user: context.decoded.obj._id,
                to_user: post.owner._id,
                type: "UP",
                data: { post: args.postId, thumbNail: updated_post.images[0] },
              }
            );
          //*********************************** */
          else if (updated_post.upVote_count % 10 == 0)
            await axios.post(
              `${config.notif_service_url}api/notifications/sendToUser`,
              {
                from_user: context.decoded.obj._id,
                to_user: post.owner._id,
                type: "MULTIUP",
                data: {
                  post: args.postId,
                  numberOfUsers: updated_post.upVote_count - 1,
                  thumbNail: updated_post.images[0],
                },
              }
            );
        }
      } else {
        /*if like not exists insert one */
        const user_like = await Reaction.findOne({
          id_post: args.postId,
          type: "down",
          id_user: context.decoded.obj._id,
        });
        if (user_like) {
          //delete the like
          await Reaction.deleteOne({ _id: user_like._id });
          //decrease the like counter
          await Posts.findOneAndUpdate(
            { _id: args.postId },
            { $inc: { downVote_count: -1 } }
          );
        } else {
          // check if the user already dislikes the post
          const user_dislike = await Reaction.findOne({
            id_post: args.postId,
            type: "up",
            id_user: context.decoded.obj._id,
          });
          if (user_dislike) {
            //delete the dislike
            await Reaction.deleteOne({ _id: user_dislike._id });
            //decrease the dislike counter
            await Posts.findOneAndUpdate(
              { _id: args.postId },
              { $inc: { upVote_count: -1 } }
            );
          }
          //create the like
          await Reaction.create({
            id_user: context.decoded.obj._id,
            id_post: args.postId,
            type: "down",
            isAnonymous: context.decoded.obj.isAnonymous,
          });
          // increase the like counter
          const updated_post = await Posts.findOneAndUpdate(
            { _id: args.postId },
            { $inc: { downVote_count: 1, weight: 2 } }
          );

          if (updated_post.downVote_count < 10)
            //********send notification to the user
            await axios.post(
              `${config.notif_service_url}api/notifications/sendToUser`,
              {
                from_user: context.decoded.obj._id,
                to_user: post.owner._id,
                type: "DOWN",
                data: { post: args.postId, thumbNail: updated_post.images[0] },
              }
            );
          //*********************************** */
          else if (updated_post.downVote_count % 10 == 0)
            await axios.post(
              `${config.notif_service_url}api/notifications/sendToUser`,
              {
                from_user: context.decoded.obj._id,
                to_user: post.owner._id,
                type: "MULTIDOWN",
                data: {
                  post: args.postId,
                  numberOfUsers: updated_post.upVote_count - 1,
                  thumbNail: updated_post.images[0],
                },
              }
            );
        }
      }
      return "reaction updated";
    },

    uploadMedia: async (parent, args) => {
      const {
        createReadStream,
        filename,
        mimetype,
        enconding,
      } = await args.media;
      // Configure the file stream and obtain the upload parameters
      var fileStream = createReadStream();
      fileStream.on("error", function (err) {
        console.log("File Error", err);
      });
      uploadParams.Body = fileStream;
      uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mimetype;

      // call S3 to retrieve upload file to specified bucket
      try {
        const upload = await s3.upload(uploadParams).promise();
        return {
          _id: mongoose.Types.ObjectId(),
          type: args.type,
          file_name: uploadParams.Key,
          url: upload.Location,
        };
      } catch (err) {
        throw err;
      }
    },

    discoverPosts: async (parent, args, context) => {
      // fetch the blocked posts
      let blocked_posts = await BlockPosts.find({
        $or: [
          {
            user_id: context.decoded.id,
            expiration_data: { $gte: new Date() },
          },
          { user_id: context.decoded.id, expiration_data: null },
        ],
      }).select("post_id -_id");
      blocked_posts = blocked_posts.map((blocked_post) => blocked_post.post_id);
      const posts = await Posts.find({
        _id: { $nin: blocked_posts },
        draft: false,
        visibility: 0,
      })
        .limit(args.limit)
        .skip(args.offset)
        .sort([["updatedAt", -1]])
        .populate("post_parent_id");
      for (let i = 0; i < posts.length; i++) {
        let found_like = posts[i].post_likes.find(
          (post_like) => post_like.user_id == context.decoded.id
        );
        if (found_like) posts[i].user_liked_post = true;
        else posts[i].user_liked_post = false;
      }
      return posts;
    },
    updatePost: async (parent, args, context) => {
      /*fetch the user_id from token*/
      const user_id = context.decoded.obj._id;
      /*fetch the post*/
      let post = await Posts.findById(args.postId);
      post = JSON.parse(JSON.stringify(post))
      /*check if the user has permission on the post */
      if (!post.owner == (user_id)) {
        throw new ApolloError("Forbidden", 403, {
          code: 403,
          message: "Forbidden",
        });
      }
      /*update the post*/
      // check if the hashTags exists else create one
      let hashTags = [];
      for (let i = 0; i < args.hashTags.length; i++) {
        if (args.hashTags[i].found == true) {
          // update the total of posts created for the hashtag
          await HashTags.findOneAndUpdate(
            { _id: args.hashTags[i].tag },
            { $inc: { posts_counter: 1 } }
          );
          hashTags.push(args.hashTags[i].tag);
        } else {
          //create the new hashtag
          const new_hashtag = await HashTags.create({
            tag: args.hashTags[i].tag,
            posts_counter: 1,
          });
          hashTags.push(new_hashtag._id);
        }
      }
      //update the sound of videos
      let videos= []
      if (post.videos.length !=0)
        for (let i = 0; i < post.videos.length; i++) {
          post.videos[i].sound = args.sound[post.videos[i].order];
          videos.push(post.videos[i]);
        }
      let post_to_update = {
        title: args.title,
        type: args.type,
        description: args.description,
        visibility: args.visibility,
        tags: args.tags,
        hashTags: hashTags,
        allowInteratction: args.allowInteratction,
        allowComment: args.allowComment,
        postAnonymosly: args.postAnonymosly,
        alert: args.alert,
        whistleBlowing: args.whistleBlowing,
        sensitiveContent: args.sensitiveContent,
        location: args.location,
        parentId: args.parentId,
        videos
      };

      for (let field in post_to_update) {
        if (post_to_update[field] == null) delete post_to_update[field];
      }
      const updated_post = await Posts.findOneAndUpdate(
        { _id: args.postId },
        post_to_update,
        { new: true }
      );
      if (updated_post.alert == true)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/broadcastTopic`,
          {
            topics: ["alert"],
            from_user: context.decoded.obj._id,
            type: "ALERT",
            data: { post: updated_post._id },
          }
        );

      if (updated_post.whistleBlowing == true)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/broadcastTopic`,
          {
            topics: ["whistleblowing"],
            from_user: context.decoded.obj._id,
            type: "WHISTLEBLOWING",
            data: { post: updated_post._id },
          }
        );

      return updated_post;
    },
    findPostById: async (parent, args, context) => {
      /* fetch the required post */
      let required_post = await Posts.findById(args.postId)
        .populate("owner")
        .populate("tags")
        .populate("hashTags")
        .populate({ path: "parentId", populate: { path: "owner" } });
      // check if the user liked the post
      const found_reaction = await Reaction.find({
        id_post: args.postId,
        id_user: context.decoded.obj._id,
      });
      let reactions = [];
      for (let i = 0; i < found_reaction.length; i++)
        reactions.push(found_reaction[i].type);
      if (reactions.length != 0) required_post.user_reaction = reactions;
      return required_post;
    },

    commentPost: async (parent, args, context) => {
      /* handle hashtags */
      // check if the hashTags exists else create one
      let hashTags = [];
      for (let i = 0; i < args.hashTags.length; i++) {
          // update the total of posts created for the hashtag
          const created_hashTag = await HashTags.findOneAndUpdate(
            { tag: args.hashTags[i] },
            { $inc: { posts_counter: 1 } },
            { upsert: true, new: true }
          );
          hashTags.push(created_hashTag._id);
          //create the new hashtag
      }
      /* create the comment */
      const created_comment = await Comment.create({
        id_post: args.postId,
        id_user: context.decoded.obj._id,
        content: {
          text: args.comment,
          tags: args.tags,
          hashTags: hashTags,
        },
        isAnonymous: context.decoded.obj.isAnonymous,
      });
      // update the total number of comments
      const updated_post = await Posts.findOneAndUpdate(
        { _id: args.postId },
        { $inc: { comments_count: 1 } }
      );

      // send the notification
      if (updated_post.comments_count < 10)
        //********send notification to the user
        await axios.post(
          `${config.notif_service_url}api/notifications/sendToUser`,
          {
            from_user: context.decoded.obj._id,
            to_user: updated_post.owner,
            type: "COMMENT",
            data: { post: args.postId, thumbNail: updated_post.images[0] },
          }
        );
      //*********************************** */
      else if (updated_post.comments_count % 10 == 0)
        await axios.post(
          `${config.notif_service_url}api/notifications/sendToUser`,
          {
            from_user: context.decoded.obj._id,
            to_user: updated_post.owner,
            type: "MULTICOMMENT",
            data: {
              post: args.postId,
              numberOfUsers: updated_post.comments_count - 1,
              thumbNail: updated_post.images[0],
            },
          }
        );
      await Comment.populate(created_comment,"id_user");
      await Comment.populate(created_comment, "content.hashTags");
      return created_comment;
    },

    commentAComment: async (parent, args, context) => {
      // check if the hashTags exists else create one
      let hashTags = [];
      for (let i = 0; i < args.hashTags.length; i++) {
        // update the total of posts created for the hashtag
        const created_hashTag = await HashTags.findOneAndUpdate(
          { tag: args.hashTags[i] },
          { $inc: { posts_counter: 1 } },
          { upsert: true, new: true }
        );
        hashTags.push(created_hashTag._id);
        //create the new hashtag
      }
      /*create the comment for the comment*/
      let created_comment = await Comment.create({
        id_post: args.postId,
        id_user: context.decoded.obj._id,
        content: {
          text: args.comment,
          tags: args.tags,
          hashTags: hashTags,
        },
        isAnonymous: context.decoded.obj.isAnonymous,
        main_comment: args.commentId,
      });
      /* increment the main comment*/
      await Comment.findOneAndUpdate(
        { _id: args.commentId },
        { $inc: { childsCount: 1 } }
      );
      await Comment.populate(created_comment, "id_user");
      await Comment.populate(created_comment, "content.hashTags");
      return created_comment;
    },

    updateComment: async (parent, args, context) => {
      /*update the comment */
      try {
        await Comment.findOneAndUpdate(
          { _id: args.commentId },
          { content: args }
        );
        return "comment updated";
      } catch (err) {
        throw new ApolloError(err);
      }
    },

    deleteComment: async (parent, args, context) => {
      /* disable the comment*/
      const comment = await Comment.findOneAndUpdate(
        { _id: args.commentId },
        { active: false }
      );
      console.log(comment);
      /* decrease the parent total comments if exists */
      if (comment.main_comment)
        await Comment.findOneAndUpdate(
          { _id: comment.main_comment },
          { $inc: { childsCount: -1 } }
        );
      return "comment delete";
    },

    fetchComments: async (parent, args, context) => {
      /*fetch the comments if a post is given */
      console.log(args.offset);
      if (args.postId) {
        //fetch number of sub comments
        const comments = await Comment.find({
          id_post: args.postId,
          active: true,
          main_comment: null,
        })
          .populate("id_user")
          .populate("content.hashTags")
          .limit(args.limit)
          .skip(args.offset);
        /*const comments = await Comment.aggregate([
        {
          $match: {
            id_post: mongoose.Types.ObjectId(args.postId),
            active: true,
            main_comment: null,
          },
        },
        {
          $facet: {
            comments: [{ $skip: args.offset }, { $limit: args.limit }],
            pageInfos: [{ $group: { _id: null, count: { $sum: 1 } } }],
          },
        },
      ]);
      await Comment.populate(comments[0].comments,{path:"id_user"});
            console.log(comments[0].comments);*/
        return comments;
      } else {
        const comments = await Comment.find({
          main_comment: args.commentId,
          active: true,
        })
          .populate("id_user")
          .populate("content.hashTags")
          .limit(args.limit)
          .skip(args.offset);
        return comments;
      }
    },

    suggestHashTags: async (parent, args, context) => {
      /* fetch HashTags suggestions */
      const hashtag_suggestions = await HashTags.find({
        tag: { $regex: ".*" + args.tag + ".*" },
      })
        .skip(args.skip)
        .limit(args.offset);
      for (let i = 0; i < hashtag_suggestions.length; i++) {
        // check if the user is following the hashTag
        const check = await FollowHashTags.findOne({
          id_user: context.decoded.obj._id,
          id_hashTag: hashtag_suggestions[i]._id,
        });
        if (check) hashtag_suggestions[i].user_follow = true;
        else hashtag_suggestions[i].user_follow = false;
      }
      return hashtag_suggestions;

      // TODO here
      /*const hashtag_suggestion = await HashTags.aggregate([
        { $match: { tag: { $regex: ".*" + args.tag + ".*" } } },
        {
          $lookup: {
            from: "followhashtags",
            // localField: "_id",
            // foreignField: "id_hashTag",
            as: "follow",
            let: { id: "$id_hashTag" },
            pipeline: [
              {
                $filter: {
                  $input: "$follow",
                  as :"ff",cond:{
                    $and: [
                      { $eq: ["$id", "$HashTags._id"] },
                      {
                        $eq: [
                          "$id",
                          mongoose.Types.ObjectId(context.decoded.obj._id),
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        //{ $unwind: "$follow" },
        //{$filter:{input:'$follow',as:"follower",cond:{$eq:["$$follower.id_user",1]}}},
        //{$match:{'follow.id_user':context.decoded.obj._id}},
        {
          $facet: {
            hashtag_suggestion: [
              { $skip: args.offset },
              { $limit: args.limit },
            ],
          },
        },
      ]);*/
    },

    deletePosts: async (parent, args, context) => {
      /* check if user is allowed to delete the post */
      const post = await Posts.findOne({
        _id: args.postId,
        owner: context.decoded.obj._id,
      });

      if (post) {
        console.log("-----------", post);
        post.active = false;
        await Posts.updateMany({ parentId: args.postId }, { parentId: null });
        await post.save();
        await axios.post(
          `${config.auth_service_url}api/user/profilCountServices`,
          {
            type: "posts_count",
            user_id: context.decoded.obj.user_id,
            step: -1,
          }
        );
        return "post deleted";
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },

    suggestUserForTags: async (parent, args, context) => {
        const followingList = await axios.get(
          `${
            config.auth_service_url
          }api/friendRequest/find?from_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=following`
        );
        let myFollowing = followingList.data.data.map((m) => m.to_user_id);

        const blockingList = await axios.get(
          `${
            config.auth_service_url
          }api/friendRequest/find?from_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=blocking`
        );
        const blockedList = await axios.get(
          `${config.auth_service_url}api/friendRequest/find?to_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=blocking`
        );

        let myBlocking = blockingList.data.data.map((m) => m.to_user_id);
        let myBlocked = blockedList.data.data.map((m) => m.from_user_id);

        blocklist = [...myBlocking, ...myBlocked];
      const users = await User.find({
        user_id: { $nin: blocklist },
        username: { $regex: ".*" + args.user_name + ".*" },
        $or: [
          { profilVisibility: "public" },
          { user_id: { $in: myFollowing } },
        ],
      })
        .limit(args.limit)
        .skip(args.offset);
      return users;
    },

    updateViewsCounter: async (parent, args, context) => {
      /* check if user already saw the post */
      const interaction = await Reaction.findOne({
        id_post: args.postId,
        id_user: context.decoded.obj._id,
        type: "view",
      });
      if (!interaction) {
        // create the interaction
        await Reaction.create({
          id_post: args.postId,
          id_user: context.decoded.obj._id,
          type: "view",
        });
        /* update the views counter */
        const updated_post = await Posts.findOneAndUpdate(
          { _id: args.postId },
          { $inc: { views_count: 1, wieght: 5 } }
        );
        /* send notification if the threshold is achieved */
        if (updated_post.views_count % 100 == 0)
          await axios.post(
            `${config.notif_service_url}api/notifications/sendToUser`,
            {
              from_user: context.decoded.obj._id,
              to_user: updated_post.owner,
              type: "VIEWS",
              data: {
                post: updated_post._id,
                thumbNail: updated_post.images[0],
                numberOfUsers: updated_post.views_count,
              },
            }
          );

        /* increment the views of user */
        try {
          await axios.post(
            `${config.auth_service_url}api/user/profilCountServices`,
            {
              type: "views_count",
              user_id: updated_post.user_id,
              step: 1,
            }
          );
        } catch (err) {
          console.log(err);
        }
      }
      return "views updated";
    },
    findPostByUserId: async (parent, args, context) => {
      const limit = args.limit ? args.limit : 10;
      /* check if the user is the owner */
      let check = context.decoded.obj.user_id == Number(args.userId) ? true : false;
      let posts = [];

      if (check) {
        if (args.filter == "top") {
          console.log("------------- top ", context.decoded.obj._id);
          posts = await Posts.find({
            user_id: args.userId,
            active: true,
            type: "post",
          })
            .populate("owner")
            .populate({ path: "parentId", populate: { path: "owner" } })
            .limit(limit)
            .skip(args.offset)
            .sort([["weight", -1]]);
          console.log("posts ==============", posts);
          return posts;
        }
        posts = await Posts.find({
          user_id: args.userId,
          type: args.filter,
          active: true,
        })
          .populate("owner")
          .populate({ path: "parentId", populate: { path: "owner" } })
          .limit(limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);

        if (args.filter == "support") {
          //fetch the support list only 5
          for (let i = 0; i < posts.length; i++) {
            let obj = JSON.parse(JSON.stringify(posts[i]));
            if (posts[i].parentId == null) continue;
            let supported_list = await Reaction.find(
              {
                id_post: posts[i].parentId._id,
                type: "support",
                isAnonymous: false,
              },
              "-_id id_user"
            )
              .populate("id_user")
              .limit(5);
              console.log(posts[i].parentId._id);
            obj.support_list = supported_list.map(({ id_user }) => id_user);
            posts[i] = obj;
          }
        }
        return posts;
      } else {
        /* get the desired user mongo id */
        if (args.filter == "top") {
          console.log("------------- top ", context.decoded.obj._id);
          posts = await Posts.find({
            user_id: args.userId,
            active: true,
            postAnonymosly: false,
            type: "post",
          })
            .populate("owner")
            .populate({ path: "parentId", populate: { path: "owner" } })
            .limit(limit)
            .skip(args.offset)
            .sort([["weight", -1]]);

          return posts;
        }
        posts = await Posts.find({
          user_id: args.userId,
          postAnonymosly: false,
          type: args.filter,
          active: true,
        })
          .populate("owner")
          .populate({ path: "parentId", populate: { path: "owner" } })
          .limit(limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);

        if (args.filter == "support") {
          //fetch the support list only 5

          for (let i = 0; i < posts.length; i++) {
            let obj = JSON.parse(JSON.stringify(posts[i]));
            if (posts[i].parentId == null) continue;
            let supported_list = await Reaction.find(
              {
                id_post: posts[i].parentId._id,
                type: "support",
                isAnonymous: false,
              },
              "-_id id_user"
            )
              .populate("id_user")
              .limit(5);

            obj.support_list = supported_list.map(({ id_user }) => id_user);
            posts[i] = obj;
          }
        }
      }
      return posts;
    },
    suggestTags: async (parent, args, context) => {
      /* remove the # from the begining of the string */
      args.Tag = args.Tag.substr(1, args.Tag.length);
      /* suggest tags from user input */
      const regex = new RegExp(args.Tag, "i");
      const suggest = await HashTags.find({ tag: regex });
      return suggest;
    },

    followHashTag: async (parent, args, context) => {
      /* check if the user follow the hashTag */
      const check = await FollowHashTags.findOne({
        id_user: context.decoded.obj._id,
        id_hashTag: args.hashTagId,
      });
      if (check)
        /*remove the follow */
        await FollowHashTags.delteOne({ _id: check._id });
      /*add a follow */ else
        await FollowHashTags.create({
          id_user: context.decoded.obj._id,
          id_hashTag: args.hashTagId,
        });
      return "follow updated";
    },

    fetchReactionDetails: async (parent, args, context) => {

      // verif relation
      const relationList = await axios.get(
        `${
          config.auth_service_url
        }api/friendRequest/find?from_user_id=${Number(
          context.decoded.obj.user_id
        )}`
      );

      let myRelations = [];
      relationList.data.data.forEach((relation) => {
        if (relation.following_status !== null) myRelations.push(relation.to_user_id);
      });

      // push my id with my list of relation
      myRelations.push(context.decoded.obj.user_id);

      // fetch the details of the desired post
      let interactions = await Reaction.find({
        type: args.reactionType,
        id_post: args.postId,
      }).populate("id_user");

      //
      interactions.map(interaction => {
        const check = myRelations.includes(
          Number(interaction.id_user.user_id )
        );
        if (check){
          interaction.user_friends_with = true
        } else {
          interaction.user_friends_with = false
        }
      })

      console.log(interactions);
      return interactions;
    },

    fetchPostsTags: async (parent, args, context) => {
      if (args.filter == "recent") {
        //get posts with the hashtag mentined with the hashtag sorted
        const posts = await Posts.find()
          .populate({ path: "hashTags", match: { _id: args.tag_id } })
          .sort([["updatedAt", -1]])
          .skip(args.skip)
          .limit(args.offset);
        return posts;
      } else {
        const posts = await Posts.find()
          .populate({ path: "hashTags", match: { _id: args.tag_id } })
          .sort([["weight", -1]])
          .skip(args.skip)
          .limit(args.offset);
        return posts;
      }
    },
    fetchReports: async (parent, args, context) => {
      // const reportedPosts = await reportSchema.find({ user_id : context.decoded.obj.user_id.toString() })

      const fetchReports = await reportSchema
        .find({})
        .limit(args.limit)
        .skip(args.offset)
        .sort([["createdAt", -1]]);
      return fetchReports;
    },

    //fetch user by userName
    fetchUserByUserName : async (parent, args, context) => {
      const user = await User.findOne({ username : args.username});
      return user
     },

    suggestLocation: async (parent, args, context) => {
      return await locationSuggestion
        .find({})
        .sort({ post_counts: -1 })
        .limit(args.limit)
        .skip(args.offset);
    },

    timeline: async (parent, args, context) => {
      try {
        const followingList = await axios.get(
          `${
            config.auth_service_url
          }api/friendRequest/find?from_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=following`
        );
        let myFollowing = followingList.data.data.map((m) => m.to_user_id);

        const blockingList = await axios.get(
          `${
            config.auth_service_url
          }api/friendRequest/find?from_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=blocking`
        );
        const blockedList = await axios.get(
          `${config.auth_service_url}api/friendRequest/find?to_user_id=${Number(
            context.decoded.obj.user_id
          )}&following_status=blocking`
        );

        let myBlocking = blockingList.data.data.map((m) => m.to_user_id);
        let myBlocked = blockedList.data.data.map((m) => m.from_user_id);

        blocklist = [...myBlocking, ...myBlocked];
        console.log("****************", blocklist);

        if (
          context.decoded.obj.interestsId == null ||
          JSON.parse(context.decoded.obj.interestsId).length == 0
        ) {
          // if interests doesnt exist fetch with location
          var fetchPosts = await postsSchema
            .find({
              $and: [
                { active: true },
                {
                  $or: [
                    // public posts && not blocked
                    {
                      $and: [
                        { user_id: { $nin: blocklist } },
                        { visibility: 0 },
                      ],
                    },
                    // fetch posts from location
                    {
                      $and: [
                        {
                          specificLocation: {
                            $elemMatch: {
                              country: context.decoded.obj.country,
                            },
                          },
                        },
                        { visibility: 2 },
                        { user_id: { $nin: blocklist } },
                      ],
                    },
                    // fetch posts from my following list
                    {
                      $and: [
                        {
                          user_id: { $in: myFollowing },
                        },
                        { visibility: 1 },
                      ],
                    },
                  ],
                },
              ],
            })
            .populate("owner")
            .populate("tags")
            .populate("hashTags")
            .populate({ path: "parentId", populate: { path: "owner" } })
            .limit(args.limit)
            .skip(args.offset)
            .sort([["createdAt", -1]]);
        } else {
          // if interests exist fetch them without location
          var fetchPosts = await postsSchema
            .find({
              $and: [
                { active: true },
                {
                  $or: [
                    // public posts && not blocked && interests
                    {
                      $and: [
                        { user_id: { $nin: blocklist } },
                        { visibility: 0 },
                        {
                          interests: {
                            $elemMatch: {
                              $in: JSON.parse(context.decoded.obj.interestsId),
                            },
                          },
                        },
                      ],
                    },
                    // fetch posts from my following list
                    {
                      $and: [
                        {
                          user_id: { $in: myFollowing },
                        },
                        { visibility: 1 },
                      ],
                    },
                  ],
                },
              ],
            })
            .populate("owner")
            .populate("tags")
            .populate("hashTags")
            .populate("parentId")
            .limit(args.limit)
            .skip(args.offset)
            .sort([["createdAt", -1]]);
        }

        // after sort by newest, here we sort the result by weight
        fetchPosts.sort(function (a, b) {
          let keyA = a.weight,
            keyB = b.weight;
          // Compare the 2 dates
          if (keyA < keyB) return 1;
          if (keyA > keyB) return -1;
          return 0;
        });

        //
        const relationList = await axios.get(
          `${
            config.auth_service_url
          }api/friendRequest/find?from_user_id=${Number(
            context.decoded.obj.user_id
          )}`
        );

        let myRelations = [];
        relationList.data.data.forEach((m) => {
          if (m.following_status !== null) myRelations.push(m.to_user_id);
        });

        // push my id with my list of relation
        myRelations.push(context.decoded.obj.user_id);

        for (let i = 0; i < fetchPosts.length; i++) {
          // check if the user liked the post
          const found_reaction = await Reaction.distinct("type", {
            id_post: fetchPosts[i]._id,
            id_user: context.decoded.obj._id,
          });
          let reactions = [];
          for (let i = 0; i < found_reaction.length; i++)
            reactions.push(found_reaction[i]);
          fetchPosts[i].user_reaction = reactions;
          // check if relation exist
          const check = myRelations.includes(
            Number(fetchPosts[i].owner.user_id)
          );
          if (check) fetchPosts[i].user_friends_with = true;
          else fetchPosts[i].user_friends_with = false;
        }
        return fetchPosts;
      } catch (err) {
        console.log("err timeline :", err);
      }
    },
  },
};
