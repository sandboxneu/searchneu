import React, { useState, useEffect } from 'react'
import { History } from 'history'
import macros from '../../macros'
import DesktopSectionPanel from './DesktopSectionPanel'
import Course from '../../classModels/Course'
import IconGlobe from '../../images/IconGlobe'
import IconArrow from '../../images/IconArrow'
import SignUpForNotifications from '../../SignUpForNotifications'
import user from '../../user'
import Keys from '../../../../common/Keys'
import useResultRequisite from './useResultRequisite'

interface SearchResultProps {
  aClass: Course,
  history: History
}
export default function SearchResult({ aClass, history } : SearchResultProps) {
  const feeString = aClass.feeDescription && aClass.feeAmount ? `${aClass.feeDescription}- $${aClass.feeAmount}` : null
  const optionalDisplay = useResultRequisite(history);

  console.log('class', aClass)

  const [showAll, setShowAll] = useState(false)
  const sectionsShownByDefault = aClass.sections.length < 3 ? aClass.sections.length : 3
  const [renderedSections, setRenderedSections] = useState(aClass.sections.slice(0, sectionsShownByDefault))
  const hideShowAll = sectionsShownByDefault === aClass.sections.length
  const [userIsWatchingClass, setUserIsWatchingClass] = useState(user.isWatchingClass(Keys.getClassHash(aClass)))

  const onUserUpdate = () => {
    // Show the notification toggles if the user is watching this class.
    const isWatching = user.isWatchingClass(Keys.getClassHash(aClass));
    if (isWatching !== userIsWatchingClass) {
      setUserIsWatchingClass(isWatching)
    }
  }

  useEffect(() => {
    user.registerUserChangeHandler(onUserUpdate)
    return () => user.unregisterUserChangeHandler(onUserUpdate)
  }, [])


  useEffect(() => {
    if (showAll) {
      setRenderedSections(aClass.sections)
    } else {
      setRenderedSections(aClass.sections.slice(0, sectionsShownByDefault))
    }
  }, [showAll])



  return (
    <div className='SearchResult'>
      <div className='SearchResult__header'>
        <span className='SearchResult__header--classTitle'>
          {aClass.subject} {aClass.classId}: {aClass.name}
        </span>
        <span className='SearchResult__header--creditString'>
          {aClass.maxCredits === aClass.minCredits ? `${aClass.maxCredits} CREDITS` : `${aClass.maxCredits}-${aClass.maxCredits} CREDITS`}
        </span>
        <div className='SearchResult__header--sub'>
          <a
            target='_blank'
            rel='noopener noreferrer'
            data-tip={ `View on ${aClass.host}` }
            href={ aClass.prettyUrl }
          >
            <IconGlobe />
          </a>
          <span>{`Updated ${(aClass.getLastUpdateString())}`}</span>
        </div>
      </div>
      <div className='SearchResult__panel'>
        {aClass.desc}
        <br />
        <br />
        <div className='SearchResult__panel--main'>
          <div className='SearchResult__panel--left'>
            NUPaths:
            {aClass.nupath.length > 0 ? <span> {aClass.nupath.join(', ')}</span> : <span className='empty'> None</span>}
            <br />
            Prerequisites: {optionalDisplay(macros.prereqTypes.PREREQ, aClass)}
            <br />
            Corequisites: {optionalDisplay(macros.prereqTypes.COREQ, aClass)}
            <br />
            Course fees:
            {feeString ? <span>  {feeString}</span> : <span className='empty'> None</span>}
          </div>
          <div className='SearchResult__panel--right'>
            <SignUpForNotifications aClass={ aClass } userIsWatchingClass={ userIsWatchingClass } />
          </div>
        </div>
      </div>
      <table className='SearchResult__sectionTable'>
        <thead>
          <tr>
            <th>
              <div className='inlineBlock' data-tip='Course Reference Number'>
                CRN
              </div>
            </th>
            <th> Professors </th>
            <th> Meetings </th>
            <th> Campus </th>
            <th> Seats </th>
            {userIsWatchingClass && <th> Notifications </th>}
          </tr>
        </thead>
        <tbody>
          {renderedSections.map((section) => (
              <DesktopSectionPanel
                key={ section.crn }
                section={ section }
                showNotificationSwitches={ userIsWatchingClass }
              />
            ))}
        </tbody>
      </table>
      {!hideShowAll
      && (
      <div className='SearchResult__showAll' onClick={ () => setShowAll(!showAll) }>
        <span>{showAll ? 'Collapse sections' : 'Show all sections'}</span>
        <IconArrow className={showAll && 'SearchResult__showAll--collapse'}/>
      </div>
      )}
    </div>
  )
}