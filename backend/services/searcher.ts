/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import elastic, { Elastic } from '../libs/elastic';
import { Course, Section } from '../database/models/index';
import HydrateSerializer from '../database/serializers/hydrateSerializer';
import macros from '../macros';
import {
  EsQuery, QueryNode, ExistsQuery, TermsQuery, TermQuery, LeafQuery, MATCH_ALL_QUERY, RangeQuery,
  EsFilterStruct, EsAggFilterStruct, FilterInput, FilterPrelude, AggFilterPrelude, SortInfo, Range,
  SearchResults, PartialResults, EsResultBody, EsMultiResult,
} from '../search_types';

class Searcher {
  elastic: Elastic;

  subjects: Set<string>;

  filters: FilterPrelude;

  aggFilters: AggFilterPrelude;

  AGG_RES_SIZE: number;

  constructor() {
    this.elastic = elastic;
    this.subjects = null;
    this.filters = Searcher.generateFilters();
    this.aggFilters = _.pickBy<EsFilterStruct, EsAggFilterStruct>(this.filters, (f): f is EsAggFilterStruct => f.agg !== false);
    this.AGG_RES_SIZE = 1000;
  }

  static generateFilters(): FilterPrelude {
    // type validating functions
    const isString = (arg: any): arg is string => {
      return typeof arg === 'string';
    };

    const isStringArray = (arg: any): arg is string[] => {
      return Array.isArray(arg) && arg.every((elem) => isString(elem));
    };

    const isTrue = (arg: any): arg is true => {
      return typeof arg === 'boolean' && arg;
    };

    const isNum = (arg: any): arg is number => {
      return typeof arg === 'number';
    };

    const isRange = (arg: any): arg is Range => {
      return _.difference(Object.keys(arg), ['min', 'max']).length === 0 && isNum(arg.min) && isNum(arg.max);
    };

    // filter-generating functions
    const getSectionsAvailableFilter = (): ExistsQuery => {
      return { exists: { field: 'sections' } };
    };

    const getNUpathFilter = (selectedNUpaths: string[]): TermsQuery => {
      return { terms: { 'class.nupath.keyword': selectedNUpaths } };
    };

    const getSubjectFilter = (selectedSubjects: string[]): TermsQuery => {
      return { terms: { 'class.subject.keyword': selectedSubjects } };
    };

    // note that { online: false } is never in filters
    const getOnlineFilter = (selectedOnlineOption: boolean): TermQuery => {
      return { term: { 'sections.online': selectedOnlineOption } };
    };

    const getClassTypeFilter = (selectedClassTypes: string[]): TermsQuery => {
      return { terms: { 'sections.classType.keyword': selectedClassTypes } };
    };

    const getTermIdFilter = (selectedTermId: string): TermQuery => {
      return { term: { 'class.termId': selectedTermId } };
    };

    const getRangeFilter = (selectedRange: Range): RangeQuery => {
      return { range: { 'class.classId': { gte: selectedRange.min, lte: selectedRange.max } } };
    };

    return {
      nupath: { validate: isStringArray, create: getNUpathFilter, agg: 'class.nupath.keyword' },
      subject: { validate: isStringArray, create: getSubjectFilter, agg: 'class.subject.keyword' },
      online: { validate: isTrue, create: getOnlineFilter, agg: false },
      classType: { validate: isStringArray, create: getClassTypeFilter, agg: 'sections.classType.keyword' },
      sectionsAvailable: { validate: isTrue, create: getSectionsAvailableFilter, agg: false },
      classIdRange: { validate: isRange, create: getRangeFilter, agg: false },
      termId: { validate: isString, create: getTermIdFilter, agg: false },
    };
  }

  async initializeSubjects(): Promise<void> {
    if (!this.subjects) {
      this.subjects = new Set((await Course.aggregate('subject', 'distinct', { plain: false })).map((hash) => hash.distinct.toUpperCase()));
    }
  }

  /**
   * return a set of all existing subjects of classes
   */
  getSubjects(): Set<string> {
    return this.subjects;
  }

  /**
   * Remove any invalid filter with the following criteria:
   * 1. Correct key string and value type;
   * 2. Check that { online: false } should never be in filters
   *
   * A sample filters JSON object has the following format:
   * { 'nupath': string[],
   *   'college': string[],
   *   'subject': string[],
   *   'online': boolean,
   *   'classType': string }
   *
   * @param {object} filters The json object represting all filters on classes
   */
  validateFilters(filters: FilterInput): FilterInput {
    const validFilters: FilterInput = {};
    Object.keys(filters).forEach((currFilter) => {
      if (!(currFilter in this.filters)) {
        macros.log('Invalid filter key.', currFilter);
      } else if (!(this.filters[currFilter].validate(filters[currFilter]))) {
        macros.log('Invalid filter value type.', currFilter);
      } else {
        validFilters[currFilter] = filters[currFilter];
      }
    });
    return validFilters;
  }

  getFields(query: string): string[] {
    // if we know that the query is of the format of a course code, we want to do a very targeted query against subject and classId: otherwise, do a regular query.
    const courseCodePattern: RegExp = /^\s*([a-zA-Z]{2,4})\s*(\d{4})?\s*$/i;
    let fields = [
      'class.name^2', // Boost by 2
      'class.name.autocomplete',
      'class.subject^4',
      'class.classId^3',
      'sections.profs',
      'sections.crn',
      'employee.name^2',
      'employee.emails',
      'employee.phone',
    ];

    const patternResults = query.match(courseCodePattern);
    if (patternResults && (this.getSubjects()).has(patternResults[1].toUpperCase())) {
      // after the first result, all of the following results should be of the same subject, e.g. it's weird to get ENGL2500 as the second or third result for CS2500
      fields = ['class.subject^10', 'class.classId'];
    }

    return fields;
  }

  /**
   * Get elasticsearch query
   */
  generateQuery(query: string, termId: string, userFilters: FilterInput, min: number, max: number, aggregation: string = ''): EsQuery {
    const fields: string[] = this.getFields(query);
    // text query from the main search box
    const matchTextQuery: LeafQuery = query.length > 0
      ? {
        multi_match: {
          query: query,
          type: 'most_fields', // More fields match => higher score
          fields: fields,
        },
      }
      : MATCH_ALL_QUERY;

    // use lower classId has tiebreaker after relevance
    const sortByClassId: SortInfo = { 'class.classId.keyword': { order: 'asc', unmapped_type: 'keyword' } };

    // filter by type employee
    const isEmployee: LeafQuery = { term: { type: 'employee' } };
    const areFiltersApplied: boolean = Object.keys(userFilters).length > 0;
    const requiredFilters: FilterInput = { termId: termId, sectionsAvailable: true };
    const filters: FilterInput = { ...requiredFilters, ...userFilters };

    const classFilters: QueryNode[] = _(filters).pick(Object.keys(this.filters)).toPairs().map(([key, val]) => this.filters[key].create(val))
      .value();

    const aggQuery = !aggregation ? undefined : {
      [aggregation]: {
        terms: { field: this.aggFilters[aggregation].agg, size: this.AGG_RES_SIZE },
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
                { bool: { must: classFilters } },
                ...(!areFiltersApplied) ? [isEmployee] : [],
              ],
            },
          },
        },
      },
      aggregations: aggQuery,
    };
  }

  generateMQuery(query: string, termId: string, min: number, max: number, filters: FilterInput): EsQuery[] {
    const validFilters: FilterInput = this.validateFilters(filters);

    const queries: EsQuery[] = [this.generateQuery(query, termId, validFilters, min, max)];

    for (const fKey of Object.keys(this.aggFilters)) {
      const everyOtherFilter: FilterInput = _.omit(filters, fKey);
      queries.push((this.generateQuery(query, termId, everyOtherFilter, 0, 0, fKey)));
    }
    return queries;
  }

  async getSearchResults(query: string, termId: string, min: number, max: number, filters: FilterInput): Promise<PartialResults> {
    const queries = this.generateMQuery(query, termId, min, max, filters);
    const results: EsMultiResult = await elastic.mquery(`${elastic.CLASS_INDEX},${elastic.EMPLOYEE_INDEX}`, queries);
    return this.parseResults(results.body.responses, Object.keys(this.aggFilters));
  }

  parseResults(results: EsResultBody[], filters: string[]): PartialResults {
    return {
      output: results[0].hits.hits,
      resultCount: results[0].hits.total.value,
      took: results[0].took,
      aggregations: _.fromPairs(filters.map((filter, idx) => {
        return [filter, results[idx + 1].aggregations[filter].buckets.map((aggVal) => { return { value: aggVal.key, count: aggVal.doc_count } })];
      })),
    };
  }

  /**
   * Search for classes and employees
   * @param  {string}  query  The search to query for
   * @param  {string}  termId The termId to look within
   * @param  {integer} min    The index of first document to retreive
   * @param  {integer} max    The index of last document to retreive
   */
  async search(query: string, termId: string, min: number, max: number, filters: FilterInput = {}): Promise<SearchResults> {
    await this.initializeSubjects();
    const start = Date.now();
    // this can be re-written in a way that's less bad
    const {
      output, resultCount, took, aggregations,
    } = await this.getSearchResults(query, termId, min, max, filters);
    const startHydrate = Date.now();
    const results = await (new HydrateSerializer(Section)).bulkSerialize(output);

    return {
      searchContent: results,
      resultCount,
      took: {
        total: Date.now() - start,
        hydrate: Date.now() - startHydrate,
        es: took,
      },
      aggregations,
    };
  }
}

const instance = new Searcher();
export default instance;
