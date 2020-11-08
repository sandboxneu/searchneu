import React from 'react';
import CheckboxGroup from '../CheckboxGroup';

interface CheckboxProps {
  feedbackOptions: string[];
  selectedFeedback: string[];
  setSelectedFeedback: (a:string[]) => void;
}
/**
 * Checkbox selection form for feedback modal
 */

export default function FeedbackModalCheckboxes({ feedbackOptions, selectedFeedback, setSelectedFeedback } : CheckboxProps) {
  return (
    <>
      <div className='FeedbackModal__popoutSubHeader'>
        <p>What info are you looking for?</p>
      </div>
      <div className='FeedbackModal__checkBoxes'>
        <CheckboxGroup name='FeedbackModalCheckboxes' value={ selectedFeedback } onChange={ setSelectedFeedback }>
          {(Checkbox) => (
            <>
              {feedbackOptions.map((feedbackOption) => (
                <div key={ feedbackOption } className='FeedbackModal__checkboxElement'>
                  <label className='FeedbackModal__checkboxText'>
                    <Checkbox value={ feedbackOption } />
                    <span className='FeedbackModal__checkboxBox' />
                    {feedbackOption}
                  </label>
                </div>
              ))}
            </>
          )}
        </CheckboxGroup>
      </div>
    </>
  );
}
