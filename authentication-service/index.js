const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require("sequelize");
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');

const config = require('./config/config.json');

const models = require("./models/db_init");
const cors = require("cors");
// require('./middleware/passport');

const app = express();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

app.set('trust proxy', true);
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET'
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

passport.use(new FacebookStrategy({
    clientID: config.facebookAuth.clientID,
    clientSecret: config.facebookAuth.clientSecret,
    callbackURL: config.facebookAuth.callbackURL,
    profileFields: config.facebookAuth.profileFields
  }, function (accessToken, refreshToken, profile, done) {
      // create user
    console.log("========================",profile._json)
    return done(null, profile);
  }
));


// app.use('/resources',express.static('resources'));

app.use(require('./routes/index'));
app.use(cors());

app.all('*', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization ,Accept');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Expose-Headers', 'Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
  });

app.listen(4040, () => {
        console.log("server has started on port 4040!!!");
    });
