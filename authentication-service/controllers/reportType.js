const models = require("../models/db_init");

const reportTypeModel = models["reportType"];
const userModel = models["users"];

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");

class reportTypeController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = reportTypeModel;
        this.entity_id_name = "reportType_id";
        this.list_includes = [
            {
                model: reportTypeModel,
                as: "parent_report",
            },
        ]
    }

    async createReport(req, res) {
        try {
            const { payload: { obj } } = req;
            let { tag_type, reported_id, description, parent_id } = req.body

            // verification of attributes , all the attributes must be passed in the request
            if (!tag_type || !reported_id || !description) {
                return res.status(400).send({
                    status: false,
                    message: "PLEASE.ENTER.ENTITYDATA",
                    data: null,
                });
            }

            const check = await userModel.findOne({ user_id: reported_id })
            if (check) {
                if (parent_id) {
                    const report = await reportTypeModel.create({ tag_type, user_reporting_id: obj.user_id, reported_id, description, parent_id })
                    return res.status(200).json({
                        status: true,
                        message: "API.REPORT.CREATED",
                        data: report
                    })
                }
                const report = await reportTypeModel.create({ tag_type, user_reporting_id: obj.user_id, reported_id, description })
                return res.status(200).json({
                    status: true,
                    message: "API.REPORT.CREATED",
                    data: report
                })


            } else {
                return res.status(400).send({
                    status: false,
                    message: "API.USER.NOT.EXIST",
                    data: null
                })
            }

        } catch (err) {
            console.log("error create report :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async fetchParentReports(req, res) {
        try {
            const reports = await reportTypeModel.findAll({ where: { parent_id: null } })
            return res.status(200).json({
                status: true,
                message: "API.FETCH.PARENTS",
                data: reports
            })

        } catch (err) {
            console.log("error fetch parent reports :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async fetchReportWithChildren(req, res) {
        try {
            let { parent_id } = req.body;
            const reports = await reportTypeModel.findAll({ where: { parent_id } })
            return res.status(200).json({
                status: true,
                message: "API.FETCH.PARENTS",
                data: reports
            })

        } catch (err) {
            console.log("error fetch report :", err);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

}

module.exports = reportTypeController;