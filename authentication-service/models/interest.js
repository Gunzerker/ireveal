module.exports = (sequelize, DataTypes) => {
    const interestModel = sequelize.define(
      "interest",
      {
        interest_id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER
        },
        interestName: {
          type: DataTypes.STRING
        },
        interestIconeUrl: {
          type: DataTypes.STRING
        },
        interestImageUrl: {
          type: DataTypes.STRING
        },
        active: {
          type: DataTypes.STRING
        },
        language:{
          type:DataTypes.STRING
        }
      },
      {
        tableName: "interest",
        timestamps: false
      }
    );
  
    interestModel.associate = function (models) {
      interestModel.belongsToMany(models["users"], {
        through: models["user_interests"],
        foreignKey: 'interest_id',
        as: 'users'
      })
    }
  
    return interestModel;
  };