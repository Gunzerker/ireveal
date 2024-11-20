const { createServer } = require ("http");
const express = require ("express");
const { ApolloServer , gql } = require ("apollo-server-express");
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require("mongoose");
const config = require("./config/config.json")
const jwt = require('jsonwebtoken');
const { ApolloError } = require ('apollo-server-errors');
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const sync = require ("./controllers/updater");
const syncInst = new sync();
const Users = require ("./models/Users")
var bodyParser = require("body-parser");


const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const fs = require ("fs")
var Pusher = require("pusher-client");
 /*appId: config.pusher_appId,
  key: config.pusher_key,
  secret: config.pusher_secret,
  cluster: config.pusher_cluster,
  useTLS: config.pusher_useTLS,*/
const pusher = new Pusher(config.pusher_key, {
  cluster: config.pusher_cluster,
});


//schema
const schema = require("./graphql/schema/schema.js");

//resolver
const resolver = require("./graphql/resolvers/resolvers.js")


const PORT = process.env.PORT || 6005;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}))
app.use(bodyParser.urlencoded({
  extended: true
}));
// parse application/json
app.use(bodyParser.json());
//app.use( graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }))

const apollo = new ApolloServer({
  typeDefs: schema,
  resolvers: resolver,
  subscriptions:{
    onConnect:(connectionParams, webSocket , connectionContext)=>{
    }
  },
  formatError: (err) => ({
    code:err.extensions.code,message:err.extensions.message,details:err.message
  }),
  context: ({ req , connection }) => {
    if(connection){
      return {user:"loged in"}
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
     throw new ApolloError('Unauthorized', 401, {code:401,message:"Unauthorized"});
     const decoded = jwt.verify(token,config.secret_jwt)
    if(decoded)
    return {decoded}
    throw new ApolloError('Unauthorized', 401, {});
  },
});


apollo.applyMiddleware({ app });

const httpServer = createServer(app);

apollo.installSubscriptionHandlers(httpServer);

//mongoose.connect('mongodb://username:password@host:port/database');

app.post('/syncMongo', async function(req, res) {
  // create the user if it's new
  console.log(req.body)
  if (req.body.status == "new"){
    req.body.data.user_id = String(req.body.data.user_id)
    req.body.data.profilVisibility = req.body.data.profileVisibility;
    const created_user = await Users.create(req.body.data);
    console.log(created_user)
    return res.status(200).json("done")
  }else{
        req.body.data.profilVisibility = req.body.data.profileVisibility;
        await Users.findOneAndUpdate(
          { user_id: req.body.data.user_id },
          req.body.data,
          { new: true, upsert: true, useFindAndModify :false}
        );
        return res.status(200).json("done");
  }
})

httpServer.listen({ port: PORT }, () => {
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
  // call the sync to test it
  //handle the inc notification

  const channel = pusher.subscribe("user-data-sync");
  channel.bind("update-user",async (data) => {
    // call a function that updates every user_data where it exists
    // needs to update the user token when he updates the profile
    // data to expect id , fullname , profile_image , location , verified
    await syncInst.syncData(data);
  })
  channel.bind("update-user-visibility",async (data)=> {
    await syncInst.syncVisibility(data);
  } )
});