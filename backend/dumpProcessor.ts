/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.  */

import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import {
  ProfessorCreateInput, CourseCreateInput, SectionCreateInput,
} from '@prisma/client';
import prisma from './prisma';
import Keys from '../common/Keys';
import macros from './macros';
import { populateES } from './scripts/populateES';

type Maybe<T> = T | null | undefined;

class DumpProcessor {
  CHUNK_SIZE: number;

  constructor() {
    this.CHUNK_SIZE = 5;
  }

  /**
   * @param {Object} termDump object containing all class and section data, normally acquired from scrapers
   * @param {Object} profDump object containing all professor data, normally acquired from scrapers
   * @param {boolean} destroy determines if courses that haven't been updated for the last two days will be removed from the database
   */
  async main({
    termDump = { classes: {}, sections: {} },
    profDump = {},
    destroy = false,
  }) {
    const profTransforms = {
      big_picture_url: this.strTransform,
      email: this.strTransform,
      emails: this.arrayTransform,
      emails_contents: this.arrayStrTransform,
      first_name: this.strTransform,
      name: this.strTransform,
      google_scholar_id: this.strTransform,
      id: this.strTransform,
      last_name: this.strTransform,
      link: this.strTransform,
      office_room: this.strTransform,
      personal_site: this.strTransform,
      phone: this.strTransform,
      pic: this.jsonTransform,
      primary_department: this.strTransform,
      primary_role: this.strTransform,
      street_address: this.strTransform,
      url: this.strTransform,
    };

    const profCols = ['big_picture_url', 'email', 'emails', 'first_name', 'google_scholar_id', 'id', 'last_name', 'link', 'name', 'office_room', 'personal_site', 'phone', 'pic', 'primary_department', 'primary_role', 'street_address', 'url'];

    const courseTransforms = {
      class_attributes: this.arrayTransform,
      class_attributes_contents: this.arrayStrTransform,
      class_id: this.strTransform,
      coreqs: this.jsonTransform,
      description: this.strTransform,
      fee_amount: this.intTransform,
      fee_description: this.strTransform,
      host: this.strTransform,
      id: this.strTransform,
      last_update_time: this.dateTransform,
      max_credits: this.intTransform,
      min_credits: this.intTransform,
      name: this.strTransform,
      nupath: this.arrayTransform,
      nupath_contents: this.arrayStrTransform,
      opt_prereqs_for: this.jsonTransform,
      prereqs: this.jsonTransform,
      prereqs_for: this.jsonTransform,
      pretty_url: this.strTransform,
      subject: this.strTransform,
      term_id: this.strTransform,
      url: this.strTransform,
    };

    const courseCols = ['class_attributes', 'class_id', 'coreqs', 'description', 'fee_amount', 'fee_description', 'host', 'id', 'last_update_time', 'max_credits', 'min_credits', 'name', 'nupath', 'opt_prereqs_for', 'prereqs', 'prereqs_for', 'pretty_url', 'subject', 'term_id', 'url'];

    const sectionTransforms = {
      class_hash: this.strTransform,
      class_type: this.strTransform,
      crn: this.strTransform,
      honors: this.boolTransform,
      id: this.strTransform,
      info: this.strTransform,
      meetings: this.jsonTransform,
      online: this.boolTransform,
      profs: this.arrayTransform,
      profs_contents: this.arrayStrTransform,
      seats_capacity: this.intTransform,
      seats_remaining: this.intTransform,
      url: this.strTransform,
      wait_capacity: this.intTransform,
      wait_remaining: this.intTransform,
    };

    const sectionCols = ['class_hash', 'class_type', 'crn', 'honors', 'id', 'info', 'meetings', 'online', 'profs', 'seats_capacity', 'seats_remaining', 'url', 'wait_capacity', 'wait_remaining'];

    const coveredTerms: Set<string> = new Set();

    await Promise.all(_.chunk(Object.values(profDump), 2000).map(async (profs) => {
      await prisma.$executeRaw(this.bulkUpsert('professors', profCols, profTransforms, profs));
    }));

    macros.log('finished with profs');

    await Promise.all(_.chunk(Object.values(termDump.classes), 2000).map(async (courses) => {
      await prisma.$executeRaw(this.bulkUpsert('courses', courseCols, courseTransforms, courses.map((c) => this.constituteCourse(c, coveredTerms))));
    }));

    macros.log('finished with courses');

    await Promise.all(_.chunk(Object.values(termDump.sections), 2000).map(async (sections) => {
      await prisma.$executeRaw(this.bulkUpsert('sections', sectionCols, sectionTransforms, sections.map((s) => this.constituteSection(s))));
    }));

    macros.log('finished with sections');

    if (destroy) {
      await prisma.course.deleteMany({
        where: {
          termId: { in: Array.from(coveredTerms) },
          lastUpdateTime: { lt: new Date(new Date().getTime() - 48 * 60 * 60 * 1000) },
        },
      });
    }

    macros.log('finished cleaning up');

    await populateES();
  }

  bulkUpsert(tableName: string, columnNames: string[], valTransforms: Record<string, Function>, vals: any[]): any {
    let query = `INSERT INTO ${tableName} (${columnNames.join(',')}) VALUES `;
    query += vals.map((val) => {
      return `(${columnNames.map((c) => valTransforms[c](val[this.toCamelCase(c)], c, valTransforms)).join(',')})`;
    }).join(',');

    query += ` ON CONFLICT (id) DO UPDATE SET ${columnNames.map((c) => `${c} = excluded.${c}`).join(',')} WHERE ${tableName}.id = excluded.id;`;
    return query;
  }

  strTransform(val: Maybe<string>): string {
    return val ? `'${val.replace(/'/g, "''")}'` : '\'\'';
  }

  arrayStrTransform(val: Maybe<string>): string {
    return val ? `"${val}"` : '\'\'';
  }

  intTransform(val: Maybe<number>): string {
    return val || val === 0 ? `${val}` : 'NULL';
  }

  arrayTransform(val: Maybe<any[]>, kind: string, transforms: Record<string, Function>): string {
    return val && val.length !== 0 ? `'{${val.map((v) => transforms[`${kind}_contents`](v, `${kind}_contents`, transforms)).join(',')}}'` : 'array[]::text[]';
  }

  jsonTransform(val: Maybe<any>): string {
    return val ? `'${JSON.stringify(val)}'` : '\'{}\'';
  }

  dateTransform(val: Maybe<any>): string {
    return val ? `to_timestamp(${val / 1000})` : 'now()';
  }

  boolTransform(val: Maybe<any>): string {
    return val ? 'TRUE' : 'FALSE';
  }

  processProf(profInfo: any): ProfessorCreateInput {
    const correctedQuery = { ...profInfo, emails: { set: profInfo.emails } };
    return _.omit(correctedQuery, ['title', 'interests', 'officeStreetAddress']) as ProfessorCreateInput;
  }

  processCourse(classInfo: any, coveredTerms: Set<string> = new Set()): CourseCreateInput {
    coveredTerms.add(classInfo.termId);

    const additionalProps = {
      id: `${Keys.getClassHash(classInfo)}`,
      description: classInfo.desc,
      minCredits: Math.floor(classInfo.minCredits),
      maxCredits: Math.floor(classInfo.maxCredits),
      lastUpdateTime: new Date(classInfo.lastUpdateTime),
    };

    const correctedQuery = {
      ...classInfo,
      ...additionalProps,
      classAttributes: { set: classInfo.classAttributes || [] },
      nupath: { set: classInfo.nupath || [] },
    };

    const { desc, ...finalCourse } = correctedQuery;

    return finalCourse;
  }

  constituteCourse(classInfo: any, coveredTerms: Set<string> = new Set()): CourseCreateInput {
    coveredTerms.add(classInfo.termId);

    const additionalProps = {
      id: `${Keys.getClassHash(classInfo)}`,
      description: classInfo.desc,
      minCredits: Math.floor(classInfo.minCredits),
      maxCredits: Math.floor(classInfo.maxCredits),
    };

    const correctedQuery = {
      ...classInfo,
      ...additionalProps,
      classAttributes: classInfo.classAttributes || [],
      nupath: classInfo.nupath || [],
    };

    const { desc, ...finalCourse } = correctedQuery;

    return finalCourse;
  }

  processSection(secInfo: any): SectionCreateInput {
    const additionalProps = { id: `${Keys.getSectionHash(secInfo)}`, classHash: Keys.getClassHash(secInfo), profs: { set: secInfo.profs || [] } };
    return _.omit({ ...secInfo, ...additionalProps }, ['classId', 'termId', 'subject', 'host']) as SectionCreateInput;
  }

  constituteSection(secInfo: any): SectionCreateInput {
    const additionalProps = { id: `${Keys.getSectionHash(secInfo)}`, classHash: Keys.getClassHash(secInfo) };
    return _.omit({ ...secInfo, ...additionalProps }, ['classId', 'termId', 'subject', 'host']) as SectionCreateInput;
  }

  toCamelCase(str: string): string {
    return str.replace(/(_[a-z])/g, (group) => group.toUpperCase().replace('_', ''));
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
