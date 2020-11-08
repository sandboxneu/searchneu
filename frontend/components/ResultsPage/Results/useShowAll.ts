import { useState, useEffect } from 'react'
import Course from '../../classModels/Course'
import Section from '../../classModels/Section'

interface UseShowAllReturn {
  showAll: boolean
  setShowAll: (b: boolean) => void
  renderedSections: Section[]
  hideShowAll: boolean
}

export default function useShowAll(aClass: Course) : UseShowAllReturn {
  const [showAll, setShowAll] = useState(false)

  const sectionsShownByDefault = aClass.sections.length < 3 ? aClass.sections.length : 3
  const [renderedSections, setRenderedSections] = useState(aClass.sections.slice(0, sectionsShownByDefault))
  const hideShowAll = sectionsShownByDefault === aClass.sections.length

  useEffect(() => {
    if (showAll) {
      setRenderedSections(aClass.sections)
    } else {
      setRenderedSections(aClass.sections.slice(0, sectionsShownByDefault))
    }
  }, [aClass.sections, sectionsShownByDefault, showAll])

  return {
    showAll: showAll,
    setShowAll: setShowAll,
    renderedSections: renderedSections,
    hideShowAll: hideShowAll,
  }
}
