import searcher from '../searcher';

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
});
