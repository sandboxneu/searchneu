/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 *
 * script to fill elasticsearch by quering postgres
 */
import { PrismaClient, Course, Professor } from '@prisma/client';

import elastic from '../elastic';
import ElasticCourseSerializer from '../database/serializers/elasticCourseSerializer';
import ElasticProfSerializer from '../database/serializers/elasticProfSerializer';
import macros from '../macros';

export async function bulkUpsertCourses(courses: Course[]): Promise<void> {
  // FIXME this pattern is bad
  const serializedCourses = await ((new ElasticCourseSerializer()).bulkSerialize(courses, true));
  return elastic.bulkIndexFromMap(elastic.CLASS_INDEX, serializedCourses);
}

export async function bulkUpsertProfs(profs: Professor[]): Promise<void> {
  const serializedProfs = await ((new ElasticProfSerializer()).bulkSerialize(profs));
  return elastic.bulkIndexFromMap(elastic.EMPLOYEE_INDEX, serializedProfs);
}

export async function populateES(): Promise<void> {
  const prisma = new PrismaClient();
  const [courses, professors] = await Promise.all([prisma.course.findMany(), prisma.professor.findMany()]);
  console.log('querying for stuff');
  console.log(await prisma.$queryRaw(`SELECT pid, query, state FROM pg_stat_activity WHERE state = 'active';`));
  console.log('finished querying for said stuff');
  // await prisma.$disconnect();
  await Promise.all([bulkUpsertCourses(courses), bulkUpsertProfs(professors)]);
  

  // await bulkUpsertCourses(await prisma.course.findMany());
  // await bulkUpsertProfs(await prisma.professor.findMany());
  // await prisma.$disconnect();
}

if (require.main === module) {
  macros.log(`Populating ES at ${macros.getEnvVariable('elasticURL')} from Postgres at ${macros.getEnvVariable('dbHost')}`);
  (async () => populateES())().catch((e) => macros.error(e));
}
