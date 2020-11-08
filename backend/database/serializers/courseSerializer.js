/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import prisma from '../../prisma';

class CourseSerializer {
  // FIXME this pattern is bad
  async bulkSerialize(instances, all = false) {
    const courses = instances.map((course) => { return this.serializeCourse(course); });

    let sections;

    if (all) {
      sections = await prisma.section.findMany();
    } else {
      sections = await prisma.section.findMany({
        where: {
          classHash: { in: instances.slice(0, 100).map((instance) => instance.id) },
        },
      });
    }

    const classToSections = _.groupBy(sections, 'classHash');

    return _(courses).keyBy(this.getClassHash).mapValues((course) => {
      return this.bulkSerializeCourse(course, classToSections[this.getClassHash(course)] || []);
    }).value();
  }

  bulkSerializeCourse(course, sections) {
    const serializedSections = this.serializeSections(sections, course);

    return {
      class: course,
      sections: serializedSections,
      type: 'class',
    };
  }

  serializeSections(sections, parentCourse) {
    if (sections.length === 0) return sections;
    return sections.map((section) => { return this.serializeSection(section); }).map((section) => {
      return { ...section, ..._.pick(parentCourse, this.courseProps()) };
    });
  }

  serializeCourse(course) {
    // TODO unclear what type Prisma will return for lastUpdateTime
    course.lastUpdateTime = course.lastUpdateTime.getTime();
    course.desc = course.description;
    return this.finishCourseObj(course);
  }

  serializeSection(section) {
    return this.finishSectionObj(section);
  }

  // TODO this should definitely be eliminated
  getClassHash(course) {
    return ['neu.edu', course.termId, course.subject, course.classId].join('/');
  }

  courseProps() {
    throw new Error('not implemented');
  }

  finishCourseObj() {
    throw new Error('not implemented');
  }

  finishSectionObj() {
    throw new Error('not implemented');
  }
}

export default CourseSerializer;
