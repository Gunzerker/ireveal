/*const { ApolloError } = require ('apollo-server-errors');

class APIError extends ApolloError {
    constructor({ code, message }) {
      const fullMsg = `${code}: ${message}`;
      super(fullMsg);
      this.code = code;
      this.message = message;
    }
  }
  
module.exports=APIError;*/
const nsfw = require("../functions/nsfw_filter")
  nsfw(
    `https://digit-u-media-resources.s3.eu-central-1.amazonaws.com/ff703b73-ef65-475a-ae69-515dac9dce1f.jpeg`
  ).then((result)=> console.log(result))