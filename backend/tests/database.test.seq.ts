import prisma from '../prisma';
import database from '../database';

beforeEach(async () => {
  await prisma.followedSection.deleteMany({});
  await prisma.followedCourse.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.course.deleteMany({});

  await prisma.course.create({
    data: {
      id: 'neu.edu/202030/CS/2500',
      host: 'neu.edu',
      classId: '2500',
      name: 'Fundamentals of Computer Science 1',
      termId: '202030',
      subject: 'CS',
    },
  });

  await prisma.course.create({
    data: {
      id: 'neu.edu/202030/CS/2510',
      host: 'neu.edu',
      classId: '2510',
      name: 'Fundamentals of Computer Science 2',
      termId: '202030',
      subject: 'CS',
    },
  });

  await prisma.course.create({
    data: {
      id: 'neu.edu/202030/CS/3500',
      host: 'neu.edu',
      classId: '3500',
      name: 'Object-Oriented Design',
      termId: '202030',
      subject: 'CS',
    },
  });

  await prisma.section.create({
    data: {
      id: 'neu.edu/202030/CS/2500/19350',
      course: { connect: { id: 'neu.edu/202030/CS/2500' } },
      seatsCapacity: 80,
      seatsRemaining: 0,
    },
  });

  await prisma.section.create({
    data: {
      id: 'neu.edu/202030/CS/2500/19360',
      course: { connect: { id: 'neu.edu/202030/CS/2500' } },
      seatsCapacity: 80,
      seatsRemaining: 5,
    },
  });

  await prisma.section.create({
    data: {
      id: 'neu.edu/202030/CS/3500/20350',
      course: { connect: { id: 'neu.edu/202030/CS/3500' } },
      seatsCapacity: 100,
      seatsRemaining: 0,
    },
  });

  await prisma.user.create({
    data: {
      id: '123456789',
      facebookPageId: '23456',
      firstName: 'Wilbur',
      lastName: 'Whateley',
      loginKeys: { set: ['the key', 'the gate'] },
    },
  });

  await prisma.followedSection.create({
    data: {
      user: { connect: { id: '123456789' } },
      section: { connect: { id: 'neu.edu/202030/CS/2500/19350' } },
    },
  });

  await prisma.followedCourse.create({
    data: {
      user: { connect: { id: '123456789' } },
      course: { connect: { id: 'neu.edu/202030/CS/3500' } },
    },
  });
});

describe('set', () => {
  it('creates a user if user does not exist', async () => {
    expect(await prisma.user.findOne({ where: { id: '33' } })).toBe(null);
    expect(await prisma.followedSection.count({ where: { userId: '33' } })).toBe(0);
    expect(await prisma.followedCourse.count({ where: { userId: '33' } })).toBe(0);
    await database.set('33', {
      facebookPageId: '37',
      firstName: 'Erich',
      lastName: 'Zann',
      loginKeys: ['not the key'],
      watchingSections: ['neu.edu/202030/CS/3500/20350'],
      watchingClasses: ['neu.edu/202030/CS/3500'],
    });

    expect((await prisma.user.findOne({ where: { id: '33' } })).facebookPageId).toBe('37');

    expect(((await prisma.followedSection.findMany({ where: { userId: '33' } }))[0]).sectionId).toBe('neu.edu/202030/CS/3500/20350');
    expect(((await prisma.followedCourse.findMany({ where: { userId: '33' } }))[0]).courseId).toBe('neu.edu/202030/CS/3500');
  });

  it('updates a user if user exists', async () => {
    expect(await prisma.user.count({ where: { id: '123456789' } })).toEqual(1);
    expect(await prisma.followedSection.count({ where: { userId: '123456789' } })).toBe(1);
    expect(await prisma.followedCourse.count({ where: { userId: '123456789' } })).toBe(1);
    await database.set('123456789', {
      facebookPageId: '76543',
      loginKeys: ['abcdefg'],
    });

    expect((await prisma.user.findOne({ where: { id: '123456789' } })).facebookPageId).toBe('76543');
  });

  it('updates the followed sections for a user', async () => {
    expect(((await prisma.followedSection.findMany({ where: { userId: '123456789' } }))[0]).sectionId).toBe('neu.edu/202030/CS/2500/19350');
    await database.set('123456789', {
      watchingSections: ['neu.edu/202030/CS/2500/19360', 'neu.edu/202030/CS/3500/20350'],
    });

    expect(await prisma.followedSection.count({ where: { userId: '123456789', sectionId: 'neu.edu/202030/CS/2500/19350' } })).toBe(0);
    expect(await prisma.followedSection.count({ where: { userId: '123456789', sectionId: 'neu.edu/202030/CS/2500/19360' } })).toBe(1);
    expect(await prisma.followedSection.count({ where: { userId: '123456789', sectionId: 'neu.edu/202030/CS/3500/20350' } })).toBe(1);
    expect(await prisma.followedSection.count({ where: { userId: '123456789' } })).toBe(2);
  });

  it('updates the followed courses for a user', async () => {
    expect(((await prisma.followedCourse.findMany({ where: { userId: '123456789' } }))[0]).courseId).toBe('neu.edu/202030/CS/3500');
    await database.set('123456789', {
      watchingClasses: ['neu.edu/202030/CS/2500', 'neu.edu/202030/CS/2510'],
    });

    expect(await prisma.followedCourse.count({ where: { userId: '123456789', courseId: 'neu.edu/202030/CS/3500' } })).toBe(0);
    expect(await prisma.followedCourse.count({ where: { userId: '123456789', courseId: 'neu.edu/202030/CS/2500' } })).toBe(1);
    expect(await prisma.followedCourse.count({ where: { userId: '123456789', courseId: 'neu.edu/202030/CS/2510' } })).toBe(1);
    expect(await prisma.followedCourse.count({ where: { userId: '123456789' } })).toBe(2);
  });
});

describe('get', () => {
  it('gets an existing user', async () => {
    const foundUser = await database.get('123456789');

    expect(foundUser).toStrictEqual({
      facebookMessengerId: '123456789',
      facebookPageId: '23456',
      firstName: 'Wilbur',
      lastName: 'Whateley',
      loginKeys: ['the key', 'the gate'],
      watchingSections: ['neu.edu/202030/CS/2500/19350'],
      watchingClasses: ['neu.edu/202030/CS/3500'],
    });
  });

  it('returns null if no user found', async () => {
    const foundUser = await database.get('33');

    expect(foundUser).toBe(null);
  });
});

describe('getByLoginKey', () => {
  it('gets an existing user', async () => {
    const foundUser = await database.getByLoginKey('the key');

    expect(foundUser).toStrictEqual({
      facebookMessengerId: '123456789',
      facebookPageId: '23456',
      firstName: 'Wilbur',
      lastName: 'Whateley',
      loginKeys: ['the key', 'the gate'],
      watchingSections: ['neu.edu/202030/CS/2500/19350'],
      watchingClasses: ['neu.edu/202030/CS/3500'],
    });
  });

  it('returns null if no user found', async () => {
    const foundUser = await database.getByLoginKey('memes');

    expect(foundUser).toBe(null);
  });
});
