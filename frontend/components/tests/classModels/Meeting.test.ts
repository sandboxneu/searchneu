/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import Meeting from '../../classModels/Meeting';
import { DayOfWeek } from '../../types';
import { BackendMeeting } from '../../../../common/types';

let meeting : Meeting;
let exam : Meeting;

beforeEach(() => {
  const serverDataForMeeting : BackendMeeting = {
    startDate: 18267,
    endDate: 18366,
    where: 'Robinson Hall 411',
    type: 'Class',
    times: {
      2: [
        {
          start: 35400,
          end: 41400,
        },
      ],
      5: [
        {
          start: 35400,
          end: 41400,
        },
      ],
    },
  };
  meeting = new Meeting(serverDataForMeeting);

  const serverDataForExam : BackendMeeting = {
    startDate: 18375,
    endDate: 18375,
    where: 'Mugar Life Science Building 201',
    type: 'Final Exam',
    times: {
      4: [
        {
          start: 37800,
          end: 45000,
        },
      ],
    },
  };
  exam = new Meeting(serverDataForExam);
});

describe('Testing basic getters on meeting', () => {
  it('gets location', () => {
    expect(meeting.getLocation()).toBe('Robinson Hall');
  });

  it('is exam?', () => {
    expect(meeting.isExam()).toBe(false);
  });

  it('meets on weekends', () => {
    expect(meeting.meetsOnWeekends()).toBe(false);
  });
});

it('Testing getMeetsOnDay', () => {
  expect(meeting.meetsOnDay(DayOfWeek.TUESDAY)).toBe(true);
  expect(meeting.meetsOnDay(DayOfWeek.WEDNESDAY)).toBe(false);
  expect(exam.meetsOnDay(DayOfWeek.SUNDAY)).toBe(false);
  expect(exam.meetsOnDay(DayOfWeek.THURSDAY)).toBe(true);
});

describe('Testing basic getters on exam', () => {
  it('get location', () => {
    expect(exam.getLocation()).toBe('Mugar Life Science Building');
  });

  it('is exam?', () => {
    expect(exam.isExam()).toBe(true);
  });

  it('meets on weekends?', () => {
    expect(exam.meetsOnWeekends()).toBe(false);
  });
});
