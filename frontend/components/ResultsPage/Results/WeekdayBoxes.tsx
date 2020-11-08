import React from 'react'

interface WeekdayBoxesProps {
  meetingDays: boolean[]
}

function WeekdayBoxes({ meetingDays }: WeekdayBoxesProps) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className='WeekdayBoxes'>
      {
      meetingDays.map((box, index) => {
        return (
        // eslint-disable-next-line react/no-array-index-key
          <span key={ index } className={ `WeekdayBoxes__box${box ? '--checked' : ''}` }>
            {days[index]}
          </span>
        )
      })
}
    </div>
  )
}

export default WeekdayBoxes
