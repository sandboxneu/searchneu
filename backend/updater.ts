/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';

import macros from './macros';
import prisma from './prisma';
import Keys from '../common/Keys';
import notifyer from './notifyer';
import dumpProcessor from './dumpProcessor';
import HydrateCourseSerializer from './database/serializers/hydrateCourseSerializer';
import termParser from './scrapers/classes/parsersxe/termParser';
import { Course as CourseType, Section as SectionType } from './types';

// ======= TYPES ======== //
// A collection of structs for simpler querying of pre-scrape data
interface OldData {
  oldWatchedClasses: Record<string, CourseType>,
  oldWatchedSections: Record<string, SectionType>,
  oldSectionsByClass: Record<string, string[]>
}

// A serialized result, the result of scrapers and serializing search results
interface SerializedResult {
  class: CourseType,
  sections: SectionType[]
}

// Stores the information regarding a change to a course or section
export type Notification = CourseNotification | SectionNotification;

// marks new sections being added to a Course
interface CourseNotification {
  type: 'Course',
  course: CourseType,
  count: number,
}

// marks seats becoming available in a section
interface SectionNotification {
  type: 'Section',
  section: SectionType,
}

// the types of models/records that a user can follow
type ModelName = 'course' | 'section';

class Updater {
  // produce a new Updater instance
  COURSE_MODEL: ModelName;

  SECTION_MODEL: ModelName;

  SEM_TO_UPDATE: string;

  static create() {
    return new this();
  }

  // DO NOT call the constructor, instead use .create
  constructor() {
    this.COURSE_MODEL = 'course';
    this.SECTION_MODEL = 'section';
    this.SEM_TO_UPDATE = '202110';
  }

  // TODO must call this in server
  async start() {
    // 5 min if prod, 30 sec if dev.
    // In dev the cache will be used so we are not actually hitting NEU's servers anyway.
    const intervalTime = macros.PROD ? 300000 : 30000;

    setInterval(() => {
      try {
        this.update();
      } catch (e) {
        macros.warn('Updater failed with: ', e);
      }
    }, intervalTime);
    this.update();
  }

  // Update classes and sections users are watching and notify them if seats have opened up
  async update() {
    macros.log('updating');

    const startTime = Date.now();

    const classHashToUsers: Record<string, string[]> = await this.modelToUserHash(this.COURSE_MODEL);
    const sectionHashToUsers: Record<string, string[]> = await this.modelToUserHash(this.SECTION_MODEL);

    const classHashes: string[] = Object.keys(classHashToUsers);
    const sectionHashes: string[] = Object.keys(sectionHashToUsers);

    if (classHashes.length === 0 && sectionHashes.length === 0) {
      return;
    }

    macros.log('watching classes ', classHashes.length);

    const { oldWatchedClasses, oldWatchedSections, oldSectionsByClass } = await this.getOldData(classHashes);

    // Track all section hashes of classes that are being watched. Used for sanity check
    const sectionHashesOfWatchedClasses: string[] = Object.keys(oldWatchedSections);

    // Sanity check: Find the sections that are being watched, but are not part of a watched class
    for (const sectionHash of _.difference(sectionHashes, sectionHashesOfWatchedClasses)) {
      macros.warn('Section', sectionHash, "is being watched but it's class is not being watched?");
    }

    // scrape everything
    const sections: SectionType[] = await termParser.parseSections(this.SEM_TO_UPDATE);
    const newSectionsByClass: Record<string, string[]> = {};

    for (const sec of sections) {
      const hash: string = Keys.getClassHash(sec);
      if (!newSectionsByClass[hash]) newSectionsByClass[hash] = [];
      newSectionsByClass[hash].push(Keys.getSectionHash(sec));
    }

    const notifications: Notification[] = [];

    Object.entries(newSectionsByClass).forEach(([classHash, secHashes]) => {
      if (!oldSectionsByClass[classHash] || !classHashToUsers[classHash]) return;
      const sectionDiffCount: number = secHashes.filter((hash: string) => !oldSectionsByClass[classHash].includes(hash)).length;
      if (sectionDiffCount > 0) {
        notifications.push({ type: 'Course', course: oldWatchedClasses[classHash], count: sectionDiffCount });
      }
    });

    sections.forEach((sec: SectionType) => {
      if (!oldWatchedSections[Keys.getSectionHash(sec)] || !sectionHashToUsers[Keys.getSectionHash(sec)]) return;

      const oldSection: SectionType = oldWatchedSections[Keys.getSectionHash(sec)];
      if ((sec.seatsRemaining > 0 && oldSection.seatsRemaining <= 0) || (sec.waitRemaining > 0 && oldSection.waitRemaining <= 0)) {
        notifications.push({ type: 'Section', section: sec });
      }
    });

    await this.sendMessages(notifications, classHashToUsers, sectionHashToUsers);
    await dumpProcessor.main({ termDump: { sections, classes: {} } });

    const totalTime = Date.now() - startTime;

    macros.log(`Done running updater onInterval. It took ${totalTime} ms. Updated ${sections.length} sections and sent ${notifications.length} messages.`);

    macros.logAmplitudeEvent('Updater', {
      totalTime: totalTime,
      sent: notifications.length,
    });
  }

  // Return an Object of the list of users associated with what class or section they are following
  async modelToUserHash(modelName: ModelName): Promise<Record<string, string[]>> {
    const columnName = `${modelName}_id`;
    const pluralName = `${modelName}s`;
    const dbResults = await prisma.$queryRaw(`SELECT ${columnName}, ARRAY_AGG("user_id") FROM followed_${pluralName} GROUP BY ${columnName}`);
    return Object.assign({}, ...dbResults.map((res) => ({ [res[columnName]]: res.array_agg.sort() })));
  }


  // return a collection of data structures used for simplified querying of data
  async getOldData(classHashes: string[]): Promise<OldData> {
    const oldDocs: Record<string, SerializedResult> = await (new HydrateCourseSerializer()).bulkSerialize(await prisma.course.findMany({ where: { id: { in: classHashes } } }));

    const oldWatchedClasses: Record<string, CourseType> = {};
    for (const [classHash, doc] of Object.entries(oldDocs)) {
      oldWatchedClasses[classHash] = doc.class;
    }

    const oldSectionsByClass = _.mapValues(oldDocs, (doc: SerializedResult) => doc.sections.map((sec: SectionType) => Keys.getSectionHash(sec)));

    const oldWatchedSections = {};
    for (const aClass of Object.values(oldDocs)) {
      for (const section of aClass.sections) {
        oldWatchedSections[Keys.getSectionHash(section)] = section;
      }
    }

    return { oldWatchedClasses, oldWatchedSections, oldSectionsByClass };
  }

  // Send messages to users that are following changes to classes and sections
  async sendMessages(notifs: Notification[], classHashToUsers: Record<string, string[]>, sectionHashToUsers: Record<string, string[]>): Promise<void> {
    // user to message map
    const userToMsg: Record<string, string[]> = {};
    notifs.forEach((notif: Notification) => {
      if (notif.type === 'Course') {
        const userIds: string[] = classHashToUsers[Keys.getClassHash(notif.course)];
        this.generateCourseMsg(userIds, notif, userToMsg);
      } else if (notif.type === 'Section') {
        const userIds: string[] = sectionHashToUsers[Keys.getSectionHash(notif.section)];
        this.generateSectionMsg(userIds, notif, userToMsg);
      }
    });

    Object.keys(userToMsg).forEach((userId: string) => {
      userToMsg[userId].forEach((msg: string) => {
        notifyer.sendFBNotification(userId, msg);
      });

      setTimeout(() => {
        notifyer.sendFBNotification(userId, 'Reply with "stop" to unsubscribe from notifications.');
      }, 100);

      macros.logAmplitudeEvent('Facebook message sent out', {
        toUser: userId,
        messages: userToMsg[userId],
        messageCount: userToMsg[userId].length,
      });
    });
  }

  // Send a message to people following changes to a course
  generateCourseMsg(userIds: string[], courseNotif: CourseNotification, userToMsg: Record<string, string[]>): void {
    const classCode: string = `${courseNotif.course.subject}${courseNotif.course.classId}`;
    let message: string = '';
    if (courseNotif.count === 1) message += `A section was added to ${classCode}!`;
    else message += `${courseNotif.count} sections were added to ${classCode}!`;
    message += ` Check it out at https://searchneu.com/${courseNotif.course.termId}/${courseNotif.course.subject}${courseNotif.course.classId} !`;

    userIds.forEach((userId: string) => {
      if (!userToMsg[userId]) userToMsg[userId] = [];
      userToMsg[userId].push(message);
    });
  }

  // Send a message to people following changes to a section
  generateSectionMsg(userIds: string[], sectionNotif: SectionNotification, userToMsg: Record<string, string[]>): void {
    const classCode: string = `${sectionNotif.section.subject}${sectionNotif.section.classId}`;
    let message: string;

    if (sectionNotif.section.seatsRemaining > 0) message = `A seat opened up in ${classCode} (CRN: ${sectionNotif.section.crn}). Check it out at https://searchneu.com/${sectionNotif.section.termId}/${sectionNotif.section.subject}${sectionNotif.section.classId} !`;
    else message = `A waitlist seat has opened up in ${classCode} (CRN: ${sectionNotif.section.crn}). Check it out at https://searchneu.com/${sectionNotif.section.termId}/${sectionNotif.section.subject}${sectionNotif.section.classId} !`;

    userIds.forEach((userId: string) => {
      if (!userToMsg[userId]) userToMsg[userId] = [];
      userToMsg[userId].push(message);
    });
  }
}

if (require.main === module) {
  Updater.create().start();
}

export default Updater;
