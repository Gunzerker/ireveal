const express = require("express");
const router = express.Router();
const userRoutes = require("./user");
const interestRoutes = require("./interest");
const friendRequestRoutes = require("./friendRequest")
const reportTypeRoutes = require("./reportType");
const reportRoutes = require("./report");
const userUpdateRoutes = require("./userUpdate");
const facebookAuthRoutes = require("./authFacebook");

const passport = require('passport');


require('../middleware/passport');

router.get('/auth/facebook', passport.authenticate('facebook', {
  scope: ['public_profile', 'email']
}));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/error'
  }),(req,res)=>{
    console.log("44444");
    return res.json({})
  });

//   router.get('/auth/facebook/callback',((req,res)=>{
//   console.log(req.query)
//   return res.json({})
// }))

router.use("/api/user", userRoutes);
router.use("/api/interest", interestRoutes);
router.use("/api/friendRequest", friendRequestRoutes);
router.use("/api/reportType", reportTypeRoutes);
router.use("/api/report", reportRoutes);
router.use("/api/userUpdate", userUpdateRoutes);
router.use("/api/authFacebook",facebookAuthRoutes)

router.use((req, res, next) => {
  next({
    status: 404,
  });
});



module.exports = router;