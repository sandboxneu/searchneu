/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 *
 * ONLY PUT COMMONLY USED TYPES HERE
 */

import { FilterOptions } from './ResultsPage/filters';
import Course from './classModels/Course';
import Section from './classModels/Section';

// ======= Search Results ========
// Represents the course and employee data returned by /search
export interface SearchResult {
  results: SearchItem[],
  filterOptions: FilterOptions,
}

export type CourseResult = {
  class: Course,
  sections: Section[]
  type: string
}
export type Employee = any;
export type SearchItem = CourseResult | Employee;

export function BLANK_SEARCH_RESULT(): SearchResult {
  return { results: [], filterOptions: { nupath: [], subject: [], classType: [] } }
}


export enum DayOfWeek {
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY
}
