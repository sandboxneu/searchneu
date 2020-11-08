import React from 'react'
import Section from '../../classModels/Section'
import WeekdayBoxes from './WeekdayBoxes'
import NotifCheckBox from '../../panels/NotifCheckBox'
import IconGlobe from '../../images/IconGlobe'
import useSectionPanelDetail from './useSectionPanelDetail';
import { MomentTuple } from '../../classModels/Meeting';

interface MobileSectionPanelProps {
  section: Section
  showNotificationSwitches: boolean
}

function MobileSectionPanel({ section, showNotificationSwitches } : MobileSectionPanelProps) {
  const { getSeatsClass } = useSectionPanelDetail(section)

  const groupedTimesAndDays = (times: MomentTuple[]) => {
    const daysOfWeek = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S']
    return times.reduce((acc, t) => {
      const timeString = `${t.start.format('h:mm')}-${t.end.format('h:mm a')}`
      acc.set(timeString, acc.get(timeString) ? acc.get(timeString) + daysOfWeek[t.start.day()] : daysOfWeek[t.start.day()])

      return acc
    }, new Map())
  }

  const getMeetings = (s: Section) => {
    return s.meetings.map((m) => (
      Array.from(groupedTimesAndDays(m.times)).map(([time, days]) => (
        <>
          <span className='MobileSectionPanel__meetings--time'>
            {`${days}, ${time} | ${m.location}`}
          </span>
          <br />
        </>
      ))
    ))
  }


  return (
    <div className='MobileSectionPanel'>
      <div className='MobileSectionPanel__header'>
        <span>{section.getProfs().join(', ')}</span>
        <span>Boston</span>
      </div>
      <div className='MobileSectionPanel__firstRow'>
        <div>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href={ section.url }
          >
            <IconGlobe />
          </a>
          <span>{section.crn}</span>
        </div>
        {showNotificationSwitches && <NotifCheckBox section={ section } />}
      </div>
      <div className='MobileSectionPanel__secondRow'>
        {!section.online && <WeekdayBoxes meetingDays={ section.getDaysOfWeekAsBooleans() } />}
      </div>
      <div className='MobileSectionPanel__meetings'>
        {section.online ? <span className='MobileSectionPanel__meetings--online'>Online Class</span>
          : getMeetings(section)}
      </div>
      <div className={ getSeatsClass() }>
        {`${section.seatsRemaining}/${section.seatsCapacity} Seats Available `}
      </div>
    </div>
  )
}

export default MobileSectionPanel
