const { createServer } = require ("http");
const express = require ("express");
const { ApolloServer , gql } = require ("apollo-server-express");
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require("mongoose");
const config = require("./config/config.json")
const jwt = require('jsonwebtoken');
const { ApolloError } = require ('apollo-server-errors');
const AWS = require("aws-sdk");
const User = require("./models/Users");
const Posts = require("./models/Posts");
const Reaction = require("./models/Interaction");
const fs = require ("fs")
const schemas = require("./graphql/schema/schemas.js");
const resolver = require("./graphql/resolvers/resolvers.js")

AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}))
// app.use( graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }))

async function getFromS3 (key) {
  return new Promise (async(resolve,reject) => {
      try {
        if(fs.existsSync(`./asset/${key}`))
          return resolve("finish");

        let params = { Bucket: "digit-u-media-resources", Key: "" };
        params.Key = key;

        s3.headObject(params , function (err , metadata) {
          if (err)
            return reject("not_found")
            let file = fs.createWriteStream(`./asset/${params.Key}`);
            let s3_file = s3.getObject(params);
            let object = s3_file.createReadStream();
            let stream = object.pipe(file);
            stream.on("finish", () => {
              return resolve("finish");
            });
        });
    } catch(err) {
      return reject(err)
    }
  })
}

app.get('/video/:filename', async function(req, res) {
  try {
    await getFromS3(req.params.filename);
    const path = `./asset/${req.params.filename}`;
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      const chunksize = (end-start) + 1
      const file = fs.createReadStream(path, {start, end})

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }

      res.writeHead(206, head);
      file.pipe(res);

    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, head);
      fs.createReadStream(path).pipe(res);
    }
  } catch(err) {
    console.log("err", err);

    if (err === "not_found") {
      return res.status(404).json({
        status: false,
        message: "API.FILE_NOT_FOUND",
        data: null,
      });
    }

    return res.status(500).json({
      status: false,
      message: "API.INTERNAL_SERVER_ERROR",
      data: null,
    });
  }
});

app.get("/post/:id", async function (req, res) {
  /* verfiy the token */
  try {
    const token = req.headers.authorization || "";
    if (token == "")
      //throw new APIError({code:401,message:'Unauthaurized'})
      throw new Error("Unauthorized", 401, {
        code: 401,
        message: "Unauthorized",
      });
    const decoded = jwt.verify(token, config.secret_jwt);
    if (decoded) {
      // find the user in the mongoDB
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id;
      else {
        decoded.obj._id = null;
        decoded.obj.isAnonymous = true;
      }
    }
    // fetch the post
    const required_post = await Posts.findById(req.params.id)
      .populate("owner")
      .populate("hashTags")
      .populate("tags");
    // handle the reaction
      
      const found_reaction = await Reaction.find({ id_post: req.params.id });

      let reactions = [];
      for (let i = 0; i < found_reaction.length; i++)
        reactions.push(found_reaction[i].type);
      if (reactions.length != 0) required_post.user_reaction = reactions;
    if (required_post.visibility == 0)
      return res.status(200).json({
        success: true,
        message: "API.POST-FETCHED",
        data: required_post,
      });
    // check if the user is friends with
    const friends_lists = await axios.get(
      `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.id}&following_status=following`
    );
    const fetched_friend_list = friends_lists.data.data;
    let friends_ids = [];
    for (let i = 0; i < fetched_friend_list.length; i++)
      friends_ids.push(fetched_friend_list[i].to_user.user_id);
    // check if the owner id exists in the array
    if (friends_ids.includes(decoded.obj.user_id))
      return res.status(200).json({
        success: true,
        message: "API.POST-FETCHED",
        data: required_post,
      });
    return res.status(200).json({
      success: true,
      message: "API.POST-UNAVAILABLE",
      data: null,
    });
  } catch (err) {
    return res.json(err);
  }
});


const apollo = new ApolloServer({
  typeDefs: schemas,
  resolvers: resolver,
  subscriptions: {
    onConnect: (connectionParams, webSocket, connectionContext) => {},
  },
  formatError: (err) => ({
    code: err.extensions.code,
    message: err.extensions.message,
    details: err.message,
  }),
  context: async ({ req, connection }) => {
    if (connection) {
      return { user: "loged in" };
    }
    // Note: This example uses the `req` argument to access headers,
    // but the arguments received by `context` vary by integration.
    // This means they vary for Express, Koa, Lambda, etc.
    //
    // To find out the correct arguments for a specific integration,
    // see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#middleware-specific-context-fields

    // Get the user token from the headers.
    const token = req.headers.authorization || "";
    if (token == "")
      //throw new APIError({code:401,message:'Unauthaurized'})
      throw new ApolloError("Unauthorized", 401, {
        code: 401,
        message: "Unauthorized",
      });
    const decoded = jwt.verify(token, config.secret_jwt);
    if (decoded) {
      // find the user in the mongoDB
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id;
      else {
        decoded.obj._id = null;
        decoded.obj.isAnonymous = true;
      }
      return { decoded };
    }
    throw new ApolloError("Unauthorized", 401, {
      code: 401,
      message: "Unauthorized",
    });
  },
});

apollo.applyMiddleware({ app });

const httpServer = createServer(app);

apollo.installSubscriptionHandlers(httpServer);
const PORT = (process.env.PORT || 6001)

httpServer.listen({ port:PORT  }, () => {
    mongoose
      .connect("mongodb://161.35.202.17​7:27017/ireveal", {
        auth: { authSource: "admin" },
        user: "digitu",
        pass: "Flatdev22*",
        useUnifiedTopology: true,
        useNewUrlParser: true,
      })
      .then(async () => {
        console.log("mongodb connected");
      });
  console.log(`server ready at http://localhost:${PORT}${apollo.graphqlPath}`);
  console.log(
    `Subscriptions ready at ws://localhost:${PORT}${apollo.subscriptionsPath}`
  );
});