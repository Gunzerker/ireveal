module.exports = (sequelize, DataTypes) => {
    const verifCodeModel = sequelize.define(
        "verifCode",
        {
            verifCode_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            generatedAt: {
                type: DataTypes.DATE
            },
            socialMediaAuth: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            verifCode: {
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
            status: {
                type: DataTypes.STRING
            },
            active: {
                type: DataTypes.STRING
            },
        },
        {
            tableName: "verifCode",
            timestamps: false
        }
    );

    return verifCodeModel;
};