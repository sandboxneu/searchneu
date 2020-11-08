import React from 'react'

export default ({
  width = '12', height = '9', className,
} : {width?: string, height?: string, className?: string}) => (
  <svg width={ width } height={ height } className={ className } viewBox='0 0 12 9' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M1 4.70588L4.2 8L11 1' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);
