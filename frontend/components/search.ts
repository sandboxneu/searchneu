/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import URI from 'urijs';
import _ from 'lodash';

import macros from './macros';
import request from './request';
import { SearchResult, BLANK_SEARCH_RESULT } from './types';
import { FilterSelection, DEFAULT_FILTER_SELECTION } from './ResultsPage/filters';

// Every time there is a breaking change in the search api, increment the version
// This way, the backend will send back the result that frontend is expecting
// Even though this is a website and we deploy the frontend and the backend at the same time
// old version of the frontend may remain in browser's cache for a bit.
// Old versions don't stay around for too long, though.
const apiVersion = 2;


class Search {
  // Min terms is the minimum number of terms needed.
  // When this function is called for the first time for a given query, it will be 4.
  // Then, on subsequent calls, it will be 14, 24, etc. (if increasing by 10) (set by termCount)
  async search(query: string, termId: string, filters: FilterSelection, termCount: number): Promise<SearchResult> {
    // Searches are case insensitive.
    query = query.trim().toLowerCase();

    if (!termId || termId.length !== 6) {
      macros.log('No termId given in frontend/search.js. Returning empty array.', termId, termCount);
      return BLANK_SEARCH_RESULT();
    }

    const stringFilters = JSON.stringify(_.pickBy(filters, (v, k: keyof FilterSelection) => !_.isEqual(v, DEFAULT_FILTER_SELECTION[k])));

    // if in cache, set appropriate term count
    const existingTermCount = 0;

    // If we got here, we need to hit the network.
    macros.log('Requesting terms ', existingTermCount, 'to', termCount);


    const url = new URI('/search').query({
      query: query,
      termId: termId,
      minIndex: existingTermCount,
      maxIndex: termCount,
      apiVersion: apiVersion,
      filters: stringFilters,
    }).toString();

    // gets results
    const startTime = Date.now();
    const waitedRequest = await request.get(url);

    const results = waitedRequest.results;
    macros.logAmplitudeEvent('Search Timing', {
      query: query.toLowerCase(),
      time: Date.now() - startTime,
      startIndex: existingTermCount,
      endIndex: termCount,
    });

    if (results.error) {
      macros.error('Error with networking request', results.error);
      return BLANK_SEARCH_RESULT();
    }

    const searchResult:SearchResult = BLANK_SEARCH_RESULT();

    // Add to the end of exiting results.
    searchResult.results = searchResult.results.concat(results);

    // set filterOptions
    searchResult.filterOptions = waitedRequest.filterOptions;

    // Slice the array, so that if we modify the cache here it doesn't affect the instance we return.
    const retVal = searchResult.results.slice(0);

    return { results: retVal, filterOptions: searchResult.filterOptions };
  }
}

export default new Search();
