/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
// ONLY PUT COMMONLY USED TYPES HERE

// An NU employee

import { BackendMeeting } from '../common/types';

export interface Employee {
  name: string,
  firstName: string,
  lastName: string,
  primaryDepartment?: string,
  primaryRole?: string,
  phone?: string,
  emails: string[],
  url?: string,
  streetAddress?: string,
  personalSite?: string,
  googleScholarId?: string,
  bigPictureUrl?: string,
  pic?: string,
  link?: string,
  officeRoom?: string
}

// A course within a semester
export interface Course {
  host: string,
  termId: string,
  subject: string,
  classId: string,
  classAttributes: string[],
  desc: string,
  prettyUrl: string,
  name: string,
  url: string,
  lastUpdateTime: number,
  maxCredits: number,
  minCredits: number,
  coreqs: Requisite,
  prereqs: Requisite,
}

// A co or pre requisite object.
export type Requisite = string | BooleanReq | CourseReq;
export interface BooleanReq {
  type: 'and' | 'or';
  values: Requisite[];
}
export interface CourseReq {
  classId: string;
  subject: string;
  missing?: true;
}

export function isBooleanReq(req: Requisite): req is BooleanReq {
  return (req as BooleanReq).type !== undefined;
}

export function isCourseReq(req: Requisite): req is CourseReq {
  return (req as CourseReq).classId !== undefined;
}

// A section of a course
export interface Section {
  host: string,
  termId: string,
  subject: string,
  classId: string,
  crn: string,
  seatsCapacity: number,
  seatsRemaining: number,
  waitCapacity: number,
  waitRemaining: number,
  online: boolean,
  honors: boolean,
  url: string,
  profs: string[],
  meetings: BackendMeeting[],
}
