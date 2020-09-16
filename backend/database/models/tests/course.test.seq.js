import { sequelize, Course, Section } from '../index';
import elastic from '../../../libs/elastic';

beforeEach(async () => {
  await Section.truncate({ cascade: true, restartIdentity: true });
  await Course.truncate({ cascade: true, restartIdentity: true });


  jest.spyOn(elastic, 'bulkIndexFromMap').mockImplementation(() => {});

  await Course.create({
    id: 'neu.edu/202030/CS/2500',
    host: 'neu.edu',
    classId: '2500',
    name: 'Fundamentals of Computer Science 1',
    termId: '202030',
    subject: 'CS',
    maxCredits: 4,
    minCredits: 4,
    desc: 'a good class',
    url: 'https://foo.com',
    prettyUrl: 'https://foo.com',
    lastUpdateTime: 123456789,
    classAttributes: ['hebloo'],
  });

  await Section.create({
    id: 'neu.edu/202030/CS/2500/19350',
    classHash: 'neu.edu/202030/CS/2500',
    seatsCapacity: 80,
    seatsRemaining: 0,
    waitCapacity: 0,
    waitRemaining: 0,
    online: false,
    honors: false,
    url: 'https://foo.com/19350',
    crn: '19350',
    meetings: [
      {
        startDate: 17903,
        endDate: 18013,
        profs: [
          'Benjamin Lerner',
        ],
        where: 'IV 010',
        type: 'Class',
        times: {
          4: [
            {
              start: 33600,
              end: 41400,
            },
          ],
        },
        allProfs: [
          'Benjamin Lerner',
          'Alan Mislove',
        ],
      },
    ],
  });

  await Section.create({
    id: 'neu.edu/202030/CS/2500/19360',
    classHash: 'neu.edu/202030/CS/2500',
    seatsCapacity: 80,
    seatsRemaining: 5,
    waitCapacity: 10,
    waitRemaining: 2,
    online: false,
    honors: false,
    url: 'https://foo.com/19360',
    crn: '19360',
    meetings: [
      {
        startDate: 17903,
        endDate: 18013,
        profs: [
          'Alan Mislove',
        ],
        where: 'West Village G 010',
        type: 'Class',
        times: {
          2: [
            {
              start: 33600,
              end: 41400,
            },
          ],
        },
        allProfs: [
          'Benjamin Lerner',
          'Alan Mislove',
        ],
      },
    ],
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('bulkUpsertES', () => {
  it('upserts to ES', async () => {
    const course = await Course.findByPk('neu.edu/202030/CS/2500');
    await Course.bulkUpsertES([course]);

    expect(elastic.bulkIndexFromMap.mock.calls[0]).toMatchSnapshot();
  });
});

describe('afterBulkUpdate', () => {
  it('updates ES', async () => {
    await Course.update({ name: 'Fundies 1' }, { where: { id: 'neu.edu/202030/CS/2500' } });
    expect(elastic.bulkIndexFromMap.mock.calls[0]).toMatchSnapshot();
  });
});
