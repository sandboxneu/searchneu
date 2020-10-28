/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import _ from 'lodash';
import CourseSerializer from './courseSerializer';

class HydrateCourseSerializer extends CourseSerializer {
  courseProps() {
    return ['lastUpdateTime', 'termId', 'host', 'subject', 'classId'];
  }

  finishCourseObj(course) {
    return course;
  }

  finishSectionObj(section) {
    return _.omit(section, ['id', 'classHash']);
  }
}

export default HydrateCourseSerializer;
