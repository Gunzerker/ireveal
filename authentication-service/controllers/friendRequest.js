const models = require("../models/db_init");
const friendRequestModel = models["friendRequest"];
const UserModel = models["users"];
const interestModel = models["interest"]
const config = require("../config/config.json")

const ApiBaseController = require("./ApiBaseController");
const { Op } = require("sequelize");
const { counterFollowers, counterFollowing } = require("../functions/counter");
const axios = require("axios")
// const firebase_notification = require("../functions/firebase_notification");

class roleController extends ApiBaseController {
    constructor() {
        super();
        this.entity_model = friendRequestModel;
        this.entity_id_name = "friendRequest_id";
        this.list_includes = [
            {
                model: UserModel,
                as: "from_user",
            },
            {
                model: UserModel,
                as: "to_user",
            }
        ]
    }

    async followRequest(req, res) {
        try {
            const { payload: { obj } } = req;
            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }
            const user = await UserModel.findOne({ where: { user_id: destination } })
            if (!user) {
                return res.status(400).json({
                    status: true,
                    message: "USER.NOT.EXIST",
                    data: null
                });
            }
            const date_following = new Date().toISOString();
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })
            if (user.dataValues.profileVisibility == "public") {
                if (!check) {
                    // first time relation 
                    const sendRequest = await friendRequestModel.create({ from_user_id: obj.user_id, to_user_id: destination, date_following: date_following, following_status: "following" })
                    const incrementMe = counterFollowers(destination, 1);
                    const incrementHim = counterFollowing(obj.user_id, 1);
                    let promises = [sendRequest, incrementMe, incrementHim];
                    const result = await Promise.all(promises)
                    // GENERATE NOTIFICATION
                    await axios.post(
                    `${config.notif_service_url}api/notifications/sendToUser`,
                    {
                        from_user: obj.user_id,
                        to_user: destination,
                        type: "FOLLOW",
                        from:"pg",
                    }
                    );
                    return res.status(201).json({
                        status: true,
                        message: "FRIEND.REQUEST.SUCCESS",
                        data: result[0].dataValues
                    });
                } else {
                    // if request didnt get blocked
                    if (check.dataValues.following_status != 'blocking' && check.dataValues.following_status != 'blocked') {
                        // relation already exist need to be updated
                        const sendRequest = await friendRequestModel.update({ date_following, following_status: "following" }, {
                            where: {
                                [Op.and]: {
                                    from_user_id: obj.user_id,
                                    to_user_id: destination
                                }
                            }, returning: true, plain: true
                        })
                        const incrementMe = counterFollowers(destination, 1);
                        const incrementHim = counterFollowing(obj.user_id, 1);
                        let promises = [sendRequest, incrementMe, incrementHim];
                        const result = await Promise.all(promises)
                        // GENERATE NOTIFICATION
                        await axios.post(
                        `${config.notif_service_url}api/notifications/sendToUser`,
                        {
                            from_user: obj.user_id,
                            to_user: destination,
                            type: "FOLLOW",
                            from: "pg",
                        }
                        );
                        return res.status(201).json({
                            status: true,
                            message: "FRIEND.REQUEST.SUCCESS",
                            data: result[0][1].dataValues
                        });
                    } else {
                        console.log("request may be canceled or user have been blocked");
                        throw new Error("userBlockError")
                    }
                }
            }
            if (user.dataValues.profileVisibility == "private") {

                if (!check) {
                    // first time relation 
                    const sendRequest = await friendRequestModel.create({ from_user_id: obj.user_id, to_user_id: destination, following_status: "sentRequest" })
                    let promises = [sendRequest];
                    const result = await Promise.all(promises)
                    // GENERATE NOTIFICATION PRIVATE
                    await axios.post(
                      `${config.notif_service_url}api/notifications/sendToUser`,
                      {
                        from_user: obj.user_id,
                        to_user: destination,
                        type: "FOLLOW-REQUEST",
                        from: "pg",
                      }
                    );
                    return res.status(201).json({
                        status: true,
                        message: "FRIEND.REQUEST.SUCCESS",
                        data: result[0].dataValues
                    });
                } else {
                  // relation already exist need to be updated
                  const sendRequest = await friendRequestModel.update(
                    { following_status: "sentRequest" },
                    {
                      where: {
                        [Op.and]: {
                          from_user_id: obj.user_id,
                          to_user_id: destination,
                        },
                      },
                      returning: true,
                      plain: true,
                    }
                  );
                  let promises = [sendRequest];
                  const result = await Promise.all(promises);
                  // GENERATE NOTIFICATION PRIVATE
                  await axios.post(
                    `${config.notif_service_url}api/notifications/sendToUser`,
                    {
                      from_user: obj.user_id,
                      to_user: destination,
                      type: "FOLLOW-REQUEST",
                      from: "pg",
                    }
                  );
                  return res.status(201).json({
                    status: true,
                    message: "FRIEND.REQUEST.SUCCESS",
                    data: result[0][1].dataValues,
                  });
                }
            }


        } catch (error) {
            console.log("error addFriend :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async acceptFollowRequest(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            const date_following = new Date().toISOString();
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'sentRequest' },
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })

            if (check) {
                // relation already exist need to be updated
                const sendRequest = await check.update({ date_following, following_status: "following" }, {
                    returning: true, plain: true
                })
                const incrementMe = counterFollowers(obj.user_id, 1);
                const incrementHim = counterFollowing(destination, 1);
                let promises = [sendRequest, incrementMe, incrementHim];
                const result = await Promise.all(promises)
                return res.status(201).json({
                    status: true,
                    message: "ACCEPT.REQUEST.SUCCESS",
                    data: result[0].dataValues
                });
            } else {
                console.log("request may be canceled or user have been blocked");
                throw new Error("sentRequestNotFound")
            }
        } catch (error) {
            console.log("error accept friend :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async deleteFollowRequest(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            const date_following = new Date().toISOString();
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'sentRequest' },
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })

            if (check) {
                // relation already exist need to be updated
                const sendRequest = await check.update({ date_following, following_status: null }, {
                    returning: true, plain: true
                })
                let promises = [sendRequest];
                const result = await Promise.all(promises)
                return res.status(201).json({
                    status: true,
                    message: "DELETE.REQUEST.SUCCESS",
                    data: result[0].dataValues
                });
            } else {
                throw new Error("sentRequestNotFound")
            }
        } catch (error) {
            console.log("error delete request :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async cancelFollowRequest(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'sentRequest' },
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })
            if (check) {
                const cancelRequest = await check.update({ following_status: null }, {
                    returning: true, plain: true
                })
                return res.status(201).send({
                    status: true,
                    data: cancelRequest,
                    message: "API.CANCEL.REQUEST",
                });
            } else {
                throw new Error("cancelFollowRequestError")
            }
        } catch (error) {
            console.log("error cancel request :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }


    async unfollowing(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            const date_unfollowing = new Date().toISOString();
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'following' },
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })
            if (check) {
                const unfollow = await check.update({ following_status: null, date_unfollowing }, {
                    returning: true, plain: true
                })
                const incrementHim = counterFollowers(destination, -1);
                const incrementMe = counterFollowing(obj.user_id, -1);
                let promises = [unfollow, incrementMe, incrementHim];
                const result = await Promise.all(promises)

                return res.status(201).send({
                    status: true,
                    data: result[0].dataValues,
                    message: "API.UNFOLLOW.REQUEST",
                });
            } else {
                throw new Error("unfollowError")
            }
        } catch (error) {
            console.log("error cancel request :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }

    }

    async deleteFollower(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }
            const date_unfollowing = new Date().toISOString();
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'following' },
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })
            if (check) {
                let promise_array = []
                promise_array.push (await check.update({ following_status: null, date_unfollowing }, {
                    returning: true, plain: true
                }))
                promise_array.push(
                  await UserModel.decrement(
                    { "followers_count": 1 },
                    { where: { user_id: obj.user_id } }
                  )
                );
                promise_array.push(
                    await UserModel.decrement(
                      { "following_count": 1 },
                      { where: { user_id: destination } }
                    )
                  );
                const returned_promise = await Promise.all(promise_array)
                return res.status(201).send({
                  status: true,
                  data: returned_promise[0],
                  message: "API.DELETE.FOLLOWER.REQUEST",
                });
            } else {
                throw new Error("deleteFollowerError")
            }

        } catch (error) {
            console.log("error delete follower error :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async blockUser(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }
            // check relation between me and destination
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })

            // reversecheck relation between me and destination
            const reverseCheck = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })



            // in case there is no relation create both
            if (!check && !reverseCheck) {
                const blocking = await friendRequestModel.create({ from_user_id: obj.user_id, to_user_id: destination, following_status: "blocking" })
                const blocked = await friendRequestModel.create({ from_user_id: destination, to_user_id: obj.user_id, following_status: "blocked" })
                let promises = [blocking, blocked];
                const result = await Promise.all(promises)
                return res.status(201).send({
                    status: true,
                    data: result,
                    message: "API.BLOCK.SUCCESS",
                });
            }
            // in case there is relation update one and create the missing one
            if (check && !reverseCheck) {
                // verif following status to decrement its counter
                if (check.dataValues.following_status == "following") {
                    const decrementHim = counterFollowers(destination, -1);
                    const decrementMe = counterFollowing(obj.user_id, -1);
                }

                const blocking = await check.update({ following_status: "blocking" })
                const blocked = await friendRequestModel.create({ from_user_id: destination, to_user_id: obj.user_id, following_status: "blocked" })
                let promises = [blocking, blocked];
                const result = await Promise.all(promises)

                return res.status(201).send({
                    status: true,
                    data: result,
                    message: "API.BLOCK.SUCCESS",
                });
            }
            // in case there is relation update one and create the missing one
            if (!check && reverseCheck) {

                // verif following status to decrement its counter
                if (reverseCheck.dataValues.following_status == "following") {
                    const decrementMe = counterFollowers(obj.user_id, -1);
                    const decrementHim = counterFollowing(destination, -1);
                }
                const blocking = await friendRequestModel.create({ from_user_id: obj.user_id, to_user_id: destination, following_status: "blocking" })
                const blocked = await reverseCheck.update({ following_status: "blocked" })
                let promises = [blocking, blocked];
                const result = await Promise.all(promises)

                return res.status(201).send({
                    status: true,
                    data: result,
                    message: "API.BLOCK.SUCCESS",
                });
            }
            // in case there is relation update both
            if (check && reverseCheck) {
                // verif following status to decrement its counter
                if (check.dataValues.following_status == "following") {
                    const decrementHim = counterFollowers(destination, -1);
                    const decrementMe = counterFollowing(obj.user_id, -1);
                }
                // verif following status to decrement its counter
                if (reverseCheck.dataValues.following_status == "following") {
                    const decrementMe = counterFollowers(obj.user_id, -1);
                    const decrementHim = counterFollowing(destination, -1);
                }
                const blocking = await check.update({ following_status: "blocking" })
                const blocked = await reverseCheck.update({ following_status: "blocked" })
                let promises = [blocking, blocked];
                const result = await Promise.all(promises)

                return res.status(201).send({
                    status: true,
                    data: result,
                    message: "API.BLOCK.SUCCESS",
                });
            }

        } catch (error) {
            console.log("error block user error :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async unblockUser(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'blocking' },
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })

            const reverseCheck = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        following_status: { [Op.like]: 'blocked' },
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })

            if (check) {
                // relation already exist need to be updated
                const sendRequest_1 = await check.update({ following_status: null }, {
                    returning: true, plain: true
                })

                const sendRequest_2 = await reverseCheck.update({ following_status: null }, {
                    returning: true, plain: true
                })

                let promises = [sendRequest_1, sendRequest_2];
                const result = await Promise.all(promises)
                return res.status(201).json({
                    status: true,
                    message: "UNBLOCK.REQUEST.SUCCESS",
                    data: result
                });
            } else {
                return res.status(400).json({
                    status: false,
                    message: "API.BAD.REQUEST",
                    data: null
                });
            }

        } catch (error) {
            console.log("error block user error :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

    async fetchDestinationProfil(req, res) {
        try {
            const { payload: { obj } } = req;

            const { destination } = req.body;
            if (!destination) {
                return res.status(400).send({
                    status: false,
                    message: "API.ENTER.ENTITYDATA",
                    data: null
                });
            }

            // check relation between me and destination
            const currentProfil = await UserModel.findOne({
                where: {
                    user_id: obj.user_id
                },
                attributes: { exclude: ["password"] }
            })

            // check relation between me and destination
            const destinationProfil = await UserModel.findOne({
                where: {
                    user_id: destination
                },
                attributes: { exclude: ["password"] }
            })

            // check relation between me and destination
            const check = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        from_user_id: obj.user_id,
                        to_user_id: destination
                    }
                }
            })


            // reversecheck relation between me and destination
            const reverseCheck = await friendRequestModel.findOne({
                where: {
                    [Op.and]: {
                        from_user_id: destination,
                        to_user_id: obj.user_id
                    }
                }
            })

            let promises = [currentProfil, destinationProfil, check, reverseCheck];
            const result = await Promise.all(promises)
            //get the destination profile interests
            let interestsId = JSON.parse(result[1].dataValues.interestsId);
            let interests = []
            for(let i=0 ; i<interestsId.length ; i++){
                interests.push(
                  await interestModel.findOne({
                    where: { interest_id: interestsId [i]},
                  })
                );
            }
            result[1].dataValues.interests = interests;
            return res.status(201).send({
                status: true,
                data: { "currentProfil": result[0].dataValues, "destinationProfil": result[1].dataValues, "check": check, "reverseCheck": reverseCheck },
                message: "API.FETCH.RELATION",
            });

        } catch (error) {
            console.log("error fetch relation :", error);
            return res.status(400).send({
                status: false,
                message: "API.BAD.REQUEST",
                data: null
            })
        }
    }

}

module.exports = roleController;