module.exports = (sequelize, DataTypes) => {
    const reportModel = sequelize.define(
        "report",
        {
            report_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            reportType_id: {
                type: DataTypes.INTEGER
            },
            user_reporting_id: {
                type: DataTypes.INTEGER
            },
            user_reported_id: {
                type: DataTypes.INTEGER
            },
            description: {
                type: DataTypes.STRING
            },
            active: {
                type: DataTypes.STRING
            },
        },
        {
            tableName: "report",
            timestamps: true
        }
    );

    reportModel.associate = function (models) {
        reportModel.belongsTo(models.reportType, {
            foreignKey: "reportType_id",
            as: "user_report",
        });
    };


    return reportModel;
};