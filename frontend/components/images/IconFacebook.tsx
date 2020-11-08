import React from 'react';

export default ({
  width = '15', height = '15', fill = '#0084FF', className,
} : {
  width?: string, height?: string, fill?: string, className?: string}) => (
    <svg width={ width } height={ height } viewBox='0 0 15 15' fill='none' className={ className } xmlns='http://www.w3.org/2000/svg'>
      <path fillRule='evenodd' clipRule='evenodd' d='M7.5 0C3.35787 0 0 3.1091 0 6.94442C0 9.12987 1.09065 11.0792 2.79507 12.3522V15L5.34871 13.5985C6.03022 13.7871 6.75225 13.8889 7.5 13.8889C11.6421 13.8889 15 10.7797 15 6.94442C15 3.1091 11.6421 0 7.5 0ZM8.24537 9.35187L6.33539 7.31481L2.60873 9.35187L6.70808 5.00002L8.66461 7.03702L12.3447 5.00002L8.24537 9.35187Z' fill={ fill } />
    </svg>
)
