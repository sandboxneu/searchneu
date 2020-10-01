import searcher from '../searcher';
import prisma from '../prisma';

beforeAll(async () => {
  searcher.subjects = [];
})

describe('searcher', () => {
  describe('generateMQuery', () => {
    it('generates with no filters', () => {
      expect(searcher.generateMQuery('fundies', '202030', 0, 10, {})).toMatchSnapshot();
    });

    it('generates aggs with online filters applied', () => {
      expect(searcher.generateMQuery('fundies', '202030', 0, 10, { online: true })).toMatchSnapshot();
    });
  });

  // TODO: create an association between cols in elasticCourseSerializer and here
  describe('generateQuery', () => {
    it('generates match_all when no query', () => {
      expect(searcher.generateQuery('', '202030', [], 0, 10).query.bool.must).toEqual({ match_all:{} });
    });

    it('generates a query without filters', () => {
      expect(searcher.generateQuery('fundies', '202030', [], 0, 10, 'nupath')).toMatchSnapshot();
    });
  });

  describe('validateFilters', () => {
    it('removes invalid filters', () => {
      const invalidFilters = {
        NUpath: 'NU Core/NUpath Adv Writ Dscpl',
        college: 'GS Col of Arts',
        subject: 'CS',
        online: false,
        classType: ['Lecture'],
        inValidFilterKey: '',
      };
      expect(searcher.validateFilters(invalidFilters)).toMatchObject({});
    });

    it('keeps all valid filters', () => {
      const validFilters = {
        nupath: ['NU Core/NUpath Adv Writ Dscpl', 'NUpath Interpreting Culture'],
        subject: ['ENGW', 'ARTG', 'CS'],
        online: true,
        classType: ['Lecture'],
      };
      expect(searcher.validateFilters(validFilters)).toMatchObject(validFilters);
    });
  });

  describe('Single search result', () => {
    beforeEach(async () => {
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
          lastUpdateTime: new Date(),
        },
      });
      await prisma.course.create({
        data: {
          id: 'neu.edu/202030/PHIL/1145',
          host: 'neu.edu',
          classId: '1145',
          name: 'Tech and Human Values',
          termId: '202030',
          subject: 'PHIL',
          nupath: { set: ['Ethical reasoning', 'Argue', 'Live in the mud'] },
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
      await prisma.section.create({
        data: {
          id: 'neu.edu/202030/CS/2500/19350',
          course: { connect: { id: 'neu.edu/202030/CS/2500' } },
          seatsCapacity: 80,
          seatsRemaining: 0,
          classType: 'Lecture',
        },
      });
      await prisma.section.create({
        data: {
          id: 'neu.edu/202030/PHIL/1145/20142',
          course: { connect: { id: 'neu.edu/202030/PHIL/1145' } },
          seatsCapacity: 40,
          seatsRemaining: 0,
          classType: 'Lecture',
        },
      });
    });
    describe('getSingleResultAggs', () => {
      it('Gets aggregation for single result', async () => {
        const singleResult = await prisma.course.findOne({ where: { id: 'neu.edu/202030/CS/2500' }, include: { sections: true } });
        expect(searcher.getSingleResultAggs(singleResult)).toEqual({
          nupath: [],
          subject: [{ value: 'CS', count: 1 }],
          classType: [{ value: 'Lecture', count: 1 }],
        });
      });
      it('Gets aggregation for single result with nupath', async () => {
        const singleResult = await prisma.course.findOne({ where: { id: 'neu.edu/202030/PHIL/1145' }, include: { sections: true } });
        expect(searcher.getSingleResultAggs(singleResult)).toEqual({
          nupath: [{ value: 'Ethical reasoning', count: 1 }, { value: 'Argue', count: 1 }, { value: 'Live in the mud', count: 1 }],
          subject: [{ value: 'PHIL', count: 1 }],
          classType: [{ value: 'Lecture', count: 1 }],
        });
      });
    });
    describe('getOneSearchResult', () => {
      it('Gets 1 result for valid class', async () => {
        expect(await searcher.getOneSearchResult('CS', '2500', '202030')).toMatchObject({
          results: [{
            class: {
              id: 'neu.edu/202030/CS/2500',
              host: 'neu.edu',
              classId: '2500',
              name: 'Fundamentals of Computer Science 1',
              termId: '202030',
              subject: 'CS',
              lastUpdateTime: expect.anything(),
            },
          }],
          resultCount: 1,
          took: 0,
          hydrateDuration: expect.anything(),
          aggregations: {
            nupath: [],
            subject: [{ value: 'CS', count: 1 }],
            classType: [{ value: 'Lecture', count: 1 }],
          },
        });
      });
      it('Gets 0 results for invalid course', async () => {
        expect(await searcher.getOneSearchResult('CS', '2504', '202030')).toMatchObject({
          results: [],
          resultCount: 0,
          took: 0,
          hydrateDuration: expect.anything(),
          aggregations: {
            nupath: [],
            subject: [],
            classType: [],
          },
        })
      });
    });
  })
});
