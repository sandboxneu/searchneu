/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import _ from 'lodash';

import CourseSerializer from './courseSerializer';

class ElasticCourseSerializer extends CourseSerializer {
  courseProps() {
    return [];
  }

  finishCourseObj(course) {
    return _.pick(course, ['host', 'name', 'subject', 'classId', 'termId', 'nupath']);
  }

  finishSectionObj(section) {
    return _.pick(section, ['profs', 'online', 'classType', 'crn']);
  }
}

export default ElasticCourseSerializer;
