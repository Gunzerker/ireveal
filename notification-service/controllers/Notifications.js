const admin = require("firebase-admin");
const serviceAccount = require("../config/ireveal_firebase.json");
const User = require("../models/Users")
const Sub = require("../models/SubBell")
const Notification = require("../models/Notification")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

class interestController {
  async fetchUserFirebaseToken(_id) {
    const user = await User.findOne({ _id });
    return user.firebasetoken;
  }

  signToTopic(req, res) {
    const { topic, token, internal } = req;
    var registrationTokens = token;

    if (internal) {
      admin
        .messaging()
        .subscribeToTopic(registrationTokens, String(topic))
        .then(function (response) {
          // See the MessagingTopicManagementResponse reference documentation
          // for the contents of response.
          console.log("Successfully subscribed to topic:", response);
          return "success";
        })
        .catch(function (error) {
          throw error;
        });
    } else {
      const { topic, token, internal } = req.body;
      admin
        .messaging()
        .subscribeToTopic(registrationTokens, String(topic))
        .then(function (response) {
          // See the MessagingTopicManagementResponse reference documentation
          // for the contents of response.
          console.log("Successfully subscribed to topic:", response);
          return res.json({
            success: true,
            message: "API.SIGNED-TO-TOPIC",
          });
        })
        .catch(function (error) {
          return res.json({
            success: true,
            message: "API.SIGNED-TO-TOPIC",
          });
        });
    }
  }

  unSignToTopic(req, res) {
    const { topic, token } = req.body;
    var registrationTokens = [token];
    admin
      .messaging()
      .subscribeToTopic(registrationTokens, String(topic))
      .then(function (response) {
        // See the MessagingTopicManagementResponse reference documentation
        // for the contents of response.
        console.log("Successfully unsubscribed to topic:", response);
        return "succes"
      })
      .catch(function (error) {
        throw error
      });
  }

  async broadCastToTopic(req, res) {
    // prepare the condition for the topic
    let condition = "'" + req.body.topics[0] + "'" + " in topics";
    if (req.body.topics.length > 1) {
      for (let i = 1; i < req.body.topics.length; i++) {
        condition += "&& '" + req.body.topics[i] + "'" + " in topics";
      }
    }
    if (req.body.type == "POST") {
      // fetch the subscribed users
      const subed_users = await Sub.find({ to_user: req.body.from_user });
      // send a notification to each subed
      for (let i = 0; i < subed_users.length; i++)
        await Notification.create({
          from_user: req.body.from_user,
          to_user: subed_users[i]._id,
          type: req.body.type,
          data: { post: req.body.post },
        });
    }
    // generate notification
    else
      await Notification.create({
        from_user: req.body.from_user,
        type: req.body.type,
        data: { post: req.body.post },
      });

    var message = {
      notification: {
        title: "Feecher",
      },
      data: { data: JSON.stringify(req.body) },
      condition: condition,
    };
    console.log(message);
    // Send a message to devices subscribed to the provided topic.
    admin
      .messaging()
      .send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log(message);
        console.log("Successfully sent message:", response);
        return res.json({ success: true, message: "API.BROADCASTED-TO-TOPIC" });
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  }

  async sendToUser(req, res) {
    try {
      let message = {
        data: { data: JSON.stringify(req.body) },
      };
      const options = {
        priority: "high",
        timeToLive: 60 * 60 * 24,
      };
      let registrationToken;
      message.notification = {
        title: "Feecher",
        body: req.body.body,
        sound: "default",
      };
      //generate notification
      // check if the notification is from postgres
      if (req.body.from) {
        // get the ids of both users
        req.body.from_user = (
          await User.findOne({ user_id: req.body.from_user }).select({ _id: 1 })
        )._id;
        req.body.to_user = (
          await User.findOne({ user_id: req.body.to_user }).select({ _id: 1 })
        )._id;
        console.log(req.body);
      }
      // generate notification
      await Notification.create({
        from_user: req.body.from_user,
        to_user: req.body.to_user,
        type: req.body.type,
        data: { post: req.body.post, numberOfUsers: req.body.numberOfUsers },
      });
      registrationToken = await this.fetchUserFirebaseToken(req.body.to_user);
      // check user config
      const user = await User.findOne({ _id: req.body.to_user });
      //TODO here
      if (
        (req.body.type == "UP" ||
          req.body.type == "DOWN" ||
          req.body.type == "MULTIUP" ||
          req.body.type == "MULTIDOWN") &&
        user.topAndDownNotification == false
      )
        return res.json({
          success: true,
          message: "API.NOTIFICATION-DISABLED",
        });
      if (req.body.type == "COMMENT" && user.commentsNotification == false)
        return res.json({
          success: true,
          message: "API.NOTIFICATION-DISABLED",
        });
      if (req.body.type == "VIEWS" && user.postViewsNotification == false)
        return res.json({
          success: true,
          message: "API.NOTIFICATION-DISABLED",
        });
      if (req.body.type == "SUPPORT" && user.supportNotification == false)
        return res.json({
          success: true,
          message: "API.NOTIFICATION-DISABLED",
        });

      if (registrationToken == null)
        return res.json({ success: true, message: "API.NO-FIREBASE-TOKEN" });
      // Send a message to the device corresponding to the provided
      // registration token.
      admin
        .messaging()
        .sendToDevice(registrationToken, message, options)
        .then((response) => {
          // Response is a message ID string.
          console.log(message);
          return res.json({ success: true });
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    } catch (e) {
      return res.json({ success: false });
    }
  }

  async subscribeToUser(req, res) {
    try {
      //generate the subscribtion
      //get the from and to mongo id
      const from_user = await User.findOne({ user_id: req.body.from_user });
      const to_user = await User.findOne({ user_id: req.body.to_user });
      //generate entry
      let promise_array = [];
      console.log(from_user);
      console.log(to_user);
      promise_array.push(
        await Sub.create({ from_user: from_user._id, to_user: to_user._id })
      );
      promise_array.push(
        await this.signToTopic(
          {
            topic: to_user._id,
            internal: true,
            token: await this.fetchUserFirebaseToken(from_user._id),
          },
          {}
        )
      );
      await Promise.all(promise_array);
      return res.json({ success: true, message: "API.USER-SUBSCRIBED" });
    } catch (err) {
      console.log(err);
      return res.json({ success: false, message: "API.SUBSCRIPTION-FAILED" });
    }
  }
  async unSubscribeFromUser(req,res){
    // fetch the sub
    try{
    const {sub_id} = req.body
    const sub = await Sub.findOne({_id:sub_id})

    // fetch the user mongo id
    const user = await User.findOne({_id:sub.from_user})

    // unsub from the topic
    this.unSignToTopic({
      body: { topic: sub.to_user, token: user.firebasetoken },
    });
    // delete the sub
    await Sub.deleteOne({_id:sub._id})

    return res.json({success:true,message:"API.UNSUBED"})

    }catch(err){
      console.log(err)
      return res.json({success:false,message:"INTERNAL-ERROR"})
    }
  }
}

module.exports = interestController;
