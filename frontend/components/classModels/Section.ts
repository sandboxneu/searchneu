/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';

import Keys from '../../../common/Keys';
import macros from '../macros';
import Meeting, { MomentTuple } from './Meeting';

/**
 * Represents all of the data a Section of a {@link Course} holds.
 */
class Section {
  static requiredPath : string[] = ['host', 'termId', 'subject', 'classId'];

  static optionalPath : string[] = ['crn'];

  static API_ENDPOINT : string = '/listSections';

  dataStatus : string;

  lastUpdateTime : number;

  meetings: Meeting[];

  profs : string[];

  waitCapacity : number;

  waitRemaining : 0;

  online : boolean;

  seatsRemaining: number;

  seatsCapacity : number;

  honors : boolean;

  crn: string;

  campus: string;

  campusDescription: string;

  url: string;

  constructor(config) {
    //loading status is done if any sign that has data
    if (config.dataStatus !== undefined) {
      this.dataStatus = config.dataStatus;
    } else if (this.lastUpdateTime !== undefined || this.meetings) {
      this.dataStatus = macros.DATASTATUS_DONE;
    }

    this.meetings = [];
  }

  static create(config) : Section {
    const instance = new this(config);
    instance.updateWithData(config);
    return instance;
  }

  getHash() : string {
    return Keys.getSectionHash(this);
  }

  meetsOnWeekends() : boolean {
    return this.meetings.some((meeting) => { return meeting.meetsOnWeekends(); });
  }

  getAllMeetingMoments(ignoreExams = true) : MomentTuple[] {
    let retVal = [];
    this.meetings.forEach((meeting) => {
      if (ignoreExams && meeting.isExam()) {
        return;
      }

      retVal = retVal.concat(meeting.times);
    });

    retVal.sort((a, b) => {
      return a.start.unix() - b.start.unix();
    });

    return retVal;
  }

  //returns [false,true,false,true,false,true,false] if meeting mon, wed, fri
  getDaysOfWeekAsBooleans() : boolean[] {
    const retVal = [false, false, false, false, false, false, false];

    this.getAllMeetingMoments().forEach((time) => {
      retVal[time.start.day()] = true;
    });

    return retVal;
  }

  getWeekDaysAsStringArray() : string[] {
    return this.getAllMeetingMoments().map((time) => {
      return time.start.format('dddd');
    });
  }

  //returns true if has exam, else false
  getHasExam() : boolean {
    return this.meetings.some((meeting) => { return meeting.isExam(); });
  }

  //returns the {start:end:} moment object of the first exam found
  //else returns null
  getExamMeeting() : Meeting {
    return this.meetings.find((meeting) => {
      return meeting.isExam() && meeting.times.length > 0;
    });
  }

  // Unique list of all professors in all meetings, sorted alphabetically
  getProfs() : string[] {
    return this.profs.length > 0 ? Array.from(this.profs).sort() : ['TBA'];
  }

  getLocations(ignoreExams = true) : string[] {
    const meetingLocations = [];
    this.meetings.forEach((meeting) => {
      if (!(ignoreExams && meeting.isExam())) {
        meetingLocations.push(meeting.location);
      }
    });
    const retVal = _.uniq(meetingLocations);

    // If it is at least 1 long with TBAs remove, return the array without any TBAs
    // Eg ["TBA", "Richards Hall 201" ] -> ["Richards Hall 201"]
    const noTBAs = _.pull(retVal.slice(0), 'TBA');

    return (noTBAs || retVal);
  }

  hasWaitList() : boolean {
    return this.waitCapacity > 0 || this.waitRemaining > 0;
  }

  updateWithData(data) : void {
    for (const attrName of Object.keys(data)) {
      if ((typeof data[attrName]) === 'function') {
        macros.error('given fn??', data, this, this.constructor.name);
        continue;
      }
      this[attrName] = data[attrName];
    }

    if (data.meetings) {
      const newMeetings = [];

      data.meetings.forEach((serverData) => {
        newMeetings.push(new Meeting(serverData));
      });

      this.meetings = newMeetings;
    }
  }

  //TODO : there has to be a way to make this *so much better*, but there are sooo many special cases omo
  compareTo(other) : number {
    if (this.online && !other.online) {
      return 1;
    }
    if (other.online && !this.online) {
      return -1;
    }

    if (this.meetings.length === 0 && other.meetings.length === 0) {
      return 0;
    }
    if (this.meetings.length > 0 && other.meetings.length === 0) {
      return -1;
    }
    if (this.meetings.length === 0 && other.meetings.length > 0) {
      return 1;
    }

    // If both sections have meetings, then sort alphabetically by professor.
    const thisProfs = this.getProfs();
    const otherProfs = other.getProfs();
    const thisOnlyTBA = thisProfs.length === 1 && thisProfs[0] === 'TBA';
    const otherOnlyTBA = otherProfs.length === 1 && otherProfs[0] === 'TBA';

    if (thisProfs.length > 0 || otherProfs.length > 0) {
      if (thisProfs.length === 0) {
        return -1;
      }
      if (otherProfs.length === 0) {
        return 1;
      }

      if (thisOnlyTBA && !otherOnlyTBA) {
        return 1;
      }
      if (!thisOnlyTBA && otherOnlyTBA) {
        return -1;
      }

      if (thisProfs[0] > otherProfs[0]) {
        return 1;
      }
      if (otherProfs[0] > thisProfs[0]) {
        return -1;
      }
    }

    // Then, sort by the starting time of the section.
    if (this.meetings[0].times.length === 0) {
      return 1;
    }
    if (other.meetings[0].times.length === 0) {
      return -1;
    }
    if (this.meetings[0].times[0].start.unix() < other.meetings[0].times[0].start.unix()) {
      return -1;
    }
    if (this.meetings[0].times[0].start.unix() > other.meetings[0].times[0].start.unix()) {
      return 1;
    }

    return 0;
  }
}

export default Section;
