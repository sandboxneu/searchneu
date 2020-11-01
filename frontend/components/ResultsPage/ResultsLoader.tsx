import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import macros from '../macros';
import EmployeePanel from '../panels/EmployeePanel';
import SearchResult from './Results/SearchResult'
import MobileSearchResult from './Results/MobileSearchResult'

import Course from '../classModels/Course';
import Keys from '../../../common/Keys';
import { SearchItem } from '../types';

interface ResultsLoaderProps {
  results: SearchItem[],
  loadMore: () => void
}

function ResultsLoader({ results, loadMore }: ResultsLoaderProps) {
  return (
    <InfiniteScroll
      dataLength={ results.length }
      next={ loadMore }
      hasMore
      loader={ null }
    >
      <div className='five column row'>
        <div className='page-home'>
          {results.flatMap((result) => (result ? (
            <ResultItemMemoized
              key={ result.type === 'class' ? Keys.getClassHash(result.class) : result.employee.id }
              result={ result }
            />
          ) : []))}
        </div>
      </div>
    </InfiniteScroll>
  )
}

// Memoize result items to avoid unneeded re-renders and to reuse
// If the Panels are updated to function components, we can memoize them instead and remove this
const ResultItemMemoized = React.memo(({ result }:{result:SearchItem}) => {
  if (result.type === 'class') {
    const aClass = Course.create(result.class);
    aClass.loadSectionsFromServerList(result.sections);


    return macros.isMobile ? <MobileSearchResult aClass={ aClass } /> : <SearchResult aClass={ aClass } />;
  }

  if (result.type === 'employee') {
    return <EmployeePanel employee={ result.employee } />;
  }

  macros.log('Unknown type', result.type);
  return null;
});

export default ResultsLoader;
