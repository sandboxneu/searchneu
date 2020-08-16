import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import SearchBar from '../ResultsPage/SearchBar'
import TermDropdown from '../ResultsPage/TermDropdown'
import IconGradcap from '../images/IconGradcap'
import IconScale from '../images/IconScale'
import IconTie from '../images/IconTie'


interface HomeSearchProps {
  setTermId: (s: string) => void
  termId: string
}

const HomeSearch = ({ setTermId, termId }: HomeSearchProps) => {
  const history = useHistory();
  const [selectedCampus, setSelectedCampus] = useState('neu');

  return (
    <div className='HomeSearch'>
      <div className='HomeSearch__campusSelector'>
        <input type='radio' id='campusSelectorNeu' name='CampusSelector' defaultChecked />
        <label className='HomeSearch__campusSelector--neu' htmlFor='campusSelectorNeu' onClick={ () => setSelectedCampus('neu') }>
          <IconGradcap />
          <span>NEU</span>
        </label>
        <input type='radio' id='campusSelectorCps' name='CampusSelector' />
        <label className='HomeSearch__campusSelector--cps' htmlFor='campusSelectorCps' onClick={ () => setSelectedCampus('cps') }>
          <IconTie />
          <span>CPS</span>
        </label>
        <input type='radio' id='campusSelectorLaw' name='CampusSelector' />
        <label className='HomeSearch__campusSelector--law' htmlFor='campusSelectorLaw' onClick={ () => setSelectedCampus('law') }>
          <IconScale />
          <span>Pee</span>
        </label>
      </div>
      <div className='HomeSearch__searchBar'>
        <div className='HomeSearch__searchBar--dropdown'>
          <TermDropdown
            termId={ termId }
            onChange={ setTermId }
            compact={ false }
          />
        </div>
        <div
          className='HomeSearch__searchBar--input'
        >
          <SearchBar
            onSearch={ (q) => { history.push(`${selectedCampus}/${termId}/${q}/`); } }
            query=''
          />
        </div>
      </div>
    </div>


  )
}

export default HomeSearch
