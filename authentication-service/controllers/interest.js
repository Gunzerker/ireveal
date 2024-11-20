const models = require("../models/db_init");
const formidable = require('formidable');

const interestModel = models["interest"];

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

const { uploadFile } = require("../functions/uploadFile");

class interestController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = interestModel;
        this.entity_id_name = "interest_id";
    }

    async createInterest(req, res) {
        try {

            // to upload an image pass the file and type must be "cover", all the attributes must be passed to succeed the creation of an interest
            const form = formidable({ multiples: true });
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    next(err);
                    return;
                }

                // verification of attributes , all the attributes must be passed in the request
                if (!fields.interestName || !fields.language || !fields.type) {
                    return res.status(400).send({
                        status: false,
                        message: "PLEASE.ENTER.ENTITYDATA",
                        data: null,
                    });
                }

                if (files.file) {
                    const upload_result = await uploadFile(fields, files)
                    if (upload_result.type == "cover") {
                        const interest = await interestModel.create({ interestImageUrl: upload_result.file_name, interestName: fields.interestName, language: fields.language })
                        return res.status(200).json({
                            status: true,
                            message: "API.USER.UPDATED",
                            data: interest
                        })
                    }
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "API.BAD.REQUEST",
                        data: null
                    })
                }

            })

        } catch (err) {
            console.log("error verifDigitForgetPassword :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

}

module.exports = interestController;