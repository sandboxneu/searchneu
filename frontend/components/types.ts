/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 *
 * ONLY PUT COMMONLY USED TYPES HERE
 */

import { FilterOptions } from './ResultsPage/filters';

// ======= Search Results ========
// Represents the course and employee data returned by /search
export interface SearchResult {
  results: SearchItem[],
  filterOptions: FilterOptions,
}

export type Course = any; //TODO
export type Employee = any;
export type SearchItem = Course | Employee;

export function BLANK_SEARCH_RESULT(): SearchResult {
  return { results: [], filterOptions: { nupath: [], subject: [], classType: [] } }
}
