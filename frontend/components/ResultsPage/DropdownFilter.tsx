import React, { useEffect, useState } from 'react';
import { pull } from 'lodash';
import { Option } from './filters';
import '../../css/_DropdownFilter.scss';

interface DropdownFilter {
  title: string,
  options: Option[],
  selected: string[],
  setActive: (a:string[])=>void
}
export default function DropdownFilter({
  title, options, selected, setActive,
}: DropdownFilter) {
  const [areOptionsFresh, setAreOptionsFresh] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => setAreOptionsFresh(true), [options])

  function handleClickOnTheDropdown() {
    if (areOptionsFresh) {
      // calculate the new options
      // if any selected no longer exist, remove them (filter)
      setAreOptionsFresh(false)
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className='DropdownFilter'>
      <div className='DropdownFilter__title'>{title}</div>
      <div className='DropdownFilter_dropdown'>
        <input className='DropdownFilter__input' tabIndex={ 0 } type='text' placeholder='Choose one or multiple' />
        <span className='DropdownFilter__icon' role='button' tabIndex={ 0 } onClick={ handleClickOnTheDropdown }>&#9660;</span>
        <div className='DropdownFilter__selectable'>
          {isOpen ? options.map(option => (
            <div
              role='option'
              tabIndex={ -1 }
              aria-selected='true'
              aria-checked='false'
              className='DropdownFilter__element'
              key={ option.value }
              onClick={ () => { setActive(selected.includes(option.value) ? pull(selected, option.value) : [...selected, option.value]) } }
            >
              <span className='DropdownFilter__elementText'>{option.value}</span>
              <span className='DropdownFilter__elementCount'>{option.count}</span>
            </div>
          )) : null }
        </div>
      </div>
    </div>
  );
}
