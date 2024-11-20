module.exports = (sequelize, DataTypes) => {
  const UserModel = sequelize.define(
    "users",
    {
      user_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      email: {
        type: DataTypes.STRING,
      },
      country_code: {
        type: DataTypes.STRING,
      },
      phone_number: {
        type: DataTypes.STRING,
      },
      username: {
        type: DataTypes.STRING,
      },
      fullName: {
        type: DataTypes.STRING,
      },
      dateOfBirth: {
        type: DataTypes.DATE,
      },
      password: {
        type: DataTypes.STRING,
      },
      socialMediaAuth: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gender: {
        type: DataTypes.STRING,
      },
      profileVisibility: {
        type: DataTypes.STRING,
      },
      isAnonymous: {
        type: DataTypes.BOOLEAN,
      },
      profile_image: {
        type: DataTypes.STRING,
      },
      profile_cover: {
        type: DataTypes.STRING,
      },
      followers_count: {
        type: DataTypes.INTEGER,
      },
      following_count: {
        type: DataTypes.INTEGER,
      },
      ups_count: {
        type: DataTypes.INTEGER,
      },
      downs_count: {
        type: DataTypes.INTEGER,
      },
      views_count: {
        type: DataTypes.INTEGER,
      },
      posts_count: {
        type: DataTypes.INTEGER,
      },
      address: {
        type: DataTypes.STRING,
      },
      country: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      longitude: {
        type: DataTypes.STRING,
      },
      latitude: {
        type: DataTypes.STRING,
      },
      profilLink: {
        type: DataTypes.STRING,
      },
      firebasetoken: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.STRING,
      },
      facebook: {
        type: DataTypes.STRING,
      },
      twitter: {
        type: DataTypes.STRING,
      },
      youtube: {
        type: DataTypes.STRING,
      },
      site: {
        type: DataTypes.STRING,
      },
      // interestsId is a string cause its passed as form-data that contains an array of intergers : "[4,5,6]"
      interestsId: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
      },
      active: {
        type: DataTypes.STRING,
      },
      hideEmail: {
        type: DataTypes.BOOLEAN,
      },
      hidePhoneNumber: {
        type: DataTypes.BOOLEAN,
      },
      whistleblowingNotification: {
        type: DataTypes.BOOLEAN,
      },
      alertNotification: {
        type: DataTypes.BOOLEAN,
      },
      commentsNotification: {
        type: DataTypes.BOOLEAN,
      },
      topAndDownNotification: {
        type: DataTypes.BOOLEAN,
      },
      postViewsNotification: {
        type: DataTypes.BOOLEAN,
      },
      getContentFromPublicNotification: {
        type: DataTypes.BOOLEAN,
      },
      supportNotification: {
        type: DataTypes.BOOLEAN,
      },
      muteNotification: {
        type: DataTypes.BOOLEAN,
      },
      socialMedia_id: {
        type: DataTypes.STRING,
      }
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );


  UserModel.associate = function (models) {
    UserModel.belongsToMany(models["interest"], {
      through: models["user_interests"],
      foreignKey: 'user_id',
      as: 'interests'
    })
  }

  return UserModel;
};