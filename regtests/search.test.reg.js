import _ from 'lodash';
import axios from 'axios';
import URI from 'urijs';
import Keys from '../common/Keys';

function elemContainsSubstrs(array, strs) {
  return strs.some((str) => array.some((elem) => elem.indexOf(str) > -1));
}

function getFirstClassResult(results) {
  return results.data.results[0].class;
}

async function prodSearch(query, termId, min, max, filters = {}) {
  const queryUrl = new URI('http://searchneu.com/search').query({
    query,
    termId,
    filters: JSON.stringify(filters),
    minIndex: min,
    maxIndex: max,
    apiVersion: 2,
  }).toString();

  return axios.get(queryUrl);
}

describe('search', () => {
  it('returns specified class with class code query', async () => {
    const results = await prodSearch('cs2500', '202110', 0, 10);
    expect(results.data.results.length).toBe(1);
    const firstResult = getFirstClassResult(results);
    expect(Keys.getClassHash(firstResult)).toBe('neu.edu/202110/CS/2500');
  });

  it('returns specified class with name query', async () => {
    const firstResult = getFirstClassResult(await prodSearch('fundamentals of computer science 2', '202110', 0, 1));
    expect(Keys.getClassHash(firstResult)).toBe('neu.edu/202110/CS/2510');
  });

  it('returns a professor if name requested', async () => {
    const results = await prodSearch('mislove', '202110', 0, 1);
    const firstResult = results.data.results[0].employee;
    expect(firstResult.emails).toContain('a.mislove@northeastern.edu');
  });

  it('returns a professor if email requested', async () => {
    const results = await prodSearch('a.mislove@northeastern.edu', '202110', 0, 1);
    const firstResult = results.data.results[0].employee;
    expect(firstResult.emails).toContain('a.mislove@northeastern.edu');
  });

  it('returns a professor if phone requested', async () => {
    const results = await prodSearch('6173737069', '202110', 0, 1);
    const firstResult = results.data.results[0].employee;
    expect(firstResult.emails).toContain('a.mislove@northeastern.edu');
  });

  it('does not place labs and recitations as top results', async () => {
    const firstResult = getFirstClassResult(await prodSearch('cs', '202110', 0, 1));
    expect(['Lab', 'Recitation & Discussion', 'Seminar']).not.toContain(firstResult.scheduleType);
  });

  it('aliases class names', async () => {
    const firstResult = getFirstClassResult(await prodSearch('fundies', '202110', 0, 1));
    expect(Keys.getClassHash(firstResult)).toBe('neu.edu/202110/CS/2500');
  });

  [['cs', '2500'], ['cs', '2501'], ['thtr', '1000']].forEach((item) => {
    it(`always analyzes course code  ${item.join(' ')} the same way regardless of string`, async () => {
      const canonicalResults = await prodSearch(item.join(' '), '202110', 0, 10);
      expect(canonicalResults.data.results.length).toBe(1);
      const canonicalResult = getFirstClassResult(canonicalResults);

      const firstResults = await prodSearch(item.join(''), '202110', 0, 10);
      expect(firstResults.data.results.length).toBe(1);
      const firstResult = getFirstClassResult(firstResults);
      expect(Keys.getClassHash(firstResult)).toBe(Keys.getClassHash(canonicalResult));

      const secondResults = await prodSearch(item.join(' ').toUpperCase(), '202110', 0, 10);
      expect(secondResults.data.results.length).toBe(1);
      const secondResult = getFirstClassResult(secondResults);
      expect(Keys.getClassHash(secondResult)).toBe(Keys.getClassHash(canonicalResult));

      const thirdResults = await prodSearch(item.join('').toUpperCase(), '202110', 0, 10);
      expect(thirdResults.data.results.length).toBe(1);
      const thirdResult = getFirstClassResult(thirdResults);
      expect(Keys.getClassHash(thirdResult)).toBe(Keys.getClassHash(canonicalResult));
    });
  });

  it('returns no search results if given subject and course number that are not valid', async () => {
    const results = await prodSearch('cs 2598', '202110', 0, 10);
    expect(results.data.results).toEqual(0);
  });

  it('returns search results of same subject if course code query', async () => {
    const results = await prodSearch('cs', '202110', 0, 10);
    results.data.results.map((result) => { return expect(result.class.subject).toBe('CS'); });
  });

  it('autocorrects typos', async () => {
    const firstResult = getFirstClassResult(await prodSearch('fundimentals of compiter science', '202110', 0, 1));
    expect(Keys.getClassHash(firstResult)).toBe('neu.edu/202110/CS/2500');
  });

  it('does return default results', async () => {
    const results = await prodSearch('', '202110', 0, 10);
    expect(results.data.results.length).toBe(10);
  });

  it('fetches correct result if query is a crn', async () => {
    const firstResult = getFirstClassResult(await prodSearch('10415', '202030', 0, 1));
    expect(Keys.getClassHash(firstResult)).toBe('neu.edu/202110/CS/2500');
  });

  describe('filter queries', () => {
    it('filters by one NUpath', async () => {
      const nupath = 'Writing Intensive';
      const allResults = (await prodSearch('2500', '202110', 0, 20, { nupath: [nupath] })).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(elemContainsSubstrs(result.class.classAttributes, [nupath])).toBeTruthy());
    });

    it('filter by multiple NUpaths', async () => {
      const nupaths = ['Difference/Diversity', 'Interpreting Culture'];
      const allResults = (await prodSearch('2500', '202110', 0, 20, { nupath: nupaths })).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(elemContainsSubstrs(result.class.classAttributes, nupaths)).toBeTruthy());
    });

    it('filter by one subject', async () => {
      const subject = 'CS';
      const allResults = (await prodSearch('2500', '202110', 0, 20, { subject: [subject] })).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(result.class.subject).toBe(subject));
    });

    it('filter by multiple subjects', async () => {
      const subjects = ['CS', 'ENGL'];
      const allResults = (await prodSearch('2500', '202110', 0, 20, { subject: subjects })).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(subjects).toContain(result.class.subject));
    });

    it('filter by multiple subjects', async () => {
      const subjects = ['CS', 'ENGL'];
      const allResults = (await prodSearch('2500', '202060', 0, 20, { subject: subjects })).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(subjects).toContain(result.class.subject));
    });

    it('filter for online: if any section is online', async () => {
      const onlineFilter = { online: true };
      const allResults = (await prodSearch('2500', '202110', 0, 20, onlineFilter)).data.results;
      expect(allResults.length > 0).toBe(true);
      allResults.forEach((result) => expect(result.sections.map((section) => section.online)).toContain(true));
    });

    it('filter for online: online option not selected', async () => {
      const onlineFilter = { online: false };
      const allResults = (await prodSearch('2500', '202110', 0, 20, onlineFilter)).data.results;
      expect(allResults.length > 0).toBe(true);
    });
  });

  describe('filter aggregations', () => {
    let unfilteredAggregations;
    let unfilteredAggCounts;

    beforeEach(async () => {
      unfilteredAggregations = (await prodSearch('', '202110', 0, 1)).data.filterOptions;
      unfilteredAggCounts = unfilteredAggregations.nupath.reduce((pathToCount, { value, count }) => {
        return {
          ...pathToCount,
          [value]: count,
        };
      }, {});
    });

    it('leaves aggregations unchanged if no filters applied', async () => {
      const aggResults = (await prodSearch('', '202110', 0, 10)).data.filterOptions;
      expect(Object.keys(aggResults).length).not.toEqual(0);
      expect(aggResults).toEqual(unfilteredAggregations);
    });

    it('does not provide aggregations for selected filters', async () => {
      const filters = { nupath: ['Interpreting Culture'], subject: ['CS'] };
      const aggResults = (await prodSearch('', '202110', 0, 1, filters)).data.filterOptions;
      expect(aggResults.nupath.every(({ value }) => value.indexOf('Interpreting Culture') < 0)).toBeTruthy();
      expect(aggResults.subject.every(({ value }) => value.indexOf('CS') < 0)).toBeTruthy();
    });

    it('does not affect aggregation counts of filters of the type of the selected', async () => {
      const filters = { nupath: ['Interpreting Culture'] };
      const aggResults = (await prodSearch('', '202110', 0, 1, filters)).data.filterOptions;

      aggResults.nupath.forEach(({ value, count }) => expect(unfilteredAggCounts[value]).toEqual(count));
    });

    it('ANDs the aggregation arithmetic when filters of different types applied', async () => {
      const filters = { nupath: ['Interpreting Culture'], subject: ['CS'] };
      const aggResults = (await prodSearch('', '202110', 0, 1, filters)).data.filterOptions;

      aggResults.nupath.forEach(({ value, count }) => expect(count).toBeLessThan(unfilteredAggCounts[value]));
    });

    it('ORs the aggregation arithmetic when filters of same type applied', async () => {
      const filters = { nupath: ['Interpreting Culture', 'Writing Intensive'] };
      const aggResults = (await prodSearch('', '202110', 0, 1, filters)).data.filterOptions;

      aggResults.nupath.forEach(({ value, count }) => expect(unfilteredAggCounts[value]).toEqual(count));
    });

    it('removes aggregations for those values that have a count of zero', async () => {
      const filters = { online: true, classType: ['Seminar'] };
      const aggResults = (await prodSearch('', '202110', 0, 1, filters)).data.filterOptions;

      expect(aggResults.nupath.every(({ count }) => count !== 0)).toBeTruthy();
    });
  });

  describe('aggregation counts', () => {
    it('returns correct number of nupath aggregations', async () => {
      const aggs = (await prodSearch('', '202110', 0, 10)).data.filterOptions;
      expect(aggs.nupath.length).toEqual(13);
    });

    it('returns correct number of subject aggregations', async () => {
      const aggs = (await prodSearch('', '202110', 0, 10)).data.filterOptions;
      expect(aggs.subject.length).toEqual(145);
    });

    it('returns correct number of classType aggregations', async () => {
      const aggs = (await prodSearch('', '202110', 0, 10)).data.filterOptions;
      expect(aggs.classType.length).toEqual(8);
    });
  });
});

