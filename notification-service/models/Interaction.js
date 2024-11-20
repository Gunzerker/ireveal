const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const clubsSchema = new Schema(
  {
    id_user: { type: Schema.Types.ObjectId, ref: "users" },
    id_post: { type: Schema.Types.ObjectId, ref: "posts" },
    type: { type: String, enum:["up","down","support","view"]},
    isAnonymous : {type:Boolean , default:false}
  },
  { timestamps: true }
);

module.exports=mongoose.model('interaction',clubsSchema);
