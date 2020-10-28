import { InputJsonValue } from '@prisma/client';
import pMap from 'p-map';
import _ from 'lodash';

import { Course as CourseType, Section as SectionType, Requisite } from '../types';
import prisma from '../prisma';
import Updater, { Notification } from '../updater';
import Keys from '../../common/Keys';
import notifyer from '../notifyer';
import dumpProcessor from '../dumpProcessor';
import termParser from '../scrapers/classes/parsersxe/termParser';

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(notifyer, 'sendFBNotification').mockImplementation(() => {});
  jest.useFakeTimers();

  await prisma.followedSection.deleteMany({});
  await prisma.followedCourse.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.course.deleteMany({});
});

afterEach(async () => {
  jest.clearAllTimers();
});

function createEmptySection(sec: SectionType) {
  return prisma.section.create({
    data: {
      ..._.omit(sec, ['classId', 'termId', 'subject', 'host', 'classAttributes', 'prettyUrl', 'desc', 'lastUpdateTime', 'maxCredits', 'minCredits', 'coreqs', 'prereqs', 'prereqsFor', 'optPrereqsFor']), // FIXME very sus
      id: Keys.getSectionHash(sec),
      crn: sec.crn,
      seatsRemaining: 0,
      waitRemaining: 0,
      meetings: sec.meetings as unknown as InputJsonValue, // FIXME sus
      profs: { set: sec.profs },
      course: { connect: { id: Keys.getClassHash(sec) } },
    },
  });
}

function createStubUser(name: string) {
  return prisma.user.create({
    data: {
      id: name,
      facebookPageId: name,
      firstName: name,
      lastName: name,
      loginKeys: { set: [] },
    },
  });
}

// FIXME correct return value
function createFollowedCourses(courseId: string, users: string[]): Promise<any> {
  return pMap(users, async (userId: string) => {
    return prisma.followedCourse.create({
      data: {
        course: { connect: { id: courseId } },
        user: { connect: { id: userId } },
      },
    });
  });
}

// FIXME correct return value
function createFollowedSections(sectionId: string, users: string[]): Promise<any> {
  return pMap(users, async (userId: string) => {
    return prisma.followedSection.create({
      data: {
        section: { connect: { id: sectionId } },
        user: { connect: { id: userId } },
      },
    });
  });
}

describe('Updater', () => {
  const UPDATER: Updater = new Updater();

  const EMPTY_REQ: Requisite = {
    type: 'or',
    values: [],
  };

  const defaultClassProps = {
    host: 'neu.edu',
    classAttributes: [],
    prettyUrl: 'pretty',
    desc: 'a class',
    url: 'url',
    lastUpdateTime: 20,
    maxCredits: 4,
    minCredits: 0,
    coreqs: EMPTY_REQ,
    prereqs: EMPTY_REQ,
  };

  const defaultSectionProps = {
    online: false, honors: false, url: 'url', profs: [], meetings: [],
  };

  const FUNDIES_ONE: CourseType = {
    classId: '2500',
    name: 'Fundamentals of Computer Science 1',
    termId: '202030',
    subject: 'CS',
    ...defaultClassProps,
  };

  const FUNDIES_TWO: CourseType = {
    classId: '2510',
    name: 'Fundamentals of Computer Science 2',
    termId: '202030',
    subject: 'CS',
    ...defaultClassProps,
  };

  const PL: CourseType = {
    classId: '4400',
    name: 'Principles of Programming Languages',
    termId: '202030',
    subject: 'CS',
    ...defaultClassProps,
  };

  const FUNDIES_ONE_S1: SectionType = {
    crn: '1234',
    classId: '2500',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 1,
    seatsRemaining: 1,
    waitCapacity: 0,
    waitRemaining: 0,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  const FUNDIES_ONE_S2: SectionType = {
    crn: '5678',
    classId: '2500',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 100,
    seatsRemaining: 5,
    waitCapacity: 10,
    waitRemaining: 5,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  const FUNDIES_TWO_S1: SectionType = {
    crn: '0248',
    classId: '2510',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 200,
    seatsRemaining: 0,
    waitCapacity: 10,
    waitRemaining: 3,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  const FUNDIES_TWO_S2: SectionType = {
    crn: '1357',
    classId: '2510',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 150,
    seatsRemaining: 1,
    waitCapacity: 0,
    waitRemaining: 0,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  const FUNDIES_TWO_S3: SectionType = {
    crn: '9753',
    classId: '2510',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 150,
    seatsRemaining: 10,
    waitCapacity: 0,
    waitRemaining: 0,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  const PL_S1: SectionType = {
    crn: '0987',
    classId: '4400',
    termId: '202030',
    subject: 'CS',
    seatsCapacity: 80,
    seatsRemaining: 25,
    waitCapacity: 0,
    waitRemaining: 0,
    ...defaultClassProps,
    ...defaultSectionProps,
  };

  // TODO this is low priority
  describe('modelToUserHash', () => {
    it('works for followed courses', () => {
    });
    // to test this function:
    // 1. DBs must be on and active
    // 2. they must have data in:
    //    a. Courses
    //    b. Sections
    //    c. Users
    //    d. FollowedCourses
    //    e. FollowedSections
  });

  describe('generateCourseMsg', () => {
    it('generates a message for multiple sections getting added', () => {
      const userToMsg: Record<string, string[]> = {};
      UPDATER.generateCourseMsg(['user1', 'user2'], { type: 'Course', course: FUNDIES_ONE, count: 2 }, userToMsg);
      expect(userToMsg).toEqual({
        user1: ['2 sections were added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        user2: ['2 sections were added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
      });
    });

    it('generates a message for a single class notification', () => {
      const userToMsg: Record<string, string[]> = {};
      UPDATER.generateCourseMsg(['user1', 'user2'], { type: 'Course', course: FUNDIES_ONE, count: 1 }, userToMsg);
      expect(userToMsg).toEqual({
        user1: ['A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        user2: ['A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
      });
    });
  });

  describe('generateSectionMsg', () => {
    it('generates the correct message', () => {
      const userToMsg: Record<string, string[]> = {};
      UPDATER.generateSectionMsg(['user1', 'user2'], { type: 'Section', section: FUNDIES_ONE_S2 }, userToMsg);
      expect(userToMsg).toEqual({
        user1: ['A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        user2: ['A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
      });
    });

    it('generates a waitlist message', () => {
      const userToMsg: Record<string, string[]> = {};
      UPDATER.generateSectionMsg(['user1', 'user2'], { type: 'Section', section: FUNDIES_TWO_S1 }, userToMsg);
      expect(userToMsg).toEqual({
        user1: ['A waitlist seat has opened up in CS2510 (CRN: 0248). Check it out at https://searchneu.com/202030/CS2510 !'],
        user2: ['A waitlist seat has opened up in CS2510 (CRN: 0248). Check it out at https://searchneu.com/202030/CS2510 !'],
      });
    });
  });

  describe('sendMessages', () => {
    const classHash: Record<string, string[]> = { 'neu.edu/202030/CS/2500': ['user1', 'user2'], 'neu.edu/202030/CS/2510': ['user2'], 'neu.edu/202030/CS/4400': [] };
    const sectionHash: Record<string, string[]> = {
      'neu.edu/202030/CS/2500/5678': ['user1', 'user2'], 'neu.edu/202030/CS/2510/0248': ['user2'], 'neu.edu/202030/CS/2510/1357': ['user2'], 'neu.edu/202030/CS/4400/0987': [],
    };

    it('sends correct messages', () => {
      const notifications: Notification[] = [
        { type: 'Course', course: FUNDIES_ONE, count: 1 },
        { type: 'Section', section: FUNDIES_ONE_S2 },
        { type: 'Section', section: FUNDIES_TWO_S1 },
        { type: 'Section', section: FUNDIES_TWO_S2 },
      ];

      UPDATER.sendMessages(notifications, classHash, sectionHash);

      expect(notifyer.sendFBNotification.mock.calls).toEqual([
        ['user1', 'A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user1', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A waitlist seat has opened up in CS2510 (CRN: 0248). Check it out at https://searchneu.com/202030/CS2510 !'],
        ['user2', 'A seat opened up in CS2510 (CRN: 1357). Check it out at https://searchneu.com/202030/CS2510 !'],
      ]);
    });

    it('does not send any messages if there are no notifications', () => {
      UPDATER.sendMessages([], classHash, sectionHash);
      expect(notifyer.sendFBNotification.mock.calls).toEqual([]);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await prisma.course.create({ data: dumpProcessor.processCourse(FUNDIES_ONE) });
      await prisma.course.create({ data: dumpProcessor.processCourse(FUNDIES_TWO) });
      await prisma.course.create({ data: dumpProcessor.processCourse(PL) });

      await createEmptySection(FUNDIES_ONE_S2);
      await createEmptySection(FUNDIES_TWO_S1);
      await createEmptySection(FUNDIES_TWO_S2);
      await createEmptySection(PL_S1);

      await createStubUser('user1');
      await createStubUser('user2');

      await createFollowedCourses('neu.edu/202030/CS/2500', ['user1', 'user2']);
      await createFollowedCourses('neu.edu/202030/CS/2510', ['user2']);

      await createFollowedSections('neu.edu/202030/CS/2500/5678', ['user1', 'user2']);
      await createFollowedSections('neu.edu/202030/CS/2510/0248', ['user2']);
      await createFollowedSections('neu.edu/202030/CS/2510/1357', ['user2']);
    });

    it('WORKS', async () => {
      jest.spyOn(dumpProcessor, 'main').mockImplementation(async () => {});
      jest.spyOn(termParser, 'parseSections').mockImplementation(() => {
        return [
          FUNDIES_ONE_S1,
          FUNDIES_ONE_S2,
          FUNDIES_TWO_S1,
          FUNDIES_TWO_S2,
          PL_S1,
        ];
      });


      await UPDATER.update();
      jest.runOnlyPendingTimers();

      expect(notifyer.sendFBNotification.mock.calls).toEqual([
        ['user1', 'A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user1', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A section was added to CS2500! Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A waitlist seat has opened up in CS2510 (CRN: 0248). Check it out at https://searchneu.com/202030/CS2510 !'],
        ['user2', 'A seat opened up in CS2510 (CRN: 1357). Check it out at https://searchneu.com/202030/CS2510 !'],
        ['user1', 'Reply with "stop" to unsubscribe from notifications.'],
        ['user2', 'Reply with "stop" to unsubscribe from notifications.'],
      ]);
    });

    it('does not send unnecessary messages', async () => {
      jest.spyOn(dumpProcessor, 'main').mockImplementation(async () => {});
      jest.spyOn(termParser, 'parseSections').mockImplementation(() => {
        return [
          PL_S1,
        ];
      });


      await UPDATER.update();
      jest.runOnlyPendingTimers();

      expect(notifyer.sendFBNotification.mock.calls).toEqual([]);
    });

    it('does not send messages if scraped classes do not match with followed terms', async () => {
      jest.spyOn(dumpProcessor, 'main').mockImplementation(async () => {});
      jest.spyOn(termParser, 'parseSections').mockImplementation(() => {
        return [
          { ...FUNDIES_ONE_S2, termId: '202110' },
          { ...FUNDIES_TWO_S1, termId: '202110' },
          { ...FUNDIES_TWO_S2, termId: '202110' },
        ];
      });


      await UPDATER.update();
      jest.runOnlyPendingTimers();

      expect(notifyer.sendFBNotification.mock.calls).toEqual([]);
    });

    it('does not try to send messages to users associated with a class not being followed', async () => {
      await createEmptySection(FUNDIES_TWO_S3);
      jest.spyOn(dumpProcessor, 'main').mockImplementation(async () => {});
      jest.spyOn(termParser, 'parseSections').mockImplementation(() => {
        return [
          FUNDIES_ONE_S2,
          FUNDIES_TWO_S1,
          FUNDIES_TWO_S2,
          FUNDIES_TWO_S3,
        ];
      });

      await UPDATER.update();
      jest.runOnlyPendingTimers();

      expect(notifyer.sendFBNotification.mock.calls).toEqual([
        ['user1', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A seat opened up in CS2500 (CRN: 5678). Check it out at https://searchneu.com/202030/CS2500 !'],
        ['user2', 'A waitlist seat has opened up in CS2510 (CRN: 0248). Check it out at https://searchneu.com/202030/CS2510 !'],
        ['user2', 'A seat opened up in CS2510 (CRN: 1357). Check it out at https://searchneu.com/202030/CS2510 !'],
        ['user1', 'Reply with "stop" to unsubscribe from notifications.'],
        ['user2', 'Reply with "stop" to unsubscribe from notifications.'],
      ]);
    });
  });
});
