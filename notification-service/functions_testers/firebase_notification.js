var admin = require("firebase-admin");
var serviceAccount = require("../config/feechr-ebc42-firebase-adminsdk-9ncvy-da314cc0fe.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
 async function send_notification(title,body,data) {
    try{
        let message = {
                data
        };
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };
        let registrationToken;
    message.notification={title,body};

    //const user = await UsersModel.findOne({where:{user_id:to}});
    //console.log(user.dataValues.firebase_token)
        registrationToken =
          "e8Yip9BVRXSJeVPvxbp6kB:APA91bHcH5awMhsx9y28lDWvjyxEic98XOXItx5euti7fnOibYJLw2hc7o8-3LTBYkFjHk5RNCAOkaNPZyDatYE12ui_BYNePpOZT34oJd9rZ8yBKoUtsnBwOoqgWP5kuA3JiYamXCDz";
    //registrationToken="dDI5fm5dSUayjJK0Wwkvs1:APA91bF9LVJvosmbYnRaQs3M4Ig0u73BX_C-Njmh70A-M2Va3TQgUjPZitC-tJ69zl0O7kmNnLfcwBX_e8tyNvrGfmLveSbbPaXoaiPK2DoEiSMqDbQfaLNR2ye165nMRr6BCNLiGZPA";
        // Send a message to the device corresponding to the provided
        // registration token.
                    admin
                    .messaging()
                    .sendToDevice(registrationToken, message, options)
                    .then((response) => {
                        // Response is a message ID string.
                        console.log(message)
                        console.log("Successfully sent message: ", response);
                    })
                    .catch((error) => {
                        console.log("Error sending message:", error);
                    });
                }catch(e){
                    console.log(e);
                }
}

send_notification("test","test",{});