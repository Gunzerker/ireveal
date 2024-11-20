module.exports = `
  type Mutation {

    "hide a post"
    hidePost(
      postId: ID
      "always : true if the post is hidden permantly else always:false"
      always: Boolean
    ): String
   }
`;
