import React, { useState, useRef } from 'react';
import { without } from 'lodash';
import { Option } from './filters';
import useClickOutside from './useClickOutside';
import '../../css/_DropdownFilter.scss';
import pillClose from '../images/pillClose.svg';
import dropdownArrow from '../images/DropdownArrow.svg';

interface DropdownFilter {
  title: string,
  options: Option[],
  selected: string[],
  setActive: (a:string[])=>void
}
export default function DropdownFilter({
  title, options, selected, setActive,
}: DropdownFilter) {
  const [filterString, setFilterString] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const dropdown = useRef(null);

  useClickOutside(dropdown, isOpen, setIsOpen);

  function handleClickOnTheDropdown() {
    if (selected.length != 0 || filteredOptions.length != 0) {
      setIsOpen(!isOpen);
    }
  }

  function handleClickOnDropdownSearch(e) {
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  const filteredOptions = options.filter((option) => option.value.toUpperCase().includes(filterString.toUpperCase()) && !selected.includes(option.value));

  return (
    <div className= 'DropdownFilter'>
      <div className='DropdownFilter__title'>{title}</div>
      <div className='DropdownFilter__dropdown' ref={ dropdown } role='button' tabIndex={ 0 } onClick={ handleClickOnTheDropdown }>
        <div className={ `DropdownFilter__search ${selected.length === 0 && filteredOptions.length === 0 ? 'disabled' : isOpen ? 'expanded' : ''}` }>
          {selected.map((selectElement) => (
            <span className='DropdownFilter__inputElement' onClick={ (e) => e.stopPropagation() }>
              { selectElement }
              <img
                src={ pillClose }
                className='DropdownFilter__inputDelete'
                alt='X to remove pill'
                onClick={ () => setActive(without(selected, selectElement)) }
              />
            </span>
          ))}
          <input
            className={ `DropdownFilter__input ${selected.length === 0 && filteredOptions.length === 0 ? 'disabled' : ''}` }
            tabIndex={ 0 }
            type='text'
            value={ filterString }
            placeholder={ selected.length === 0 ? (filteredOptions.length > 0 ? 'Choose one or multiple' : 'No filters apply') : '' }
            onChange={ (event) => setFilterString(event.target.value) }
            onClick={ (e) => { e.stopPropagation(); if (selected.length != 0 || filteredOptions.length != 0) {setIsOpen(true);} } }
          />
          <img src={ dropdownArrow } alt='Dropdown arrow' className={ `DropdownFilter__icon ${selected.length === 0 && filteredOptions.length === 0 ? 'disabled' : isOpen ? 'rotated' : ''}` } />
        </div>
        <div className='DropdownFilter__selectable'>
          {isOpen && (filteredOptions.length === 0 ?
            <div
              role='option'
              aria-selected='true'
              aria-checked='false'
              className='DropdownFilter__noResults'
              onClick={ (e) => e.stopPropagation() }
            >
              <span className='DropdownFilter__elementText'>{"No results found."}</span>
            </div> :
            filteredOptions.map((option) => (
            <div
              role='option'
              tabIndex={ -1 }
              aria-selected='true'
              aria-checked='false'
              className='DropdownFilter__element'
              key={ option.value }
              onClick={ (e) => { setActive(selected.includes(option.value) ? pull(selected, option.value) : [...selected, option.value]);
              setFilterString('');
              e.stopPropagation(); } }
            >
              <span className='DropdownFilter__elementText'>{option.value}</span>
              <span className='DropdownFilter__elementCount'>({option.count})</span>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
