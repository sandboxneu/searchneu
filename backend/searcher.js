/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import elastic from './elastic';
import { Course, Section } from './database/models/index';
import HydrateSerializer from './database/serializers/hydrateSerializer';
import macros from './macros';

class Searcher {
  constructor() {
    this.elastic = elastic;
    this.subjects = null;
    this.filters = Searcher.generateFilters();
  }

  static generateFilters() {
    // type validating functions
    const isString = (arg) => {
      return typeof arg === 'string';
    };

    const isStringArray = (arg) => {
      return Array.isArray(arg) && arg.every((elem) => isString(elem));
    };

    const isTrue = (arg) => {
      return typeof arg === 'boolean' && arg;
    };

    // filter-generating functions
    const getSectionsAvailableFilter = () => {
      return { exists: { field: 'sections' } };
    };

    const getNUpathFilter = (selectedNUpaths) => {
      const NUpathFilters = selectedNUpaths.map((eachNUpath) => ({ match_phrase: { 'class.classAttributes': eachNUpath } }));
      return { bool: { should: NUpathFilters } };
    };

    const getSubjectFilter = (selectedSubjects) => {
      const subjectFilters = selectedSubjects.map((eachSubject) => ({ match: { 'class.subject': eachSubject } }));
      return { bool: { should: subjectFilters } };
    };

    // note that { online: false } is never in filters
    const getOnlineFilter = (selectedOnlineOption) => {
      return { term: { 'sections.online': selectedOnlineOption } };
    };

    const getClassTypeFilter = (selectedClassType) => {
      return { match: { 'class.scheduleType': selectedClassType } };
    };

    return {
      nupath: { validate: isStringArray, create: getNUpathFilter, agg: true },
      subject: { validate: isStringArray, create: getSubjectFilter, agg: true },
      online: { validate: isTrue, create: getOnlineFilter, agg: false },
      classType: { validate: isStringArray, create: getClassTypeFilter, agg: true },
      sectionsAvailable: { validate: isTrue, create: getSectionsAvailableFilter, agg: false },
    };
  }

  /**
   * return a set of all existing subjects of classes
   */
  async getSubjects() {
    if (!this.subjects) {
      this.subjects = new Set((await Course.aggregate('subject', 'distinct', { plain: false })).map((hash) => hash.distinct));
    }
    return this.subjects;
  }

  /**
   * Remove any invalid filter with the following criteria:
   * 1. Correct key string and value type;
   * 2. Check that { online: false } should never be in filters
   *
   * A sample filters JSON object has the following format:
   * { 'NUpath': string[],
   *   'college': string[],
   *   'subject': string[],
   *   'online': boolean,
   *   'classType': string }
   *
   * @param {object} filters The json object represting all filters on classes
   */
  validateFilters(filters) {
    const validFilters = {};
    Object.keys(filters).forEach((currFilter) => {
      if (!(currFilter in this.filters)) macros.log('Invalid filter key.', currFilter);
      else if (!(this.filters[currFilter].validate(filters[currFilter]))) macros.log('Invalid filter value type.', currFilter);
      else validFilters[currFilter] = filters[currFilter];
    });
    return validFilters;
  }

  /**
   * Get elasticsearch query from json filters and termId
   * @param  {string}  termId  The termId to look within
   * @param  {object}  filters The json object representing all filters on classes
   */
  getClassFilterQuery(termId, filters) {
    // for every filter in this.filters
    // create it
    const classFilters = _(filters).pick(Object.keys(this.filters)).toPairs().map(([key, val]) => this.filters[key].create(val))
      .value();
    classFilters.push({ term: { 'class.termId': termId } });

    return { bool: { must: classFilters } };
  }


  async getFields(query) {
    // if we know that the query is of the format of a course code, we want to do a very targeted query against subject and classId: otherwise, do a regular query.
    const courseCodePattern = /^\s*([a-zA-Z]{2,4})\s*(\d{4})?\s*$/i;
    let fields = [
      'class.name^2', // Boost by 2
      'class.name.autocomplete',
      'class.subject^4',
      'class.classId^3',
      'sections.profs',
      'class.crns',
      'employee.name^2',
      'employee.emails',
      'employee.phone',
    ];

    const patternResults = query.match(courseCodePattern);
    if (patternResults && (await this.getSubjects()).has(patternResults[1].toLowerCase())) {
      // after the first result, all of the following results should be of the same subject, e.g. it's weird to get ENGL2500 as the second or third result for CS2500
      fields = ['class.subject^10', 'class.classId'];
    }

    return fields;
  }

  async generateQuery(query, classFilters, min, max, aggregation = '') {
    const fields = await this.getFields(query);

    // text query from the main search box
    const matchTextQuery = {
      multi_match: {
        query: query,
        type: 'most_fields', // More fields match => higher score
        fuzziness: 'AUTO',
        fields: fields,
      },
    };

    // use lower classId has tiebreaker after relevance
    const sortByClassId = { 'class.classId.keyword': { order: 'asc', unmapped_type: 'keyword' } };

    // filter by type employee
    const isEmployee = { term: { type: 'employee' } };

    // very likely this doesn't work
    const aggQuery = !aggregation ? {} : {
      [aggregation]: {
        terms: { field: aggregation },
      },
    };

    // compound query for text query and filters
    return {
      from: min,
      size: max - min,
      sort: ['_score', sortByClassId],
      query: {
        bool: {
          must: matchTextQuery,
          filter: {
            bool: {
              should: [
                classFilters,
                isEmployee,
              ],
            },
          },
        },
      },
      aggregations: aggQuery,
    };
  }


  async getSearchResults(query, termId, min, max, filters) {
    const validFilters = this.validateFilters(filters);
    const classFilters = this.getClassFilterQuery(termId, validFilters);
    const filteredFilters = Object.keys(this.filters).filter((filter) => filter.agg);
    const queries = [await this.generateQuery(query, classFilters, min, max)];
    filteredFilters.forEach(async (filter) => queries.push(await this.generateQuery(query, _.omit(classFilters, filter), min, max, filter)));

    const results = await elastic.mquery(`${elastic.CLASS_INDEX},${elastic.EMPLOYEE_INDEX}`, queries);
    return this.parseResults(results.body.responses, filteredFilters);
  }

  parseResults(results, aggFilters) {
    const aggAcc = {};
    return {
      output: results[0].hits.hits,
      resultCount: results[0].hits.total.value,
      took: results[0].took,
      aggregations: aggFilters.forEach((filter, idx) => {
        aggAcc[filter] = results[idx + 1].hits.aggregations[filter].buckets.map((aggVal) => { return { value: aggVal.key, count: aggVal.doc_count } });
      }),
    };
  }

  /**
   * Search for classes and employees
   * @param  {string}  query  The search to query for
   * @param  {string}  termId The termId to look within
   * @param  {integer} min    The index of first document to retreive
   * @param  {integer} max    The index of last document to retreive
   */
  async search(query, termId, min, max, filters = {}) {
    const {
      output, resultCount, took, aggregations,
    } = await this.getSearchResults(query, termId, min, max, filters);
    const results = await (new HydrateSerializer(Section)).bulkSerialize(output);

    return {
      searchContent: results,
      resultCount,
      took,
      aggregations,
    };
  }
}

const instance = new Searcher();
export default instance;
