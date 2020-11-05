import React, { useState, useRef } from 'react';
import { without, pull } from 'lodash';
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

  const filteredOptions = options.filter((option) => option.value.toUpperCase().includes(filterString.toUpperCase()) && !selected.includes(option.value));

  useClickOutside(dropdown, isOpen, setIsOpen);

  function handleClickOnTheDropdown() {
    if (selected.length !== 0 || filteredOptions.length !== 0) {
      setIsOpen(!isOpen);
    }
  }

  function getDropdownStatus() {
    if (selected.length === 0 && filteredOptions.length === 0 && !isOpen) {
      return 'disabled';
    } if (isOpen) {
      return 'expanded';
    }
    return '';
  }

  function choosePlaceholder() {
    if (selected.length === 0) {
      if (filteredOptions.length > 0) {
        return 'Choose one or multiple';
      }
      return 'No filters apply';
    }
    return '';
  }

  return (
    <div className='DropdownFilter'>
      <div className='DropdownFilter__title'>{title}</div>
      <div className='DropdownFilter__dropdown' ref={ dropdown } role='button' tabIndex={ 0 } onClick={ handleClickOnTheDropdown }>
        <div className={ `DropdownFilter__search ${getDropdownStatus()}` }>
          {selected.map((selectElement) => (
            <span className='DropdownFilter__inputElement' role='button' tabIndex={ 0 } onClick={ (e) => e.stopPropagation() }>
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
            className={ `DropdownFilter__input ${selected.length === 0 && filteredOptions.length === 0 && !isOpen? 'disabled' : ''}` }
            tabIndex={ 0 }
            type='text'
            value={ filterString }
            placeholder={ choosePlaceholder() }
            onChange={ (event) => setFilterString(event.target.value) }
            onClick={ (e) => { e.stopPropagation(); if (selected.length !== 0 || filteredOptions.length !== 0) { setIsOpen(true); } } }
          />
          <img src={ dropdownArrow } alt='Dropdown arrow' className={ `DropdownFilter__icon ${getDropdownStatus()}` } />
        </div>
        <div className='DropdownFilter__selectable'>
          {isOpen && (filteredOptions.length === 0
            ? (
              <div
                role='option'
                tabIndex={ 0 }
                aria-selected='true'
                aria-checked='false'
                className='DropdownFilter--noResults'
                onClick={ (e) => e.stopPropagation() }
              >
                <span className='DropdownFilter__elementText'>No results found.</span>
              </div>
            )
            : filteredOptions.map((option) => (
              <div
                role='option'
                tabIndex={ -1 }
                aria-selected='true'
                aria-checked='false'
                className='DropdownFilter__element'
                key={ option.value }
                onClick={ (e) => {
                  setActive(selected.includes(option.value) ? pull(selected, option.value) : [...selected, option.value]);
                  setFilterString('');
                  e.stopPropagation();
                } }
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
