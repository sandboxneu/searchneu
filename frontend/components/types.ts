/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 *
 * ONLY PUT COMMONLY USED TYPES HERE
 */
import { DropdownItemProps } from 'semantic-ui-react';
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

export const termDropdownOptions: DropdownItemProps[] = [
  {
    text: 'Spring 2021',
    value: '202130',
  },
  {
    text: 'Fall 2020',
    value: '202110',
  },
  {
    text: 'Summer I 2020',
    value: '202040',
  },
  {
    text: 'Summer II 2020',
    value: '202060',
  },
  {
    text: 'Summer Full 2020',
    value: '202050',
  },
  {
    text: 'Spring 2020',
    value: '202030',
  },
];

export const campusDropdownOptions: DropdownItemProps[] = [
  {
    text: 'NEU',
    value: 'neu',
  },
  {
    text: 'CPS',
    value: 'cps',
  },
  {
    text: 'Law',
    value: 'law',
  },
];
