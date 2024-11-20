const { gql } = require("apollo-server-express");

module.exports = gql`
  type File {
    _id: ID
    file_name: String
    order: Int
    thumbnail: String
    video_duration: Float
    sound: Boolean
    sensitive:Boolean
  }

  type Likes {
    _id: ID!
    user_id: String
    fullname: String
    profile_image: String
    gender: String
  }

  type CommentsComments {
    _id: String
    user_id: String
    fullname: String
    comment: String
    profile_image: String
    gender: String
    likes: [Likes]
    comments_likes_total: Int
  }

  input hashTagInput {
    "the tag either takes the _id found by the webservice or the new tag to create without the #"
    tag: String
    found: Boolean
  }

  type hashTagType {
    _id: ID
    tag: String
    posts_counter: Int
    user_follow: Boolean
  }

  type contentType {
    text: String
    tags: [String]
    hashTags: [hashTagType]
  }

  type Comments {
    _id: ID
    id_user: ownerType
    id_post: String
    content: contentType
    childsCount: Int
    main_comment: String
  }

  type Media {
    image: [String]
    video: [String]
  }

  type ownerType {
    _id: ID!
    user_id: String
    email: String
    username: String
    fullName: String
    gender: String
    profilVisibility: String
    profile_image: String
    profile_cover: String
    address: String
    country: String
    state: String
    longitude: String
    latitude: String
    profilLink: String
    "interestsId is a string cause its passed as form-data that contains an array of intergers : [4,5,6]"
    interestsId: String
    active: String
  }

  type imageType {
    _id: ID
    url: String
  }

  type videoType {
    _id: ID
    url: String
  }

  type mediaType {
    images: [File]
    videos: [File]
  }

  type PostCreated {
    _id: ID!
    owner: ownerType
    type: String
    description: String
    images: [File]
    videos: [File]
    visibility: Int
    category: String
    createdAt: String
    updatedAt: String
    post_likes: [Likes]
    post_comments: [Comments]
    post_likes_total: Int
    post_comments_total: Int
    post_views_total: Int
    post_parent_id: ID
  }

  type ReferencedPost {
    _id: ID!
    owner: ownerType
    title: String
    type: String
    description: String
    tags: [ownerType]
    hashTags: [hashTagType]
    images: [File]
    videos: [File]
    visibility: Int
    sensitiveContent: Boolean
    allowInteratction: Boolean
    allowComment: Boolean
    postAnonymosly: Boolean
    alert: Boolean
    whistleBlowing: Boolean
    createdAt: String
    updatedAt: String
    upVote_count: Int
    downVote_count: Int
    supporter_count: Int
    share_count: Int
    views_count: Int
    "null if no reaction else the type of reaction (up,down,support)"
    user_reaction: [String]
    location: [LocationType]
  }

  type LocationType {
    _id: ID
    country: String
    city: String
    address: String
    long: String
    lat: String
  }

  type ReactionFetch {
    id_user: ownerType
    id_post: String
    type: String
    isAnonymous: Boolean
    user_friends_with: Boolean
    post_counts:Int
  }

  type FetchedPost {
    _id: ID!
    owner: ownerType
    user_id: String
    title: String
    type: String
    description: String
    tags: [ownerType]
    hashTags: [hashTagType]
    images: [File]
    videos: [File]
    visibility: Int
    sensitiveContent: Boolean
    allowInteratction: Boolean
    allowComment: Boolean
    postAnonymosly: Boolean
    alert: Boolean
    whistleBlowing: Boolean
    createdAt: String
    updatedAt: String
    upVote_count: Int
    downVote_count: Int
    supporter_count: Int
    share_count: Int
    views_count: Int
    parentId: ReferencedPost
    "user_reaction is null if no reaction else array of reaction [up,down,support]"
    user_reaction: [String]
    location: [LocationType]
    "user friends with"
    user_friends_with: Boolean
    weight: Int
    interests: [Int]
    specificLocation: [LocationType]
    support_list: [ownerType]
    sound: Boolean
  }

  type UserStats {
    _id: ID
    totalPosts: Int
    totalLikes: Int
    totalViews: Int
  }

  type TagResult {
    _id: ID
    tag: String
  }

  #signal posts
  type SignalType {
    _id: ID!
    user_id: String
    post_id: String
    createdAt: String
    updatedAt: String
  }

  #create motif signal
  type SignalMotifType {
    _id: ID!
    tag_type: String
    parentId: String
    active: Boolean
    createdAt: String
    updatedAt: String
  }

  type interestType {
    Interest_id: Int
    InterestName: String
    interestImageUrl: String
    active: String
    language: String
  }

  input SignalInput {
    user_id: String
    post_id: String
  }

  input SignalMotifInput {
    tag_type: String
    parentId: String
  }

  #signal posts

  input fileUpload {
    file: Upload
    order: Int
  }

  input mediaInput {
    image: [String]
    video: [String]
  }

  input PostInput {
    type: String
    media: mediaInput
  }

  input TagsInput {
    user_id: Int
    image_url: String
    tag: String
  }

  input FileInput {
    file_name: String
    order: Int!
  }

  input PostUpdate {
    media: mediaInput
    description: String
    visibility: Int
    category: String
  }

  input LocationInput {
    country: String
    city: String
    address: String
    long: String
    lat: String
  }

  input interestInput {
    Interest_id: Int
    InterestName: String
    interestImageUrl: String
    active: String
    language: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    uploads: [File]
  }

  type Mutation {
    singleUpload(file: Upload): File!

    uploadMedia("either video or image" type: String, media: Upload): File!
    "this mutation is used to create a post or share a post  "
    createPost(
      title: String!
      "types are : 'post', 'sharedPost', 'support', 'view' "
      type: String
      media: [Upload]
      "video duration if a video exists in the media and the index of the duration needs to be the same as the index of the video in the media array"
      video_duration: [Float]
      "if a video have a sound pass true else pass false, it needs to be the same as the index of the video in the media array"
      sound: [Boolean]
      description: String
      "pass the _id of the suggested user"
      tags: [String]
      hashTags: [String]
      " visibility can take value 0:public , 1:friends only , 2 location only "
      visibility: Int!
      allowInteratction: Boolean
      allowComment: Boolean
      postAnonymosly: Boolean
      alert: Boolean
      whistleBlowing: Boolean
      sensitiveContent: Boolean
      location: [LocationInput]
      parentId: String
      specificLocation: [LocationInput]!
    ): FetchedPost
    "external share posts"
    externalShare(postId: String): String
    " discover posts "
    discoverPosts(
      limit: Int!
      "offset starts from 0"
      offset: Int!
    ): [FetchedPost]
    " updated a post created by the user"
    updatePost(
      postId: ID!
      title: String!
      "types are : 'post', 'sharedPost', 'support'"
      type: String
      description: String
      tags: [String]
      hashTags: [hashTagInput]!
      " visibility can take value 0:public , 1:friends only , 2 location only "
      visibility: Int!
      allowInteratction: Boolean
      allowComment: Boolean
      postAnonymosly: Boolean
      alert: Boolean
      whistleBlowing: Boolean
      sensitiveContent: Boolean
      location: [LocationInput]
      sound: [Boolean]
    ): FetchedPost
    " fetch a post by its id "
    findPostById(postId: ID!): FetchedPost
    " fetch the passed user id posts"
    findPostByUserId(
      userId: ID!
      limit: Int!
      "pages starts from 0"
      offset: Int!
      "post , support , top"
      filter: String
    ): [FetchedPost]
    " like a post"
    postReact(postId: ID!, "up , down" type: String): String
    " comment a post"
    commentPost(
      postId: ID!
      comment: String
      tags: [String]
      hashTags: [String]
    ): Comments
    " comment a comment "
    commentAComment(
      postId: ID!
      commentId: ID!
      comment: String
      tags: [String]
      hashTags: [String]
    ): Comments
    "update a comment or comment comment"
    updateComment(
      "or comment comment id"
      commentId: String
      text: String
      tags: [String]
      hashTags: [hashTagInput]
    ): String
    "delete a comment or comment comment"
    deleteComment("or comment comment id" commentId: String): String
    "fetch comments of a post or of a comment"
    fetchComments(
      "either a postId or commentId"
      postId: String
      commentId: String
      limit: Int
      offset: Int
    ): [Comments]

    " follow hashTag will be used for both follow and unfollow"
    followHashTag(hashTagId: ID): String

    " delete a post"
    deletePosts(postId: ID!): String
    " update the views count of a post"
    updateViewsCounter(postId: ID!): String
    "fetch users for suggestion"
    suggestUserForTags(user_name: String, limit: Int, offset: Int): [ownerType]
    " suggest tags"
    suggestTags(Tag: String): [TagResult]
    "suggest hashtags"
    suggestHashTags(tag: String, limit: Int, offset: Int): [hashTagType]
    "fetch posts related with hashTags"
    fetchPostsTags(
      tag_id: ID
      "recent or trending"
      filter: String
      limit: Int
      offset: Int
    ): [FetchedPost]

    "create signal post with : user_id from token and post_id"
    report(signalInput: SignalInput): SignalType

    "create signal motif with children if exists "
    reportMotif(signalMotifInput: SignalMotifInput): SignalMotifType

    "fetch reports with limits and offset"
    fetchReports(limit: Int, offset: Int): [SignalType]

    "fetch reports motif with limits and offset"
    fetchReportsMotif(limit: Int, offset: Int): [SignalMotifType]

    "fetch posts for timeline"
    timeline(limit: Int, offset: Int): [FetchedPost]

    "fetch post reaction details"
    fetchReactionDetails(
      postId: String
      "up,down,support,view"
      reactionType: String
      limit: Int
      offset: Int
    ): [ReactionFetch]

    "suggestion location"
    suggestLocation(limit: Int, offset: Int): [LocationType]

    "fetch user by username"
    fetchUserByUserName(username: String): ownerType
  }
`;
