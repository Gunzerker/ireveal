const models = require("../models/db_init");
const userUpdateModel = models["userUpdate"];
const UserModel = models["users"];

const config = require('../config/config.json');
var uid = require('rand-token').uid;

const { sendEmail } = require("../functions/sendMail");
const { hashPassword, isValidEmail, comparePassword, generateToken } = require('../helpers/validate');

const client = require('twilio')(config.accountSid, config.authToken);

const ApiBaseController = require("./ApiBaseController");

class interestController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = userUpdateModel;
        this.entity_id_name = "userUpdate_id";
    }

    async updateEmailorPhoneStep1(req, res) {
        try {
            let { payload: { obj } } = req;
            let { email, country_code, phone_number } = req.body;
            const code = uid(4);
            const generatedAt = Date.now();

            if (email) {
                if (!isValidEmail(email)) {
                    return res.status(400).send({
                        status: false,
                        data: null,
                        message: "Global.PleaseEnterEntityData.BadEmail",
                    });
                }

                let checkEmail = await UserModel.findOne({ where: { email } })
                if (checkEmail) {
                    return res.status(400).send({
                        status: false,
                        message: "API.ENTITY.EXISTS",
                        data: null
                    });
                }
                let check = await userUpdateModel.findOne({ where: { user_id: obj.user_id } })
                if (!check) {
                    let userUpdate = await userUpdateModel.create({ user_id: obj.user_id, email, generatedAt, code });
                    const sendMail = await sendEmail(email, code);
                    let promises = [userUpdate, sendMail];
                    Promise.all(promises)
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.SENT",
                        data: null,
                    });

                } else {
                    let userUpdate = await check.update({ email, code, generatedAt })
                    const sendMail = await sendEmail(email, code);
                    let promises = [userUpdate, sendMail];
                    Promise.all(promises)
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.SENT",
                        data: null,
                    });
                }
            }

            if (phone_number && country_code) {
                let checkEmail = await UserModel.findOne({ where: { phone_number, country_code } })
                if (checkEmail) {
                    return res.status(400).send({
                        status: false,
                        message: "API.ENTITY.EXISTS",
                        data: null
                    });
                }
                let check = await userUpdateModel.findOne({ where: { user_id: obj.user_id } })
                if (!check) {
                    let userUpdate = await userUpdateModel.create({ generatedAt, user_id: obj.user_id, phone_number, country_code, code  });
                    let sendSms = await client.messages
                        .create({
                            body: 'Use this code to update your account in Ireveal : ' + code,
                            messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                            to: `${country_code}${phone_number}`
                        })
                        .done();
                    let promises = [userUpdate, sendSms];
                    Promise.all(promises)
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.SENT",
                        data: null,
                    });
 
                } else {
                    let userUpdate = await check.update({ generatedAt, phone_number, country_code, code })
                    let sendSms = await client.messages
                        .create({
                            body: 'Use this code to update your account in Ireveal : ' + code,
                            messagingServiceSid: 'MGdaef22c89a62ac695351ddd81b1044cf',
                            to: `${country_code}${phone_number}`
                        })
                        .done();
                    let promises = [userUpdate, sendSms];
                    Promise.all(promises)
                    return res.status(201).json({
                        status: true,
                        message: "API.CODE.SENT",
                        data: null,
                    });
                }
            }

            if (!email || !(phone_number && country_code)) {
                return res.status(400).send({
                    status: false,
                    data: null,
                    message: "PLEASE.ENTER.CREDENTIALS",
                });
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

}

module.exports = interestController;