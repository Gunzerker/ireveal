const UserModel = require('./users');
const interestModel = require('./interest');

module.exports = (sequelize, DataTypes) => {
    const userInterestsModel = sequelize.define(
        "user_interests",
        {
            userInterests_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            user_id: {
                type: DataTypes.INTEGER,

            },
            interest_id: {
                type: DataTypes.INTEGER,

            },
        },
        {
            tableName: "user_interests",
            timestamps: false,
        }
    );

    userInterestsModel.associate = function (models) {
        userInterestsModel.belongsTo(models.users, {
            foreignKey: "user_id",
            as: "user",
        });
        userInterestsModel.belongsTo(models.interest, {
            foreignKey: "interest_id",
            as: "interest",
        });
    };

    return userInterestsModel;
};