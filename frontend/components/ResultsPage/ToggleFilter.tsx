import React from 'react';
import '../../css/_Filters.scss';

interface ToggleFilterProps {
  filterName: string,
  active: boolean,
  setActive: (a:boolean)=>void
}

export default function ToggleFilter({ filterName, active, setActive }: ToggleFilterProps) {
  return (
    <div className='toggleFilter'>
      <div className='toggleName'>
        <p>
          Show {filterName}
        </p>
      </div>
      <div className='toggleSwitch'>
        <input
          checked={ active }
          onChange={ () => { setActive(!active) } }
          className='react-switch-checkbox'
          id='react-switch-new'
          type='checkbox'
        />
        <label
          style={{ background:active && '#CA9897' }} // Color is currently same as darker red in Figma
          className='react-switch-label'
          htmlFor='react-switch-new'
        >
          <span className='react-switch-button' />
        </label>
      </div>
    </div>
  );
}

// TODO: add label, turn into generic ToggleFilter, add name parameter
