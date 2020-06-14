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
  const [filterString, setFilterString] = useState('');
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    setAreOptionsFresh(true);
  }, [options])
  const dropdown = React.createRef<HTMLDivElement>();

  function handleClickOutside(event) {
    if (dropdown.current && !(dropdown.current.contains(event.target))) {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  });

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
      <div className='DropdownFilter_dropdown' ref={ dropdown } onClick={ handleClickOnTheDropdown }>
        <input
          className='DropdownFilter__input'
          tabIndex={ 0 }
          type='text'
          value={ filterString }
          placeholder='Choose one or multiple'
          onChange={ (event) => setFilterString(event.target.value) }
        />
        <span className='DropdownFilter__icon' role='button' tabIndex={ 0 }>&#9660;</span>
        <div className='DropdownFilter__selectable'>
          {isOpen && options.filter((option) => option.value.toUpperCase().includes(filterString.toUpperCase())).map((option) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
