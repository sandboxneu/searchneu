/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import macros from '../macros';
import Course from './Course';
import { CourseReq } from '../../../backend/types';

export enum ReqKind {
  AND = 'and',
  OR = 'or'
}

export interface ReqType {
  type: ReqKind,
  values: Course[]
}

export interface ReqFor {
  values : CourseReq[]
}

/**
 * RequisiteBranch is a branch in the prerequisite or coreqs graph.
 */
class RequisiteBranch {
  prereqs: ReqType;

  coreqs: ReqType;

  constructor(data : ReqType) {
    const values = data.values.slice(0).sort((a : Course, b : Course) => {
      try {
        return a.compareTo(b);
      } catch (e) {
        return 0; // todo: temporary, anyone have ideas? (sometimes, for some reason, a & b aren't courses :/
      }
    });

    this.prereqs = {
      type: data.type,
      values: values,
    };

    this.coreqs = {
      type: ReqKind.OR,
      values: [],
    };
  }

  compareTo(other : RequisiteBranch) : number {
    if (!(other instanceof RequisiteBranch)) {
      return -1;
    }
    if (this.prereqs.values.length === 0 && other.prereqs.values.length) {
      return 0;
    }
    if (!(this.prereqs.values.length === other.prereqs.values.length)) {
      return other.prereqs.values.length - this.prereqs.values.length;
    }

    for (let i = 0; i < this.prereqs.values.length; i++) {
      const retVal = other.prereqs.values[i].compareTo(this.prereqs.values[i]);
      if (retVal !== 0) {
        return retVal;
      }
    }
    return 0;
  }


  // Downloads the first layer of prereqs
  async loadPrereqs(classMap) {
    macros.log('classMap', classMap);
    this.prereqs.values.forEach((childBranch) => {
      if (childBranch instanceof RequisiteBranch) {
        childBranch.loadPrereqs(classMap);
      } else if (!childBranch.isString) {
        childBranch.loadFromClassMap(classMap);
      }
    });
  }
}


export default RequisiteBranch;
