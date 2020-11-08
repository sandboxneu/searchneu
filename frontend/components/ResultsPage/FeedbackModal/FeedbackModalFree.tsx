import React from 'react';

interface FreeResponseProps {
  feedbackQuery: string;
  setFeedbackQuery: (s: string) => void;
  setFeedbackType: (s: string) => void;
}

/**
 * Open-ended response in feedback modal
 */

export default function FeedbackModalFree({
  feedbackQuery, setFeedbackQuery, setFeedbackType,
} : FreeResponseProps) {
  return (
    <>
      <div className='FeedbackModal__popoutSubHeader'>
        <p>Is there any other feedback you&apos;d like to give?</p>
      </div>
      <div className='FeedbackModal__free'>
        <div className='FeedbackModal__freeSelector'>
          <input type='radio' id='freeSelectorLeft' name='FeedbackTypeSelector' />
          <label className='FeedbackModal__freeSelectorLeft' htmlFor='freeSelectorLeft' onClick={ () => setFeedbackType('bug') }>
            Bug
          </label>
          <input type='radio' id='freeSelectorCenter' name='FeedbackTypeSelector' defaultChecked />
          <label className='FeedbackModal__freeSelectorCenter' htmlFor='freeSelectorCenter' onClick={ () => setFeedbackType('filter') }>
            Filter
          </label>
          <input type='radio' id='freeSelectorRight' name='FeedbackTypeSelector' />
          <label className='FeedbackModal__freeSelectorRight' htmlFor='freeSelectorRight' onClick={ () => setFeedbackType('other') }>
            Other
          </label>
        </div>
        <textarea
          className='FeedbackModal__freeQuery'
          autoComplete='off'
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={ feedbackQuery }
          onChange={ (event) => { setFeedbackQuery(event.target.value); } }
        />
      </div>

    </>
  )
}
