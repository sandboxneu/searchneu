import elastic from '../../libs/elastic';
import ElasticCourseSerializer from '../serializers/elasticCourseSerializer';

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define('Course', {
    id: {
      allowNull: false,
      autoIncrement: false,
      primaryKey: true,
      type: DataTypes.STRING,
    },
    maxCredits: DataTypes.INTEGER,
    minCredits: DataTypes.INTEGER,
    desc: DataTypes.TEXT,
    classId: DataTypes.STRING,
    url: DataTypes.STRING,
    prettyUrl: DataTypes.STRING,
    name: DataTypes.STRING,
    lastUpdateTime: DataTypes.DATE,
    termId: DataTypes.STRING,
    host: DataTypes.STRING,
    subject: DataTypes.STRING,
    prereqs: DataTypes.JSON,
    coreqs: DataTypes.JSON,
    prereqsFor: DataTypes.JSON,
    optPrereqsFor: DataTypes.JSON,
    classAttributes: DataTypes.ARRAY(DataTypes.STRING),
    feeAmount: DataTypes.INTEGER,
    feeDescription: DataTypes.STRING,
    nupath: DataTypes.ARRAY(DataTypes.STRING),
  }, {});

  Course.associate = (models) => {
    Course.belongsToMany(models.User, {
      through: 'FollowedCourse',
      as: 'followers',
      foreignKey: 'courseId',
    });

    Course.hasMany(models.Section, {
      foreignKey: 'classHash',
    });
  };

  Course.bulkUpsertES = async (instances) => {
    const bulkCourses = await (new ElasticCourseSerializer(sequelize.models.Section)).bulkSerialize(instances);
    return elastic.bulkIndexFromMap(elastic.CLASS_INDEX, bulkCourses);
  };

  // Upserting to ES requires querying for sections. On create, we don't have sections in the db yet,
  //    and the foreign key constraint means we cannot put sections in before courses
  // Course.addHook('afterBulkCreate', async (instances) => { return Course.bulkUpsertES(instances); });

  Course.addHook('afterBulkUpdate', async ({ where }) => { return Course.bulkUpsertES(await Course.findAll({ where: where }), true); });

  return Course;
};
