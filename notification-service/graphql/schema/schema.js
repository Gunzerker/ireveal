const { ApolloServer, gql } = require("apollo-server-express");

module.exports = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.

  
  type Query {
    uploads: [String]
    fetcheSavedPosts: [String]
  }

  type Mutation {
    find(name:String):String
  }
`;
