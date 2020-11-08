import React from 'react'

export default ({
  width = '11', height = '10', fill = '#505050', className,
} : {width?: string, height?: string, fill?: string, className?: string}) => (
  <svg width={ width } height={ height } className={ className } viewBox='0 0 11 10' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M10.4419 5.44194C10.686 5.19786 10.686 4.80214 10.4419 4.55806L6.46447 0.580583C6.22039 0.336505 5.82466 0.336505 5.58058 0.580583C5.3365 0.82466 5.3365 1.22039 5.58058 1.46447L9.11612 5L5.58058 8.53553C5.3365 8.77961 5.3365 9.17534 5.58058 9.41942C5.82466 9.6635 6.22039 9.6635 6.46447 9.41942L10.4419 5.44194ZM0 5.625L10 5.625V4.375L0 4.375L0 5.625Z' fill={ fill } />
  </svg>
);
