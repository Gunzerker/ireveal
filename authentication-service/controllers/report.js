const models = require("../models/db_init");

const reportModel = models["report"];
const reportTypeModel = models["reportType"]

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

class reportController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = reportModel;
        this.entity_id_name = "report_id";
        this.list_includes = [
            {
                model: reportTypeModel,
                as: "user_report",
                include: [
                    {
                        model: reportTypeModel,
                        as: "parent_report",
                    },
                ]
            },
        ]
    }

    async createReport(req, res) {
        try {
            const { payload: { obj } } = req;
            let { reportType_id, user_reported_id, description } = req.body
          
            // verification of attributes , all the attributes must be passed in the request
            if (!reportType_id || !user_reported_id || !description ) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

            const report = await reportModel.create({ user_reporting_id: obj.user_id, user_reported_id, reportType_id, description })
            return res.status(200).json({
                status: true,
                message: "API.REPORT.CREATED",
                data: report
            })


        } catch (err) {
            console.log("error create report :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

}

module.exports = reportController;