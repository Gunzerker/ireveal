const mongoose = require ("mongoose")
const locationSuggestion = require("../../models/Location_suggestions")

mongoose
.connect("mongodb://161.35.202.17​7:27017/sb-ireveal", {
  auth: { authSource: "admin" },
  user: "digitu",
  pass: "Flatdev22*",
  useUnifiedTopology: true,
  useNewUrlParser: true,
})
.then(async () => {
  console.log("mongodb connected");
  locationSuggestion.findOneAndUpdate(
    {
      country: "FR",
      city: "France",
      address: "Paris",
      long: "54.1231584",
      lat: "14.22",
    },
    { $inc: { post_counts: 1 } },
    { new: true, upsert: true, useFindAndModify: false }
  ).then((data)=> console.log(data)).catch((err)=> console.log(err))
});

