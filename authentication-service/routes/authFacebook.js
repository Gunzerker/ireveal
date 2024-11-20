const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const passport = require('passport');


const authFacebookController = require("../controllers/authFacebook");
const authFacebookControllerInst = new authFacebookController();

router.get('/', function (req, res) {
    res.render('pages/index.ejs'); // load the index.ejs file
});

router.get('/profile', isLoggedIn, function (req, res) {
    authFacebookControllerInst.loginFacebook(req, res);
    // res.render('pages/profile.ejs', {
    //     user: req.user // get the user out of session and pass to template
    // });
});

router.get('/error', isLoggedIn, function (req, res) {
    res.render('pages/error.ejs');
});

router.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['public_profile', 'email']
}));

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect: '/api/authFacebook/profile',
        failureRedirect: '/api/authFacebook/error'
    }), (req, res) => {
        return res.json({})
    });

router.get('/logout', function (req, res) {
    console.log("logout");
    req.logout();
    res.redirect('/api/authFacebook/');
});

function isLoggedIn(req, res, next) {
    console.log("7777",req.isAuthenticated());
    if (req.isAuthenticated())
        return next();
    res.redirect('/api/authFacebook');
}

module.exports = router;
