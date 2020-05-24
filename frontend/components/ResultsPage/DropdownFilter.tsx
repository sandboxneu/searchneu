import React, { useEffect, useState } from 'react';
import { Option } from './filters';

interface DropdownFilter {
  title: string,
  options: Option[],
  selected: string[],
  setActive: (a:string)=>void
}
export default function DropdownFilter({
  title, options, selected, setActive,
}: DropdownFilter) {
  const [areOptionsFresh, setAreOptionsFresh] = useState(true)
  useEffect(() => setAreOptionsFresh(true), [options])

  function handleClickOnTheDropdown(e: React.FormEvent<HTMLSelectElement>) {
    if (areOptionsFresh) {
      // calculate the new options
      setActive(e.currentTarget.value);
      setAreOptionsFresh(false)
    }
  }

  return (
    <div className='DropdownFilter'>
      <span className='filter__title'>{title}</span>
      <div className='DropdownFilter'>
        <select value={ selected } onChange={ handleClickOnTheDropdown }>
          {options.map(option => (
            <option key={ option.value } value={ option.value }>
              {option.value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
