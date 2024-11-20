const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const userUpdateController = require("../controllers/userUpdate");
const userUpdateControllerInst = new userUpdateController();

// find
router.get("/find", (req, res) => {
    userUpdateControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    userUpdateControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    userUpdateControllerInst.update(req, res);
});

// updateEmailorPhoneStep1
router.post("/updateEmailorPhoneStep1", auth.required,(req, res) => {
    userUpdateControllerInst.updateEmailorPhoneStep1(req, res);
});

module.exports = router;
