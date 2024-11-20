const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const FriendRequestController = require("../controllers/friendRequest");
const FriendRequestControllerInst = new FriendRequestController();

// find
router.get("/find", (req, res) => {
    FriendRequestControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    FriendRequestControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    FriendRequestControllerInst.update(req, res);
});

// post
router.post("/create", async (req, res) => {
    FriendRequestControllerInst.create(req, res);
});

// post followRequest
router.post("/followRequest", auth.required, async (req, res) => {
    FriendRequestControllerInst.followRequest(req, res);
});

// post acceptFollowRequest
router.post("/acceptFollowRequest", auth.required, async (req, res) => {
    FriendRequestControllerInst.acceptFollowRequest(req, res);
});

// post deleteFollowRequest
router.post("/deleteFollowRequest",auth.required, async (req, res) => {
    FriendRequestControllerInst.deleteFollowRequest(req, res);
});

// post cancelFollowRequest
router.post("/cancelFollowRequest",auth.required, async (req, res) => {
    FriendRequestControllerInst.cancelFollowRequest(req, res);
});

// post unfollowing
router.post("/unfollowing",auth.required, async (req, res) => {
    FriendRequestControllerInst.unfollowing(req, res);
});

// post delete follower
router.post("/deleteFollower",auth.required, async (req, res) => {
    FriendRequestControllerInst.deleteFollower(req, res);
});

// post blockUser request
router.post("/blockUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.blockUser(req, res);
});

// post blockUser request
router.get("/listBlocked",auth.required, async (req, res) => {
    FriendRequestControllerInst.listBlocked(req, res);
});

// post blockUser request
router.get("/listHid",auth.required, async (req, res) => {
    FriendRequestControllerInst.listHid(req, res);
});

// post hideUser request
router.post("/hideUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.hideUser(req, res);
});

// post unblockuser
router.post("/unblockUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.unblockUser(req, res);
});

// post unhideUser
router.post("/unhideUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.unhideUser(req, res);
});

// post fetchDestinationProfil
router.post("/fetchDestinationProfil",auth.required, async (req, res) => {
    FriendRequestControllerInst.fetchDestinationProfil(req, res);
});

module.exports = router;