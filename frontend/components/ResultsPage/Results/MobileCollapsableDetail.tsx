import React from 'react'
import IconCollapseExpand from '../../images/IconCollapseExpand'

interface MobileCollapsableDetailProps {
  title: string
  expand: boolean
  setExpand: (b: boolean) => void
  renderChildren: () => (JSX.Element | any[])
}

function MobileCollapsableDetail({
  title, expand, setExpand, renderChildren,
}: MobileCollapsableDetailProps) {
  return (
    <div className='MobileSearchResult__panel--collapsableContainer' role='button' tabIndex={ 0 } onClick={ () => setExpand(!expand) }>
      <div className='MobileSearchResult__panel--collapsableTitle'>
        <IconCollapseExpand width='6' height='12' fill='#000000' className={ expand ? 'MobileSearchResult__panel--rotatedIcon' : '' } />
        <span>{title}</span>
      </div>
      {expand && <div>{renderChildren()}</div>}
    </div>
  )
}

export default MobileCollapsableDetail
