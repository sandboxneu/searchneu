import ClassParser from '../classParser';
import data from './data/classParser.data';

const simplePrereq = { type: 'and', values: [{ subject: 'CS', classId: '1800' }] };

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1578252414987);
  jest.spyOn(ClassParser, 'getDescription').mockReturnValue('class description 123');
  jest.spyOn(ClassParser, 'getPrereqs').mockReturnValue(simplePrereq);
  jest.spyOn(ClassParser, 'getCoreqs').mockReturnValue(simplePrereq);
  jest.spyOn(ClassParser, 'getAttributes').mockReturnValue(['innovation', 'bizz']);
});

afterAll(() => {
  jest.restoreAllMocks();
});

jest.mock('../subjectAbbreviationParser');

describe('classParser', () => {
  describe('nupath', () => {
    it('filters and parses', () => {
      const actual = ['Natural/Designed World'];
      expect(ClassParser.nupath(ClassParser.serializeAttributes(data.getCourseAttributes2))).toEqual(actual);
    });
  });

  describe('serializeAttributes', () => {
    it('trims and splits on <br/>', () => {
      const actual = ['Business Admin  UBBA'];
      expect(ClassParser.serializeAttributes(data.getCourseAttributes1)).toEqual(actual);
    });

    it('handles encoded html characters', () => {
      const actual = ['NUpath Natural/Designed World  NCND', 'NU Core Science/Tech Lvl 1  NCT1', 'Computer&Info Sci  UBCS'];
      expect(ClassParser.serializeAttributes(data.getCourseAttributes2)).toEqual(actual);
    });
  });

  describe('parseClassFromSearchResult', () => {
    it('parses and sends extra requests', async () => {
      expect(await ClassParser.parseClassFromSearchResult(data.chem2311, '202010')).toMatchSnapshot();
      expect(await ClassParser.parseClassFromSearchResult(data.cs2500, '202010')).toMatchSnapshot();
    });
  });

  describe('getRefsFromJSON', () => {
    it('collects references from prereq blob', () => {
      const prereqObj = {
        type: 'and',
        values: [{ classId: '3450', subject: 'ARTG' },
          { classId: '3350', subject: 'ARTG' }],
      };
      expect(ClassParser.getRefsFromJson(prereqObj, '202030')).toEqual(
        {
          'neu.edu/202030/ARTG/3450': { subject: 'ARTG', termId: '202030', classId: '3450' },
          'neu.edu/202030/ARTG/3350' : { subject: 'ARTG', termId: '202030', classId: '3350' },
        },
      );
    });
  });

  describe('getAllCourseRefs', () => {
    it.only('collects all the course refs', () => {
      const course = {
        id: 'neu.edu/202030/CS/2510',
        maxCredits: 4,
        minCredits: 4,
        host: 'neu.edu',
        classId: '2500',
        name: 'Fundamentals Of Computer Science 2',
        termId: '202030',
        subject: 'CS',
        prereqs: { type: 'and', values: [{ subject: 'CS', classId: '2500' }] },
        coreqs: { type: 'and', values: [{ subject: 'CS', classId: '2511' }] },
        prereqsFor: { type: 'and', values: [{ subject: 'CS', classId: '3500' }] },
        optPrereqsFor: { type: 'and', values: [{ subject: 'CS', classId: '3000' }] },
        classAttributes: ['fun intro'],
        lastUpdateTime: 123456789,
      }
      expect(ClassParser.getAllCourseRefs(course)).toEqual(
        {
          'neu.edu/202030/CS/2500' : { subject: 'CS', termId: '202030', classId: '2500' },
          'neu.edu/202030/CS/2511' : { subject: 'CS', termId: '202030', classId: '2511' },
          'neu.edu/202030/CS/3500' : { subject: 'CS', termId: '202030', classId: '3500' },
          'neu.edu/202030/CS/3000' : { subject: 'CS', termId: '202030', classId: '3000' },
        },
      )
    })
  })
});
