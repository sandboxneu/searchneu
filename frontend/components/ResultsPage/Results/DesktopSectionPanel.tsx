import React from 'react'
import Section from '../../classModels/Section'
import WeekdayBoxes from './WeekdayBoxes'
import NotifCheckBox from '../../panels/NotifCheckBox'
import useSectionPanelDetail from './useSectionPanelDetail';
import Meeting, { MomentTuple } from '../../classModels/Meeting';

interface DesktopSectionPanelProps {
  section: Section
  showNotificationSwitches: boolean

}


function DesktopSectionPanel({ section, showNotificationSwitches } : DesktopSectionPanelProps) {
  const { getSeatsClass } = useSectionPanelDetail(section)

  const getUniqueTimes = (times: MomentTuple[]) => {
    const seenTimes = new Set()
    return times.reduce((acc, t) => {
      if (!seenTimes.has(t.start.format('h:mm'))) {
        acc.push(t)
      }
      seenTimes.add(t.start.format('h:mm'))
      return acc
    }, [])
  }

  const singleMeeting = (daysMet: boolean[], meeting: Meeting) => {
    if (daysMet.some((d) => d)) {
      return (
        <div className='DesktopSectionPanel__meetings'>
          <WeekdayBoxes meetingDays={ daysMet } />
          <div className='DesktopSectionPanel__meetings--times'>
            {getUniqueTimes(meeting.times).map((time) => (
              <>
                <span>
                  {`${time.start.format('h:mm')}-${time.end.format('h:mm a')} | ${meeting.location}`}
                </span>
                <br />
              </>
            ))}
          </div>
        </div>
      )
      // eslint-disable-next-line react/prop-types
    } if (section.meetings.length <= 1) {
      return <span>See syllabus</span>
    }
    return null
  }

  const getMeetings = (s: Section) => {
    return s.meetings.map((m) => {
      const meetingDays = Array(7).fill(false)
      meetingDays.forEach((d, index) => { if (m.meetsOnDay(index)) meetingDays[index] = true })
      return singleMeeting(meetingDays, m)
    })
  }


  return (
    <tr className='DesktopSectionPanel' key={ section.getHash() }>
      <td>
        <a href={ section.url } target='_blank' rel='noopener noreferrer'>{section.crn}</a>
      </td>
      <td>
        {section.getProfs().join(', ')}
      </td>
      <td>
        {section.online ? <span>Online Class</span>
          : getMeetings(section)}
      </td>
      <td>
        Boston
      </td>
      <td>
        <span className={ getSeatsClass() }>
          {section.seatsRemaining}/{section.seatsCapacity}
        </span>
        <br />
        <span>
          {`${section.waitRemaining}/${section.waitCapacity} Waitlist Seats`}
        </span>
      </td>
      {showNotificationSwitches && <td><div className='DesktopSectionPanel__notifs'><NotifCheckBox section={ section } /></div></td>}
    </tr>

  )
}

export default DesktopSectionPanel
