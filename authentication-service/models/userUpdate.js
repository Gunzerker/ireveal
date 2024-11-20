module.exports = (sequelize, DataTypes) => {
    const userUpdateModel = sequelize.define(
        "userUpdate",
        {
            userUpdate_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            generatedAt: {
                type: DataTypes.DATE
            },
            code: {
                type: DataTypes.STRING
            },
            email: {
                type: DataTypes.STRING
            },
            phone_number: {
                type: DataTypes.STRING
            },
            country_code: {
                type: DataTypes.STRING
            },
            user_id: {
                type: DataTypes.INTEGER
            },
            active: {
                type: DataTypes.STRING
            },
           
        },
        {
            tableName: "userUpdate",
            timestamps: true
        }
    );

    return userUpdateModel;
};