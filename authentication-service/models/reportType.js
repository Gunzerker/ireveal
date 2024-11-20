module.exports = (sequelize, DataTypes) => {
    const reportTypeModel = sequelize.define(
        "reportType",
        {
            reportType_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            tag_type: {
                type: DataTypes.STRING
            },
            parent_id: {
                type: DataTypes.INTEGER
            },
            active: {
                type: DataTypes.STRING
            },
        },
        {
            tableName: "reportType",
            timestamps: true
        }
    );

    reportTypeModel.associate = function (models) {
        reportTypeModel.belongsTo(models.reportType, {
            foreignKey: "parent_id",
            as: "parent_report",
        });
    };


    return reportTypeModel;
};