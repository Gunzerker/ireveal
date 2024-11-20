const { createServer } = require ("http");
const express = require ("express");
const { ApolloServer , gql } = require ("apollo-server-express");
const mongoose = require("mongoose");
const config = require("./config/config.json")
const jwt = require('jsonwebtoken');
const { ApolloError } = require ('apollo-server-errors');
var bodyParser = require("body-parser");
const nsfw = require("./functions/nsfw_filter")
const Posts = require("./models/Posts")

//schema
const schema = require("./graphql/schema/schema.js");

//resolver
const resolver = require("./graphql/resolvers/resolvers.js")


const PORT = process.env.PORT || 6008;

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

app.post('/check', async function(req, res) {
  const { post_id, urls, file_name } = req.body;
  //pass the url to check functions
  let promise_array = []
  for(let i=0 ; i<urls.length;i++)
    promise_array.push(nsfw(urls[i]));
  let promise_result = await Promise.all(promise_array)
  for(let i=0 ; i<promise_result.length ; i++){
    //update database
     await Posts.findOneAndUpdate(
       {
         _id: post_id,
         "images.file_name": file_name[i],
       },
       {
         $set: {
           "images.$.sensitive": promise_result[i],
         },
       },
       { useFindAndModify: true }
     );
  }
  return res.json({status:"done"})

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
});