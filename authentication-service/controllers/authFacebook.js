const models = require("../models/db_init");
const UserModel = models["users"];

const forgetPasswordModel = models["forgetPassword"]
const config = require('../config/config.json');
const passport = require('passport');
var geoip = require('geoip-lite');

const { hashPassword, isValidEmail, comparePassword, generateToken } = require('../helpers/validate');

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

class authFacebookController extends ApiBaseController {
    constructor() {
        super();
        // this.entity_model = ;
        // this.entity_id_name = "; 
    }

    async loginFacebook(req, res) {
        try {
            // email du compte facebook
            console.log("email du compte facebook", req.user.emails[0].value);

            if (!isValidEmail(email)) {
                return res.status(400).send({
                    status: false,
                    message: "Global.PleaseEnterEntityData.BadEmail",
                    data: null
                });
            }

            // check if email exists
            const check = await UserModel.findOne({
                where: {
                    email: req.user.emails[0].value
                }
            })
            // To be continued...
            if (!check) {
            console.log("create user!!!");
            }

            res.render('pages/profile.ejs', {
                user: req.user // get the user out of session and pass to template
            });

        } catch (err) {
            console.log("error signup facebook :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })

        }

    }

}

module.exports = authFacebookController;
