module.exports = (sequelize, DataTypes) => {
  const forgetPasswordModel = sequelize.define(
    "forgetPassword",
    {
      forgetPassword_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      codeGeneratedAt: {
        type: DataTypes.DATE
      },
      reset_code: {
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
      newPassword: {
        type: DataTypes.STRING
      },
      active: {
        type: DataTypes.STRING
      },
    },
    {
      tableName: "forgetPassword",
      timestamps: false
    }
  );

  return forgetPasswordModel;
};