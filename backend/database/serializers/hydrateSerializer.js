/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import prisma from '../../prisma';
import HydrateCourseSerializer from './hydrateCourseSerializer';
import HydrateProfSerializer from './hydrateProfSerializer';

/* eslint-disable no-underscore-dangle */
class HydrateSerializer {
  constructor(sectionModel) {
    this.courseSerializer = new HydrateCourseSerializer(sectionModel);
    this.profSerializer = new HydrateProfSerializer();
  }

  async bulkSerialize(instances) {
    const profs = instances.filter((instance) => { return instance._source.type === 'employee' });
    const courses = instances.filter((instance) => { return instance._source.type === 'class' });

    const profData = await prisma.professor.findMany({
      where: {
        id: {
          in: profs.map((prof) => prof._id),
        },
      },
    });

    const courseData = await prisma.course.findMany({
      where: {
        id: {
          in: courses.map((course) => course._id),
        },
      },
    });


    const serializedProfs = await this.profSerializer.bulkSerialize(profData);
    const serializedCourses = await this.courseSerializer.bulkSerialize(courseData);

    const serializedResults = { ...serializedProfs, ...serializedCourses };
    return instances.map((instance) => serializedResults[instance._id]).filter((elem) => elem);
  }
}

export default HydrateSerializer;
