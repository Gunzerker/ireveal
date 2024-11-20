const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const UserController = require("../controllers/user");
const UserControllerInst = new UserController();

// signup
router.post("/signup", async (req, res) => {
  UserControllerInst.signupUser(req, res);
});

// verifyDigits
router.put("/verifyDigits", async (req, res) => {
  UserControllerInst.verifyDigits(req, res);
});

// resendCode
router.post("/resendCode", async (req, res) => {
  UserControllerInst.resendCode(req, res);
});

// login
router.post("/login", auth.optional, async (req, res, next) => {
  UserControllerInst.login(req, res, next);
});

// find
router.get("/find", (req, res) => {
  UserControllerInst.find(req, res);
});

// checkUsername
router.post("/checkUsername", (req, res) => {
  UserControllerInst.checkUsername(req, res);
});

// forgetPassword
router.post("/forgetPassword", (req, res) => {
  UserControllerInst.forgetPassword(req, res);
});

// verifUpdatePassword
router.post("/verifUpdatePassword", (req, res) => {
  UserControllerInst.verifUpdatePassword(req, res);
});

// resetPassword
router.post("/resetPassword", (req, res) => {
  UserControllerInst.resetPassword(req, res);
});

// currentProfil
router.get("/currentProfil", auth.required, async (req, res) => {
  UserControllerInst.currentProfil(req, res);
});

// updateUser
router.put("/updateUser", auth.required, async (req, res) => {
  UserControllerInst.updateUser(req, res);
});

// changePassword
router.put("/changePassword", auth.required, async (req, res) => {
  UserControllerInst.changePassword(req, res);
});

// updateEmailorPhoneStep2
router.put("/updateEmailorPhoneStep2", auth.required, async (req, res) => {
  UserControllerInst.updateEmailorPhoneStep2(req, res);
});

// increment counters
router.post("/profilCountServices", async (req, res) => {
  UserControllerInst.profilCountServices(req, res);
});

// deleteUser
router.delete("/deleteUser", async (req, res) => {
  UserControllerInst.deleteUser(req, res);
});


module.exports = router;