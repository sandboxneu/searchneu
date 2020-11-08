/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import he from 'he';
import moment from 'moment';

import Keys from '../../../common/Keys';
import macros from '../macros';
import Section from './Section';
import RequisiteBranch, { ReqFor, ReqType, ReqKind } from './RequisiteBranch';

/**
 * Course represents a Course. Contains sections, its id, its name, crn, prereqs/coreqs, etc.
 */
class Course {
  static requiredPath : string[] = ['host', 'termId', 'subject'];

  static optionalPath : string[] = ['classId'];

  static API_ENDPOINT : string = '/listClasses';

  isString: boolean;

  sections: Section[];

  prereqs : ReqType;

  coreqs : ReqType;

  host: string;

  termId: string;

  desc : string;

  name : string;

  prettyUrl : string;

  classId : string;

  subject : string;

  lastUpdateTime : number;

  prereqsFor : ReqFor;

  optPrereqsFor : ReqFor;

  minCredits: number;

  maxCredits: number;

  feeDescription: string;

  feeAmount: number;

  nupath: any;


  constructor() {
    //true, if for instance "AP placement exam, etc"
    this.isString = false;

    this.sections = [];

    this.prereqs = {
      type: ReqKind.OR,
      values: [],
    };

    this.coreqs = {
      type: ReqKind.OR,
      values: [],
    };

    this.prereqsFor = {
      values: [],
    };

    this.optPrereqsFor = {
      values: [],
    };
  }

  static create(config) : Course {
    if (!config) {
      macros.error('Passed null config?', config);
      return null;
    }
    const instance = new this();
    instance.updateWithData(config);
    return instance;
  }

  // Returns a hash of this object used for referencing this instance - eg neu.edu/201910/CS/2500
  getHash() : string {
    return Keys.getClassHash(this);
  }

  convertServerRequisites(data) : Course {
    let retVal;

    //already processed node, just process the prereqs and coreqs
    if (data instanceof Course) {
      retVal = data;

      const newCoreqs = [];
      data.coreqs.values.forEach((subTree) => {
        newCoreqs.push(this.convertServerRequisites(subTree));
      });

      data.coreqs.values = newCoreqs;


      const newPrereqs = [];
      data.prereqs.values.forEach((subTree) => {
        newPrereqs.push(this.convertServerRequisites(subTree));
      });

      data.prereqs.values = newPrereqs;

    // Given a branch in the prereqs
    } else if (data.values && data.type) {
      const newValues : Course[] = [];
      data.values.forEach((subTree) => {
        newValues.push(this.convertServerRequisites(subTree));
      });

      retVal = new RequisiteBranch({
        type: data.type,
        values: newValues,
      });

    // Need to create a new Course()
    } else {
      //basic string
      if ((typeof data) === 'string') {
        data = {
          isString: true,
          desc: data,

        };
      }
      // else data is a normal class that has a .subject and a .classId

      //the leafs of the prereq trees returned from the server doesn't have host or termId,
      //but it is the same as the class that returned it,
      //so copy over the values
      if (!data.host) {
        data.host = this.host;
      }
      if (!data.termId) {
        data.termId = this.termId;
      }
      retVal = Course.create(data);
    }

    if (!retVal) {
      macros.error('ERROR creating jawn', retVal, data, retVal === data);
      return null;
    }

    return retVal;
  }

  removeMissingClasses(data) : ReqType {
    if (data.values) {
      const retVal = [];
      const subClassesHash = {};
      data.values.forEach((subData) => {
        if (subData.missing) {
          return;
        }

        // Check to see if it duplicates any classes already found in this data.values
        if (subData.subject && subData.classId) {
          const key = subData.subject + subData.classId;
          if (subClassesHash[key]) {
            return;
          }
          subClassesHash[key] = true;
        }

        subData = this.removeMissingClasses(subData);

        if (subData.values && subData.type) {
          // If all the prereqs are missing and were all removed, don't add
          if (subData.values.length > 0) {
            retVal.push(subData);
          }
        } else {
          retVal.push(subData);
        }
      });

      return {
        type: data.type,
        values: retVal,
      };
    }
    return data;
  }

  flattenCoreqs() {
    let stack = this.coreqs.values.slice(0);
    let curr;
    const classes = [];

    while ((curr = stack.pop())) {
      if (curr instanceof Course) {
        classes.push(curr);
      } else {
        // If it is a requisite branch, the classes needed are under prereqs...
        stack = stack.concat(curr.prereqs.values.slice(0));
      }
    }
    this.coreqs.values = classes;
  }

  // called once
  updateWithData(config) {
    if (config.title || config.allParents || config.missing || config.updateWithData) {
      macros.error();
    }

    //copy over all other attr given
    for (const attrName in config) {
      //dont copy over some attr
      //these are copied below and processed a bit
      if (!_(['coreqs', 'prereqs', 'download']).includes(attrName) && config[attrName] !== undefined) {
        this[attrName] = config[attrName];
      }
    }

    // Remove any prereqs or coreqs that are missing
    if (config.prereqs) {
      config.prereqs = this.removeMissingClasses(config.prereqs);
    }
    if (config.coreqs) {
      config.coreqs = this.removeMissingClasses(config.coreqs);
    }

    if (config.prereqs) {
      if (!config.prereqs.values || !config.prereqs.type) {
        macros.error('prereqs need values and type');
      } else {
        this.prereqs.type = config.prereqs.type;
        this.prereqs.values = [];

        //add the prereqs to this node, and convert server data
        config.prereqs.values.forEach((subTree) => {
          this.prereqs.values.push(this.convertServerRequisites(_.cloneDeep(subTree)));
        });

        this.prereqs.values.sort((a, b) => {
          return a.compareTo(b);
        });
      }
    }

    if (config.coreqs) {
      if (!config.coreqs.values || !config.coreqs.type) {
        macros.error('coreqs need values and type');
      } else {
        this.coreqs.type = config.coreqs.type;
        this.coreqs.values = [];

        //add the coreqs to this node, and convert server data
        config.coreqs.values.forEach((subTree) => {
          this.coreqs.values.push(this.convertServerRequisites(_.cloneDeep(subTree)));
        });

        this.flattenCoreqs();

        this.coreqs.values.sort((a, b) => {
          return a.compareTo(b);
        });
      }
    }


    //name and description could have HTML entities in them, like &#x2260;, which we need to convert to actuall text
    //setting the innerHTML instead of innerText will work too, but this is better
    if (config.desc) {
      this.desc = he.decode(config.desc);
    }
    if (config.name) {
      this.name = he.decode(config.name);
    }


    if (!config.prettyUrl && config.url) {
      this.prettyUrl = config.url;
    }
  }

  //this is used for panels i think and for class list (settings)
  //sort by classId, if it exists, and then subject
  compareTo(otherClass) {
    if (this.isString && otherClass.isString) {
      return 0;
    }

    if (this.isString) {
      return -1;
    }
    if (otherClass.isString) {
      return 1;
    }

    const aId = parseInt(this.classId, 10);
    const bId = parseInt(otherClass.classId, 10);

    if (aId > bId) {
      return 1;
    }

    if (aId < bId) {
      return -1;
    }

    // If ids are the same, sort by subject
    if (this.subject > otherClass.subject) {
      return 1;
    }
    if (this.subject < otherClass.subject) {
      return -1;
    }
    if (this.name > otherClass.name) {
      return 1;
    }
    if (this.name < otherClass.name) {
      return -1;
    }
    if (this.classId > otherClass.classId) {
      return 1;
    }
    if (this.classId < otherClass.classId) {
      return -1;
    }
    return 0;
  }

  getLastUpdateString() : string {
    return this.lastUpdateTime ? moment(this.lastUpdateTime).fromNow() : null;
  }

  //returns true if any sections have an exam, else false
  sectionsHaveExam() {
    return this.sections.some((section) => { return section.getHasExam(); });
  }

  hasAtLeastOneSectionFull() : boolean {
    return this.sections.some((e) => {
      return e.seatsRemaining <= 0 && e.seatsCapacity > 0
    });
  }

  /**
   * Creates and loads sections from the list of sections the server gives
   * @param serverList
   */
  loadSectionsFromServerList(serverList) {
    this.sections = [];

    for (const serverData of serverList) {
      const section = Section.create(serverData);
      if (!section) {
        macros.error('Error could not make section!', serverData);
        continue;
      }
      this.sections.push(section);
    }

    this.sections.sort((a, b) => {
      return a.compareTo(b);
    });
  }

  hasWaitList() : boolean {
    return this.sections.some((e) => {
      return e.hasWaitList();
    });
  }

  hasHonorsSections() : boolean {
    return this.sections.some((e) => {
      return e.honors;
    });
  }

  loadFromClassMap(classMap) : void {
    this.updateWithData(classMap[this.getHash()]);
  }
}
export default Course;
