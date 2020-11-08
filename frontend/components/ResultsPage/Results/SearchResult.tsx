import React from 'react'
import macros from '../../macros'
import DesktopSectionPanel from './DesktopSectionPanel'
import Course from '../../classModels/Course'
import IconGlobe from '../../images/IconGlobe'
import IconArrow from '../../images/IconArrow'
import SignUpForNotifications from '../../SignUpForNotifications'
import useResultDetail from './useResultDetail'
import useUserChange from './useUserChange';
import useShowAll from './useShowAll';

interface SearchResultProps {
  aClass: Course,
}
export default function SearchResult({ aClass } : SearchResultProps) {
  const { optionalDisplay, creditsString } = useResultDetail(aClass)
  const userIsWatchingClass = useUserChange(aClass)
  const {
    showAll, setShowAll, renderedSections, hideShowAll,
  } = useShowAll(aClass)

  const feeString = aClass.feeDescription && aClass.feeAmount ? `${aClass.feeDescription}- $${aClass.feeAmount}` : null

  return (
    <div className='SearchResult'>
      <div className='SearchResult__header'>
        <div className='SearchResult__header--left'>
          <span className='SearchResult__header--classTitle'>
            {aClass.subject} {aClass.classId}: {aClass.name}
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
        <span className='SearchResult__header--creditString'>
          {creditsString()}
        </span>
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
      <div className='SearchResult__showAll' role='button' tabIndex={ 0 } onClick={ () => setShowAll(!showAll) }>
        <span>{showAll ? 'Collapse sections' : 'Show all sections'}</span>
        <IconArrow className={ showAll ? 'SearchResult__showAll--collapse' : null } />
      </div>
      )}
    </div>
  )
}
