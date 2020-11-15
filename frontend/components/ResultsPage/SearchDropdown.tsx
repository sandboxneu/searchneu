import { Dropdown, DropdownItemProps } from 'semantic-ui-react';
import React from 'react';

interface DropdownProps {
  options: DropdownItemProps[],
  value: string,
  placeholder: string,
  onChange: (t: string) => void,
  className: string,
  compact: boolean
}

function SearchDropdown({
  options, value, placeholder, onChange, className = 'searchDropdown', compact = false,
} : DropdownProps) {
  return (
    <Dropdown
      selection
      fluid
      compact={ compact }
      value={ value }
      placeholder={ placeholder }
      className={ `${className} ${compact ? `${className}--compact` : ''}` }
      options={ options }
      onChange={ (e, data) => onChange(data.value as string) }
    />
  );
}

export default React.memo(SearchDropdown);
