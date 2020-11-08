// A block of meetings, ex: "Tuesdays+Fridays, 9:50-11:30am"
export interface BackendMeeting {
  startDate: number;
  endDate: number;
  where: string;
  type: string;
  times: Partial<
  Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', MeetingTime[]>
  >;
}

// A single meeting time, ex: "9:50-11:30am"
export interface MeetingTime {
  start: number;
  end: number;
}

// Info about user that we send to fb webhook through "Send to Messenger" button
export interface FBUserPayload {
  classHash: string;
  sectionHashes: string[];
  dev: boolean;
  loginKey: string;
}
