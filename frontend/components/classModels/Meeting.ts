/* eslint-disable import/no-cycle */
/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import moment, { Moment } from 'moment';
import macros from '../macros';
import { DayOfWeek } from '../types';
import { BackendMeeting } from '../../../common/types';

type DayOfWeekToTime = {
  [key in DayOfWeek]? : TimeTuple[];
};

type TimeTuple = {
  start : number;
  end : number;
}

export type MomentTuple = {
  start : Moment,
  end : Moment
}

type TimeToMoment = {
  [key: number] : MomentTuple[];
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/**
 * Represents a meeting's location and times, e.g. labs and lecture.
 */
class Meeting {
  location: string;

  startDate: Moment;

  endDate: Moment;

  times: MomentTuple[];

  constructor(serverData : BackendMeeting) {
    if (!serverData) {
      return null;
    }

    this.location = serverData.where;

    // if without spaces and case insensitive is tba, make it TBA
    // TODO: I don't think this code actually triggers
    if (this.location.replace(/\s/gi, '').toUpperCase() === 'TBA') {
      this.location = 'TBA';
    }

    //beginning of the day that the class starts/ends
    this.startDate = moment((serverData.startDate + 1) * DAY_IN_MILLISECONDS);
    this.endDate = moment((serverData.endDate + 1) * DAY_IN_MILLISECONDS);

    //grouped by start+end time on each day.
    // eg, if have class that meets tue, wed, thu, at same time each day,
    // each list must be at least 1 long
    // you would have [[{start:end:},{start:end:},{start:end:}]]
    // where each start:end: object is a different day
    this.times = [];

    const timeMoments = [];

    if (serverData.times) {
      const dayIndexies = Object.keys(serverData.times);

      for (const dayIndex of dayIndexies) {
        serverData.times[dayIndex].forEach((event) => {
          //3 is to set in the second week of 1970
          const day = parseInt(dayIndex, 10) + 3;

          const obj = {
            start: moment.utc(event.start * 1000).add(day, 'day'),
            end: moment.utc(event.end * 1000).add(day, 'day'),
          };

          if (parseInt(obj.start.format('YYYY'), 10) !== 1970) {
            macros.error();
          }

          timeMoments.push(obj);
        });
      }
    }

    // returns objects like this: {3540000041400000: Array[3]}
    // if has three meetings per week that meet at the same times
    const groupedByTimeOfDay : TimeToMoment = _.groupBy(timeMoments, (event) => {
      const zero = moment(event.start).startOf('day');
      return `${event.start.diff(zero)}${event.end.diff(zero)}`;
    });

    // Get the values of the object returned above
    const valuesGroupedByTimeOfDay : MomentTuple[][] = _.values(groupedByTimeOfDay);

    // And sort by start time
    valuesGroupedByTimeOfDay.sort((meetingsInAday) => {
      const zero = moment(meetingsInAday[0].start).startOf('day');
      return meetingsInAday[0].start.diff(zero);
    });

    this.times = _.flatten(valuesGroupedByTimeOfDay);
  }

  getLocation() : string {
    // regex off the room number
    return this.location.replace(/\d+\s*$/i, '').trim();
  }

  isExam() : boolean {
    // this could be improved by scraping more data...
    return this.startDate.unix() === this.endDate.unix();
  }

  meetsOnDay(dayIndex : DayOfWeek) : boolean {
    return this.times.some((time) => { return time.start.day() === dayIndex; });
  }

  meetsOnWeekends() : boolean {
    return !this.isExam()
        && this.meetsOnDay(DayOfWeek.SUNDAY) || this.meetsOnDay(DayOfWeek.SATURDAY);
  }
}


export default Meeting;
