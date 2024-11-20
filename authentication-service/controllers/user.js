const models = require("../models/db_init");
const UserModel = models["users"];
const interestModel = models["interest"];
const userInterestsModel = models["user_interests"]
const userUpdateModel = models["userUpdate"];
const reportModel = models["report"];
const friendRequestModel = models["friendRequest"]

const verifCodeModel = models["verifCode"];
const forgetPasswordModel = models["forgetPassword"]
const config = require('../config/config.json');
const passport = require('passport');
const formidable = require('formidable');
var geoip = require('geoip-lite');

var uid = require('rand-token').uid;
const { asyncForEach } = require('../helpers/helpers');

const { v4: uuidv4 } = require('uuid')

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");
const axios = require("axios")

const { uploadFile } = require("../functions/uploadFile");
const { sendEmail } = require("../functions/sendMail");
const { hashPassword, isValidEmail, comparePassword, generateToken } = require('../helpers/validate');
const { counterFollowers, counterFollowing, counterPosts, counterLikes, counterViews } = require("../functions/counter");

const client = require('twilio')(config.accountSid, config.authToken);

class UserController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = UserModel;
        this.entity_id_name = "user_id";
        this.list_includes = [
            {
                model: interestModel,
                through: userInterestsModel,
                as: "interests",
            },
        ]

    }

    async signupUser(req, res) {
        try {
            const { email, phone_number, country_code, socialMediaAuth, username, fullName, first_name, last_name, dateOfBirth, password, status, socialMedia_id } = req.body;
            var geo = geoip.lookup(req.ip);
            const expireTime = 3;
            const profilLink = uid(8);
            const nameExtension = uid(8);

            if (email && !socialMediaAuth) {
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
                        email: email
                    }
                })

                if (!check) {
                    const newPassword = hashPassword(password);
                    // if user doesnt exist create user
                    const user = await UserModel.create({ email, username, country: geo ? geo.country : null, state: geo ? geo.region : null, latitude: geo ? geo.ll[0] : null, longitude: geo ? geo.ll[1] : null, fullName, dateOfBirth, profilLink, password: newPassword, status: "notVerified", socialMediaAuth: false, isAnonymous: false })
                    if (user) {
                        // create verif code
                        const code = uid(4);
                        const generatedAt = Date.now();
                        const userCode = await verifCodeModel.create({ email, generatedAt, verifCode: code, user_id: user.dataValues.user_id, status: "notVerified", socialMediaAuth: false })
                        // send email with 4 confirmation digits
                        const sendMail = await sendEmail(email, code)
                        const promises = [userCode, sendMail];
                        Promise.all(promises)
                        delete user.dataValues.password
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: user.dataValues
                        });
                    }

                }

                // user exists 
                if (check.dataValues.status == "verified") {
                    console.log("verified");
                    // if user already exists
                    return res.status(400).send({
                        status: false,
                        message: "API.ENTITY.EXISTS",
                        data: null
                    });
                }

                // if user with this mail didnt complete signup
                const verifCode = await verifCodeModel.findOne({
                    where: {
                        [Op.and]: {
                            user_id: check.dataValues.user_id,
                            status: "notVerified"
                        }
                    }
                })
                if (verifCode) {
                    const newPassword = hashPassword(password);

                    const code = uid(4);
                    const generatedAt = Date.now();
                    const date = new Date(verifCode.generatedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    const now = Date.now();
                    if (now > date) {
                        const updateUser = await UserModel.update({ username, fullName, country: geo ? geo.country : null, state: geo ? geo.region : null, latitude: geo ? geo.ll[0] : null, longitude: geo ? geo.ll[1] : null, dateOfBirth, profilLink, password: newPassword, socialMediaAuth: false, isAnonymous: false }, { where: { user_id: check.dataValues.user_id }, returning: true })
                        const updateVerifCode = await verifCodeModel.update({ generatedAt, verifCode: code, socialMediaAuth: false }, { where: { user_id: check.dataValues.user_id } })
                        const sendMail = await sendEmail(email, code)
                        const promises = [updateUser, updateVerifCode, sendMail];
                        Promise.all(promises)
                        delete updateUser[1][0].dataValues.password
                        return res.status(201).send({
                            status: true,
                            message: "API.CODE.SENT",
                            data: updateUser[1][0].dataValues
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            message: "API.VERIFY.CODE.ALREADY.SENT",
                            data: null
                        });
                    }
                }


            }

            if (phone_number && country_code) {

                const check = await UserModel.findOne({
                    where: {
                        [Op.and]: {
                            phone_number, country_code
                        }
                    }
                })
                if (!check) {
                    const newPassword = hashPassword(password);
                    //check if the requested user exists
                    const user = await UserModel.create({ country_code, country: geo ? geo.country : null, state: geo ? geo.region : null, latitude: geo ? geo.ll[0] : null, longitude: geo ? geo.ll[1] : null, phone_number, username, profilLink, fullName, dateOfBirth, password: newPassword, status: "notVerified", isAnonymous: false })
                    if (user) {
                        // create verif code
                        const code = uid(4);
                        const generatedAt = Date.now();
                        const userCode = await verifCodeModel.create({ phone_number, country_code, generatedAt, verifCode: code, user_id: user.dataValues.user_id, status: "notVerified" })
                        // send sms with 4 confirmation digits
                        const sendSms = await client.messages
                            .create({
                                body: 'Use this code to signup for Ireveal : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .done();
                        const promises = [userCode, sendSms];
                        Promise.all(promises)
                        delete user.dataValues.password
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: user.dataValues
                        });
                    }
                }
                // else create the user with its firebase token
                if (check.dataValues.status == "verified") {
                    console.log("verified");
                    // if user already exists
                    return res.status(400).send({
                        status: false,
                        message: "API.ENTITY.EXISTS",
                        data: null
                    });
                }

                // if user with this mail didnt complete signup
                const verifCode = await verifCodeModel.findOne({
                    where: {
                        [Op.and]: {
                            user_id: check.dataValues.user_id,
                            status: "notVerified"
                        }
                    }
                })
                if (verifCode) {
                    const newPassword = hashPassword(password);

                    const code = uid(4);
                    const generatedAt = Date.now();
                    const date = new Date(verifCode.generatedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    const now = Date.now();
                    if (now > date) {
                        const updateUser = await UserModel.update({ username, fullName, country: geo ? geo.country : null, state: geo ? geo.region : null, latitude: geo ? geo.ll[0] : null, longitude: geo ? geo.ll[1] : null, profilLink, dateOfBirth, password: newPassword, isAnonymous: false }, { where: { user_id: check.dataValues.user_id }, returning: true })
                        const updateVerifCode = await verifCodeModel.update({ generatedAt, verifCode: code, }, { where: { user_id: check.dataValues.user_id } })
                        // send sms with 4 confirmation digits
                        const sendSms = await client.messages
                            .create({
                                body: 'Use this code to signup for Ireveal : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .done();
                        const promises = [updateUser, updateVerifCode, sendSms];
                        Promise.all(promises)
                        delete updateUser[1][0].dataValues.password
                        return res.status(201).send({
                            status: true,
                            message: "API.CODE.SENT",
                            data: updateUser[1][0].dataValues
                        });
                    } else {
                        return res.status(201).send({
                            status: true,
                            message: "API.VERIFY.CODE.ALREADY.SENT",
                            data: null
                        });
                    }
                }


            }

            if (email && socialMediaAuth && socialMedia_id) {
                if (!isValidEmail(email)) {
                    return res.status(400).send({
                        status: false,
                        message: "Global.PleaseEnterEntityData.BadEmail",
                        data: null,
                    });
                }
                // check if email exists
                const check = await UserModel.findOne({
                    where: {
                        email: email
                    }
                })
                if (!check) {
                    // split email into two part, replace all . by _ and remove more than 30 char from the string
                    let username = email.split('@')[0].replace('.', '_').substring(0, 30)
                    // if user doesnt exist create user 
                    // username must be uniq
                    //QUERY
                    let checkUsername = await UserModel.findOne({ where: { username } })
                    while (checkUsername) {
                        if (username.length >= 21) {
                            username = username.substring(0, 21) + '_' + nameExtension
                            checkUsername = await UserModel.findOne({ where: { username } })
                        } else {
                            username += '_' + nameExtension
                            checkUsername = await UserModel.findOne({ where: { username } })
                        }
                    }
                    // create username
                    const user = await UserModel.create({ socialMedia_id, email, username, fullName, country: geo ? geo.country : null, state: geo ? geo.region : null, latitude: geo ? geo.ll[0] : null, longitude: geo ? geo.ll[1] : null, profilLink, status: "verified", socialMediaAuth, isAnonymous: false })
                    if (user) {
                        user.dataValues.token = generateToken(user.dataValues);
                        return res.status(201).json({
                            status: true,
                            message: "ACCOUNT.VERIFIED",
                            data: user.dataValues
                        });
                    }
                }
                // user exists 
                if (check.dataValues.status == "verified") {
                    console.log("verified");
                    // if user already exists
                    return res.status(400).send({
                        status: false,
                        message: "API.ENTITY.EXISTS",
                        data: null
                    });
                }
            }
            if (!(email && !socialMediaAuth) || !(phone_number && country_code) || !(email && socialMediaAuth && socialMedia_id)) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

        } catch (err) {
            console.log("error signup :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }


    }

    async checkUsername(req, res) {
        try {
            const { username } = req.body;

            if (!(username)) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

            const checkUsername = await UserModel.findOne({ where: { username } })
            if (checkUsername) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTITY.EXISTS",
                    data: null
                });
            } else {
                return res.status(200).send({
                    status: true,
                    message: "USERNAME.VALID",
                    data: null
                });
            }

        } catch (err) {
            console.log("error checkUsername :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async verifyDigits(req, res) {
        try {

            const { email, phone_number, country_code, verifCode } = req.body;
            const expireTime = 5;

            if (email) {

                // check if user received code
                const check = await verifCodeModel
                    .findOne({
                        where: { email, verifCode }
                    })
                if (!check) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }

                const generatedAt = Date.now();
                const date = new Date(check.dataValues.generatedAt);
                date.setMinutes(date.getMinutes() + expireTime);
                const now = Date.now();
                if (now > date) {
                    return res.status(401).send({
                        status: false,
                        message: "TOKEN.EXPIRED",
                        data: null,
                    });
                } else {
                    const user = await UserModel.update({ status: "verified" }, { where: { user_id: check.dataValues.user_id }, plain: true, returning: true })
                    //MONGO HERE
                    await axios.post(`${config.sync_url}syncMongo`, { status: "new", data: user[1].dataValues });

                    delete user[1].dataValues.password
                    user[1].dataValues.token = generateToken(user[1].dataValues);
                    return res.status(200).send({
                        status: true,
                        message: "ACCOUNT.VERIFIED",
                        data: user[1].dataValues,
                    })
                }

            }

            if (phone_number && country_code) {
                // check if user received code
                const check = await verifCodeModel
                    .findOne({
                        where: { country_code, phone_number, verifCode }
                    })
                if (!check) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }

                const generatedAt = Date.now();
                const date = new Date(check.dataValues.generatedAt);
                date.setMinutes(date.getMinutes() + expireTime);
                const now = Date.now();
                if (now > date) {
                    return res.status(401).send({
                        status: false,
                        message: "TOKEN.EXPIRED",
                        data: null,
                    });
                } else {
                    const user = await UserModel.update({ status: "verified" }, { where: { user_id: check.dataValues.user_id }, plain: true, returning: true })
                    //MONGO HERE
                    await axios.post(`${config.sync_url}syncMongo`, { status: "new", data: user[1].dataValues });
                    delete user[1].dataValues.password
                    user[1].dataValues.token = generateToken(user[1].dataValues);
                    return res.status(200).send({
                        status: true,
                        message: "ACCOUNT.VERIFIED",
                        data: user[1].dataValues,
                    })
                }
            }

            if (!(email) || !(phone_number && country_code)) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

        } catch (err) {
            console.log("error verifyDigits :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }


    }

    async resendCode(req, res) {
        try {
            const { email, phone_number, country_code } = req.body;
            const code = uid(4);
            const generatedAt = Date.now();

            if (email) {
                if (!isValidEmail(email)) {
                    return res.status(400).send({
                        status: false,
                        message: "Global.PleaseEnterEntityData.BadEmail",
                        data: null,
                    });
                }
                const check = await verifCodeModel.update({ verifCode: code, generatedAt }, { where: { email } })
                if (check) {
                    await sendEmail(email, code)
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.RESENT",
                        data: null
                    });
                }
            }

            if (phone_number && country_code) {
                const check = await verifCodeModel.update({ verifCode: code, generatedAt }, { where: { phone_number, country_code } })
                if (check) {
                    await client.messages
                        .create({
                            body: 'Use this code to signup for Ireveal : ' + code,
                            messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                            to: `${country_code}${phone_number}`
                        })
                        .done();
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.RESENT",
                        data: null
                    });
                }
            }

        } catch (err) {
            console.log("error resendCode :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async login(req, res, next) {
        try {
            const { email, country_code, phone_number, password, visitor,socialMedia_id } = req.body

            if (email && !socialMedia_id ) {
                return passport.authenticate('local', { session: false }, (err, passportUser, info) => {
                    if (err) {
                        return next.status(501).json({
                            status: false,
                            message: "ERROR.INTERNAL.ISSUE",
                            data: null
                        });
                    }

                    if (passportUser) {
                        if (passportUser.dataValues.status == "notVerified") {
                            return res.status(400).json({
                                status: false,
                                message: "LOGIN.FAILED",
                                data: null
                            });
                        }
                        console.log(passportUser, "passportUser");
                        const user = passportUser;
                        delete user.dataValues.password;
                        user.dataValues.token = generateToken(user.dataValues);
                        return res.status(200).json({
                            status: true,
                            message: "LOGIN.SUCCESS",
                            data: user,
                        });
                    }

                    return res.status(400).json({
                        status: false,
                        message: info,
                        data: null
                    });
                })(req, res, next);

            }

            if (phone_number && country_code) {
                const user = await UserModel.findOne({ where: { phone_number, country_code } })
                if (user) {
                    if (user.dataValues.status == "notVerified") {
                        return res.status(400).json({
                            status: false,
                            message: "LOGIN.FAILED",
                            data: null
                        });
                    }
                    if (comparePassword(password, user.dataValues.password)) {
                        console.log("compare success");
                        delete user.dataValues.password
                        user.dataValues.token = generateToken(user.dataValues);
                        return res.status(200).send({
                            status: true,
                            message: "LOGIN.SUCCESS",
                            data: user.dataValues,
                        })
                    } else {
                        return res.status(400).send({
                            status: false,
                            message: "LOGIN.FAILED",
                            data: null,
                        })
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }
            }

            if (email && socialMedia_id) {
                console.log("here");
                const user = await UserModel.findOne({ where: { email, socialMedia_id } })
                console.log("social :", user.dataValues);
                if (user.dataValues.socialMediaAuth == true) {
                    user.dataValues.token = generateToken(user.dataValues);
                    return res.status(200).send({
                        status: true,
                        message: "LOGIN.SUCCESS",
                        data: user.dataValues,
                    })
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }
            }

            if (visitor) {
                const user = { vistor: "true" }
                let user_id;
                user.user_id = uuidv4();
                console.log("---------------", user);
                const token = generateToken(user);
                return res.status(201).send({
                    status: true,
                    message: "LOGIN.SUCCESS",
                    data: { "token": token }
                })
            }




            if ( !(email && password) || !(phone_number && country_code && password) || (!visitor) || !(email && socialMedia_id) ) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

        } catch (err) {
            console.log("error login :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async forgetPassword(req, res) {
        try {
            const { email, phone_number, country_code, newPassword } = req.body;
            const code = uid(4);
            const generatedAt = Date.now();

            if (email) {
                const check = await UserModel.findOne({ where: { email } });
                if (check) {
                    const checkForgetPassword = await forgetPasswordModel.findOne({ where: { user_id: check.dataValues.user_id } })
                    const passwordHashed = hashPassword(newPassword);
                    if (!checkForgetPassword) {
                        const forgetPassword = await forgetPasswordModel.create({ reset_code: code, codeGeneratedAt: generatedAt, email, user_id: check.dataValues.user_id, newPassword: passwordHashed })
                        const sendMail = await sendEmail(email, code)
                        const promises = [forgetPassword, sendMail];
                        Promise.all(promises)
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: null
                        });
                    } else {
                        const forgetPassword = await forgetPasswordModel.update({ reset_code: code, codeGeneratedAt: generatedAt, email, newPassword: passwordHashed }, { where: { user_id: check.dataValues.user_id } })
                        const sendMail = await sendEmail(email, code)
                        const promises = [forgetPassword, sendMail];
                        Promise.all(promises)
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: null
                        });
                    }

                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }

            }

            if (phone_number && country_code) {
                const check = await UserModel.findOne({ where: { phone_number, country_code } });
                if (check) {
                    const checkForgetPassword = await forgetPasswordModel.findOne({ where: { user_id: check.dataValues.user_id } })
                    const passwordHashed = hashPassword(newPassword);
                    if (!checkForgetPassword) {
                        const forgetPassword = await forgetPasswordModel.create({ reset_code: code, codeGeneratedAt: generatedAt, country_code, phone_number, user_id: check.dataValues.user_id, newPassword: passwordHashed })
                        const sendSms = await client.messages
                            .create({
                                body: 'Use this code to signup for Ireveal : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .done();
                        const promises = [forgetPassword, sendSms];
                        Promise.all(promises)
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: null
                        });
                    } else {
                        const forgetPassword = await forgetPasswordModel.update({ reset_code: code, phone_number, country_code, codeGeneratedAt: generatedAt, newPassword: passwordHashed }, { where: { user_id: check.dataValues.user_id } })
                        const sendSms = await client.messages
                            .create({
                                body: 'Use this code to signup for Ireveal : ' + code,
                                messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                                to: `${country_code}${phone_number}`
                            })
                            .done();
                        const promises = [forgetPassword, sendSms];
                        Promise.all(promises)
                        return res.status(201).json({
                            status: true,
                            message: "API.CODE.SENT",
                            data: null
                        });
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }


            }

        } catch (err) {
            console.log("error forgetPassword :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async verifUpdatePassword(req, res) {
        try {
            const expireTime = 5;
            const { email, phone_number, country_code, reset_code } = req.body;

            if (email) {

                const user = await UserModel.findOne({ where: { email } })
                if (user) {
                    const check = await forgetPasswordModel.findOne({ where: { email, reset_code, user_id: user.user_id } })
                    if (!check) {
                        return res.status(400).send({
                            status: false,
                            message: "CREDENTIALS.NOT.VALID",
                            data: null
                        })
                    }
                    const date = new Date(check.dataValues.codeGeneratedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    const now = Date.now()
                    if (now > date) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "CODE.EXPIRED",
                        });
                    } else {

                        // update password
                        const passwordUpdate = await user.update({ password: check.dataValues.newPassword })
                        // add token to connect automaticly to the app
                        delete user.dataValues.password
                        user.dataValues.token = generateToken(user.dataValues);
                        return res.status(200).send({
                            status: true,
                            data: user,
                            message: "DIGIT.VERIFIED",
                        })
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }

            }

            if (phone_number && country_code) {
                const user = await UserModel.findOne({ where: { phone_number, country_code } })
                if (user) {
                    const check = await forgetPasswordModel.findOne({ where: { phone_number, country_code, reset_code } })
                    if (!check) {
                        return res.status(400).send({
                            status: false,
                            message: "CREDENTIALS.NOT.VALID",
                            data: null
                        })
                    }
                    const date = new Date(check.dataValues.codeGeneratedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    const now = Date.now()
                    if (now > date) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "CODE.EXPIRED",
                        });
                    } else {
                        // update password
                        const passwordUpdate = await user.update({ password: check.dataValues.newPassword })
                        // add token to connect automaticly to the app
                        delete user.dataValues.password
                        user.dataValues.token = generateToken(user.dataValues);
                        return res.status(200).send({
                            status: true,
                            data: user,
                            message: "DIGIT.VERIFIED",
                        })
                    }

                } else {
                    return res.status(400).send({
                        status: false,
                        message: "FAILED.FETCH.ACCOUNT",
                        data: null
                    });
                }

            }

        } catch (err) {
            console.log("error verifUpdatePassword :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async currentProfil(req, res) {
        try {
            const { payload: { obj } } = req;
            const check = await UserModel.findOne({
                where: { user_id: obj.user_id },
                include: [{

                    model: interestModel,
                    through: userInterestsModel,
                    as: "interests",

                }]
            })
            if (!check) {
                return res.status(400).send({
                    status: false,
                    message: "USER.NOT.EXIST",
                    data: null
                })
            } else {
                delete check.dataValues.password
                return res.status(200).send({
                    status: true,
                    message: "CURRENT.PROFIL",
                    data: check,
                })
            }
        } catch (err) {
            console.log("error currentProfil :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async updateUser(req, res) {
        try {
            const { payload: { obj } } = req;
            // let { hideEmail, hidePhoneNumber, isAnonymous ,username, fullName, dateOfBirth, gender, profilVisibility,interests, address, country, state, description, facebook, twitter, youtube, site, type } = req.body;

            const check = await UserModel.findOne({ where: { user_id: obj.user_id } })
            if (check) {
                const form = formidable({ multiples: true });
                form.parse(req, async (err, fields, files) => {
                    if (err) {

                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "ERROR.BAD.REQUEST"
                        })
                    }
                    console.log("fields : ", fields);
                    console.log("files : ", files);
                    // to update an image pass the attribute type as "profil" or "cover"
                    if (files.file) {
                        try {
                            const upload_result = await uploadFile(fields, files);
                            if (upload_result.type == "profil") {
                                const userUpdated = await UserModel.update(
                                    { profile_image: upload_result.file_name },
                                    {
                                        where: { user_id: obj.user_id },
                                        returning: true,
                                        plain: true,
                                    }
                                );
                                //MONGO HERE
                                await axios.post(`${config.sync_url}syncMongo`, {
                                    status: "update",
                                    data: userUpdated[1].dataValues,
                                });
                                const token = generateToken(
                                    userUpdated[1].dataValues
                                );
                                userUpdated[1].dataValues.token = token;
                                delete userUpdated[1].dataValues.password;
                                return res.status(200).json({
                                    status: true,
                                    message: "API.USER.UPDATED",
                                    data: userUpdated[1].dataValues,
                                });
                            }
                            if (upload_result.type == "cover") {
                                const userUpdated = await UserModel.update(
                                    { profile_cover: upload_result.file_name },
                                    {
                                        where: { user_id: obj.user_id },
                                        returning: true,
                                        plain: true,
                                    }
                                );
                                //MONGO HERE
                                await axios.post(`${config.sync_url}syncMongo`, {
                                    status: "update",
                                    data: userUpdated[1].dataValues,
                                });

                                const token = generateToken(
                                    userUpdated[1].dataValues
                                );
                                userUpdated[1].dataValues.token = token;
                                delete userUpdated[1].dataValues.password;
                                return res.status(200).json({
                                    status: true,
                                    message: "API.USER.UPDATED",
                                    data: userUpdated[1].dataValues,
                                });
                            }
                        } catch (err) {
                            console.log("error bucket", err)
                            return res.send(err)
                        }
                    } else {
                        if (fields) {
                            if (!fields.username && !fields.fullName && !fields.dateOfBirth && !fields.gender && !fields.address && !fields.country && !fields.state && !fields.description && !fields.facebook && !fields.twitter && !fields.youtube && !fields.site &&
                                !fields.isAnonymous && !fields.profile_image && !fields.profile_cover && !fields.hideEmail && !fields.hidePhoneNumber && !fields.whistleblowingNotification && !fields.alertNotification && !fields.commentsNotification
                                && !fields.topAndDownNotification && !fields.postViewsNotification && !fields.getContentFromPublicNotification && !fields.muteNotification && !fields.interestsId && !fields.profileVisibility && !fields.firebasetoken) {
                                return res.status(400).send({
                                    status: false,
                                    message: "PLEASE.ENTER.ENTITYDATA",
                                    data: null,
                                });
                            }
                            let objectToUpdate = fields;
                            // if object is empty string or null update to null 
                            for (let field in objectToUpdate) {
                                if (objectToUpdate[field] == "" || objectToUpdate[field] == "null")
                                    objectToUpdate[field] = null
                            }

                            if (fields.interestsId) {
                                await userInterestsModel.destroy({
                                    where: {
                                        [Op.and]: {
                                            user_id: obj.user_id
                                        }
                                    }
                                })
                                await asyncForEach(JSON.parse(fields.interestsId), async (element) => {
                                    await userInterestsModel.create({ interest_id: element, user_id: obj.user_id })
                                })
                            }
                            // await userInterestsModel.create
                            const userUpdated = await UserModel.update(objectToUpdate, { where: { user_id: obj.user_id }, returning: true, plain: true })
                            //MONGO HERE
                            await axios.post(`${config.sync_url}syncMongo`, { status: "update", data: userUpdated[1].dataValues });

                            const token = generateToken(userUpdated[1].dataValues);
                            const fetchUpdatedUser = await UserModel.findOne({
                                where: { user_id: obj.user_id }, include: [{

                                    model: interestModel,
                                    through: userInterestsModel,
                                    as: "interests",

                                }]
                            })
                            fetchUpdatedUser.dataValues.token = token
                            delete fetchUpdatedUser.dataValues.password
                            return res.status(200).json({
                                status: true,
                                message: "API.USER.UPDATED",
                                data: fetchUpdatedUser.dataValues
                            })

                        }
                    }
                })
            }
            else {
                return res.status(400).send({
                    status: false,
                    message: "USER.NOT.EXIST",
                    data: null
                })
            }

        } catch (err) {
            console.log("error updateUser :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async changePassword(req, res) {
        try {
            const { payload: { obj } } = req;
            const { currentPassword, newPassword } = req.body;

            if (!newPassword || !currentPassword) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "PLEASE.ENTER.CREDENTIALS",
                });
            }

            const user = await UserModel.findOne({ where: { user_id: obj.user_id } })
            if (!user) {
                return res.status(400).send({
                    status: false,
                    message: "USER.NOT.EXIST",
                    data: null
                })
            }
            if (comparePassword(currentPassword, user.dataValues.password)) {
                if ((comparePassword(newPassword, user.dataValues.password))) {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    });
                }
                const password = hashPassword(newPassword);
                await user.update({ password })
                return res.status(201).send({
                    status: true,
                    data: null,
                    message: "SUCCESS.PASSWORD.RESET",
                })
            } else {
                return res.status(400).send({
                    status: false,
                    message: "CREDENTIALS.NOT.VALID",
                    data: null
                });
            }
        } catch (err) {
            console.log("error change password :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async updateEmailorPhoneStep2(req, res) {
        try {
            const { payload: { obj } } = req;
            const { email, country_code, phone_number, code } = req.body;
            const expireTime = 5;

            if (!(email && code) && !(phone_number && country_code && code)) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

            if (email && code) {
                if (!isValidEmail(email)) {
                    return res.status(400).send({
                        status: false,
                        data: null,
                        message: "Global.PleaseEnterEntityData.BadEmail",
                    });
                }
                const check = await userUpdateModel.findOne({ where: { email, code, user_id: obj.user_id } })
                if (check) {
                    const date = new Date(check.dataValues.generatedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    console.log("date:", date);
                    const now = Date.now()
                    if (now > date) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "TOKEN.EXPIRED",
                        });
                    } else {
                        const newUser = await UserModel.update({ email }, { where: { user_id: obj.user_id }, returning: true, plain: true })
                        await check.update({ code: null })
                        delete newUser[1].dataValues.password
                        newUser[1].dataValues.token = generateToken(newUser[1].dataValues);
                        return res.status(201).json({
                            status: true,
                            message: "API.USER.UPDATED",
                            data: newUser[1].dataValues,
                        });
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
            }

            if (country_code && phone_number && code) {
                const check = await userUpdateModel.findOne({ where: { phone_number, country_code, code, user_id: obj.user_id } })
                if (check) {
                    const date = new Date(check.dataValues.generatedAt);
                    date.setMinutes(date.getMinutes() + expireTime);
                    console.log("date:", date);
                    const now = Date.now()
                    if (now > date) {
                        return res.status(401).send({
                            status: false,
                            data: null,
                            message: "TOKEN.EXPIRED",
                        });
                    } else {
                        const newUser = await UserModel.update({ phone_number, country_code }, { where: { user_id: obj.user_id }, returning: true, plain: true })
                        await check.update({ code: null })
                        delete newUser[1].dataValues.password
                        newUser[1].dataValues.token = generateToken(newUser[1].dataValues);
                        return res.status(201).json({
                            status: true,
                            message: "API.USER.UPDATED",
                            data: newUser[1].dataValues,
                        });
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "CREDENTIALS.NOT.VALID",
                        data: null
                    })
                }
            }


        } catch (err) {
            console.log("error updateEmailorPhone :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    profilCountServices(req, res) {
        if (req.body.type == "posts_count") {
            counterPosts(req.body.user_id, req.body.step);
            res.status(200).json({ status: true });
        }
        if (req.body.type == "likes_count") {
            counterLikes(req.body.user_id, req.body.step);
            res.status(200).json({ status: true });
        }
        if (req.body.type == "views_count") {
            counterViews(req.body.user_id, req.body.step);
            res.status(200).json({ status: true });
        }
        if (req.body.type == "followers_count") {
            counterFollowers(req.body.user_id, req.body.step);
            res.status(200).json({ status: true });
        }
        if (req.body.type == "posts_count") {
            counterFollowing(req.body.user_id, req.body.step);
            res.status(200).json({ status: true });
        }
    }

    async deleteUser(req, res) {

        let { email, country_code, phone_number } = req.body;

        try {

            if (email) {
                const check = await UserModel.findOne({ where: { email } })

                if (check) {
                    const myId = check.dataValues.user_id
                    const checkVerif = await verifCodeModel.findAll({ where: { user_id: myId } })
                    const chekUserUpdate = await userUpdateModel.findAll({ where: { user_id: myId } })
                    const checkReport = await reportModel.findAll({ where: { user_reporting_id: myId } })
                    const checkRequest = await friendRequestModel.findAll({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } })
                    const checkInterests = await userInterestsModel.findAll({ where: { user_id: myId } })
                    const checkForget = await forgetPasswordModel.findAll({ where: { user_id: myId } })


                    if (Object.entries(checkInterests).length != 0) {
                        await userInterestsModel.destroy({ where: { user_id: myId } });
                        console.log(" userInterestsModel delete done");
                    }
                    if (Object.entries(checkRequest).length != 0) {
                        await friendRequestModel.destroy({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } });
                        console.log(" delete done");
                    }
                    if (Object.entries(checkReport).length != 0) {
                        await reportModel.destroy({ where: { user_id: myId } });
                        console.log("reportModel delete done");
                    }
                    if (Object.entries(chekUserUpdate).length != 0) {
                        await userUpdateModel.destroy({ where: { user_id: myId } });
                        console.log("userUpdateModel delete done");
                    }
                    if (Object.entries(checkVerif).length != 0) {
                        await verifCodeModel.destroy({ where: { user_id: myId } });
                        console.log("verifCodeModel delete done");
                    }
                    if (Object.entries(checkForget).length != 0) {
                        await forgetPasswordModel.destroy({ where: { user_id: myId } });
                        console.log("forgetPasswordModel delete done");
                    }
                    if (Object.entries(check).length != 0) {
                        await UserModel.destroy({ where: { user_id: myId } });
                        console.log("UserModel delete done");
                    }
                    return res.status(200).json({
                        status: true,
                        message: "USER.DELETED",
                        data: null
                    })

                } else {
                    return res.status(400).json({
                        status: true,
                        message: "USER.NOT.FOUND",
                        data: null
                    })
                }

            }

            if (phone_number && country_code) {
                const check = await UserModel.findOne({ where: { phone_number, country_code } })

                if (check) {
                    const myId = check.dataValues.user_id
                    const checkVerif = await verifCodeModel.findAll({ where: { user_id: myId } })
                    const chekUserUpdate = await userUpdateModel.findAll({ where: { user_id: myId } })
                    const checkReport = await reportModel.findAll({ where: { user_reporting_id: myId } })
                    const checkRequest = await friendRequestModel.findAll({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } })
                    const checkInterests = await userInterestsModel.findAll({ where: { user_id: myId } })
                    const checkForget = await forgetPasswordModel.findAll({ where: { user_id: myId } })

                    if (Object.entries(checkInterests).length != 0) {
                        await userInterestsModel.destroy({ where: { user_id: myId } });
                        console.log("userInterestsModel delete done");
                    }
                    if (Object.entries(checkRequest).length != 0) {
                        await friendRequestModel.destroy({ where: { [Op.or]: { to_user_id: myId, from_user_id: myId } } });
                        console.log("friendRequestModel delete done");
                    }
                    if (Object.entries(checkReport).length != 0) {
                        await reportModel.destroy({ where: { user_id: myId } });
                        console.log("reportModel delete done");
                    }
                    if (Object.entries(chekUserUpdate).length != 0) {
                        await userUpdateModel.destroy({ where: { user_id: myId } });
                        console.log("userUpdateModel delete done");
                    }
                    if (Object.entries(checkVerif).length != 0) {
                        await verifCodeModel.destroy({ where: { user_id: myId } });
                        console.log("verifCodeModel delete done");
                    }
                    if (Object.entries(checkForget).length != 0) {
                        await forgetPasswordModel.destroy({ where: { user_id: myId } });
                        console.log("forgetPasswordModel delete done");
                    }
                    if (Object.entries(check).length != 0) {
                        await UserModel.destroy({ where: { user_id: myId } });
                        console.log("UserModel delete done");
                    }
                    return res.status(200).json({
                        status: true,
                        message: "USER.DELETED",
                        data: null
                    })

                } else {
                    return res.status(400).json({
                        status: true,
                        message: "USER.NOT.FOUND",
                        data: null
                    })
                }

            }

        } catch (err) {
            console.log(" delete user ----------------", err);
            return res.status(400).json({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }


    }



}



module.exports = UserController;
