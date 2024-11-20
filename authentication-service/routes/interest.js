const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const interestController = require("../controllers/interest");
const interestControllerInst = new interestController();

// find
router.get("/find", (req, res) => {
    interestControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    interestControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    interestControllerInst.update(req, res);
});

// post
router.post("/createInterest", async (req, res) => {
    interestControllerInst.createInterest(req, res);
});

module.exports = router;
