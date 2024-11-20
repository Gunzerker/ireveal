const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/Notifications");
const notificationControllerInst = new notificationController();

// find
router.post("/sendToUser", (req, res) => {
  console.log(req.body)
  notificationControllerInst.sendToUser(req, res);
});

router.post("/broadcastTopic",(req,res) => {
  console.log(req.body)
  notificationControllerInst.broadCastToTopic(req, res);

})

// subscibe to user
router.post("/subscribeToUser",(req,res)=> {
  notificationControllerInst.subscribeToUser(req,res)
})

// unsubscribe from topic
router.post("/unSubscribeFromUser", (req, res) => {
  notificationControllerInst.unSubscribeFromUser(req, res);
});

module.exports = router;
