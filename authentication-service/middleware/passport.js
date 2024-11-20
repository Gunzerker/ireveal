const models = require("../models/db_init");
const UserModel = models["users"];
const validate = require("../helpers/validate");
const passport = require('passport');
const LocalStrategy = require('passport-local');


passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
}, (email, password, done) => {
    UserModel.findOne({
        where: { email }
    })
        .then((user) => {
            if (!user ){
                return done(null, false, 'FAILED.FETCH.ACCOUNT' );
            }
            if ( !validate.comparePassword(password, user.password)) {
                return done(null, false, 'email or password : is invalid' );
            }
            return done(null, user);
        }).catch(done);
}));
