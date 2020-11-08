import React from 'react'

export default ({
  width = '11', height = '18', fill = '#646464', className,
} : {width?: string, height?: string, fill?: string, className?: string}) => (
  <svg width={ width } height={ height } className={ className } viewBox='0 0 11 18' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M10.1651 10.0889C10.6125 9.60065 10.6125 8.80922 10.1651 8.32107L2.87305 0.36612C2.42558 -0.12204 1.70007 -0.12204 1.2526 0.36612C0.805122 0.85427 0.805122 1.64573 1.2526 2.13388L7.73441 9.20495L1.2526 16.2761C0.805122 16.7642 0.805122 17.5557 1.2526 18.0438C1.70007 18.5319 2.42558 18.5319 2.87305 18.0438L10.1651 10.0889ZM7.52153 10.455H9.35486V7.95495H7.52153V10.455Z' fill={ fill } />
  </svg>
)
