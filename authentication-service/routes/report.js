const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const reportController = require("../controllers/report");
const reportControllerInst = new reportController();

// find
router.get("/find", (req, res) => {
    reportControllerInst.find(req, res);
});

// post
router.post("/createReport", auth.required, async (req, res) => {
    reportControllerInst.createReport(req, res);
});



module.exports = router;
