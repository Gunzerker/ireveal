const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const reportTypeController = require("../controllers/reportType");
const reportTypeControllerInst = new reportTypeController();

// find
router.get("/find", (req, res) => {
    reportTypeControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    reportTypeControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    reportTypeControllerInst.update(req, res);
});

// post
router.post("/createReport", auth.required, async (req, res) => {
    reportTypeControllerInst.createReport(req, res);
});

// fetchReports
router.get("/fetchParentReports", async (req, res) => {
    reportTypeControllerInst.fetchParentReports(req, res);
});

// fetchReports
router.post("/fetchReportWithChildren", async (req, res) => {
    reportTypeControllerInst.fetchReportWithChildren(req, res);
});



module.exports = router;
