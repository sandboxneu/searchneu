/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.  */

import pMap from 'p-map';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import Keys from '../common/Keys';
import macros from './macros';
import { PrismaClient } from '@prisma/client';

class DumpProcessor {
  constructor() {
    this.CHUNK_SIZE = 5;
  }

  /**
   * @param {Object} termDump object containing all class and section data, normally acquired from scrapers
   * @param {Object} profDump object containing all professor data, normally acquired from scrapers
   */
  async main({ termDump = {}, profDump = {}, destroy = false }) {
    const prisma = new PrismaClient();
    const coveredTerms = new Set();

    console.log(Object.values(termDump.classes).length);

    /*
    await pMap(Object.values(profDump), async (prof) => {
      return prisma.professors.create({ data: this.processProf(prof) })
    }, { concurrency: this.CHUNK_SIZE })
    */

    await pMap(Object.values(termDump.classes), async (course) => {
      const courseData = this.processCourse(course, coveredTerms);
      return prisma.courses.upsert({
        where: { id: courseData.id },
        create: courseData,
        update: courseData,
      });
    }, { concurrency: this.CHUNK_SIZE });
    console.log("BIG CHUNGUS");


    /*
    const classPromises = _.chunk(termDump.classes, this.CHUNK_SIZE).map(async (classChunk) => {
      const processedChunk = classChunk.map((aClass) => { return this.processClass(aClass, coveredTerms); });
      return Course.bulkCreate(processedChunk, { updateOnDuplicate: courseAttributes });
    });
    const courseInstances = (await Promise.all(classPromises)).flat();

    const secPromises = _.chunk(termDump.sections, this.CHUNK_SIZE).map(async (secChunk) => {
      const processedChunk = secChunk.map((section) => { return this.processSection(section); });
      return Section.bulkCreate(processedChunk, { updateOnDuplicate: secAttributes });
    });
    await Promise.all(secPromises);

    // destroy courses that haven't been updated in over 2 days
    if (destroy) {
      await Course.destroy({
        where: {
          termId: { [Op.in]: Array.from(coveredTerms) },
          updatedAt: { [Op.lt]: new Date(new Date() - 48 * 60 * 60 * 1000) },
        },
      });
    }
    // Upsert ES
    await Course.bulkUpsertES(courseInstances);
    sequelize.options.logging = true;
    */
  }

  processProf(profInfo) {
    const additionalProps = { emails: { set: profInfo.emails }, createdAt: new Date(), updatedAt: new Date() };
    return _.omit({ ...profInfo, ...additionalProps }, ['title', 'interests', 'officeStreetAddress']);
  }

  processCourse(classInfo, coveredTerms) {
    coveredTerms.add(classInfo.termId);
    const additionalProps = { id: `${Keys.getClassHash(classInfo)}`, minCredits: Math.floor(classInfo.minCredits), maxCredits: Math.floor(classInfo.maxCredits), lastUpdateTime: new Date(classInfo.lastUpdateTime), createdAt: new Date(), updatedAt: new Date(), classAttributes: { set: classInfo.classAttributes }, nupath: { set: classInfo.nupath } };
    return { ...classInfo, ...additionalProps };
  }

  processSection(secInfo) {
    const additionalProps = { id: `${Keys.getSectionHash(secInfo)}`, classHash: Keys.getClassHash(secInfo) };
    return { ...secInfo, ...additionalProps };
  }
}

const instance = new DumpProcessor();

async function fromFile(termFilePath, empFilePath) {
  const termExists = await fs.pathExists(termFilePath);
  const empExists = await fs.pathExists(empFilePath);

  if (!termExists || !empExists) {
    macros.error('need to run scrape before indexing');
    return;
  }

  const termDump = await fs.readJson(termFilePath);
  const profDump = await fs.readJson(empFilePath);
  await instance.main({ termDump: termDump, profDump: profDump });
}

if (require.main === module) {
  // If called directly, attempt to index the dump in public dir
  const termFilePath = path.join(macros.PUBLIC_DIR, 'getTermDump', 'allTerms.json');
  const empFilePath = path.join(macros.PUBLIC_DIR, 'employeeDump.json');
  fromFile(termFilePath, empFilePath).catch(macros.error);
}

export default instance;
