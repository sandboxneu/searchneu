import express from 'express';
import macros from '../macros';
import elastic from '../elastic';
import searcher from '../searcher';
import Request from '../scrapers/request';

const request = new Request('server');

const searchRouter = express.Router()
export default searchRouter

searchRouter.get('/', async (req, res) => {
  if (macros.DEV && !(await elastic.isConnected())) {
    const fromProd = await request.get(
      `https://searchneu.com${req.originalUrl}`,
    );
    res.send(fromProd.body);
    macros.log(
      'In dev mode and Elasticsearch not available. Hitting production search API endpoint',
    );
    return;
  }

  if (typeof req.query.query !== 'string' || req.query.query.length > 500) {
    macros.log(macros.getTime(), 'Need query.', req.query);
    res.send(
      JSON.stringify({
        error: 'Need query param.',
      }),
    );
    return;
  }

  if (
    !macros.isNumeric(req.query.minIndex)
    || !macros.isNumeric(req.query.maxIndex)
  ) {
    macros.log('Need numbers as max and min index.');
    res.send(
      JSON.stringify({
        error: 'Max and Min index must be numbers.',
      }),
    );
    return;
  }

  let minIndex = 0;
  if (req.query.minIndex) {
    minIndex = parseInt(req.query.minIndex, 10);
  }

  let maxIndex = 10;
  if (req.query.maxIndex) {
    maxIndex = parseInt(req.query.maxIndex, 10);
  }

  if (!req.query.termId || req.query.termId.length !== 6) {
    macros.log('Invalid termId.');
    res.send(
      JSON.stringify({
        error: 'Invalid termid.',
      }),
    );
    return;
  }

  let filters = {};
  if (req.query.filters) {
    // Ensure filters is a string
    if (typeof req.query.filters !== 'string') {
      macros.log('Invalid filters.', req.query.filters);
      res.send(
        JSON.stringify({
          error: 'Invalid filters.',
        }),
      );
    } else {
      try {
        filters = JSON.parse(req.query.filters);
      } catch (e) {
        macros.log('Invalid filters JSON.', req.query.filters);
        res.send(
          JSON.stringify({
            error: 'Invalid filters.',
          }),
        );
      }
    }
  }

  const {
    searchContent,
    took,
    resultCount,
    aggregations,
  } = await searcher.search(
    req.query.query,
    req.query.termId,
    req.query.minIndex,
    req.query.maxIndex,
    filters,
  );
  const midTime = Date.now();

  let string;
  if (req.query.apiVersion === '2') {
    string = JSON.stringify({
      results: searchContent,
      filterOptions: aggregations,
    });
  } else {
    string = JSON.stringify(searchContent);
  }

  // Not sure I am logging all the necessary analytics
  const analytics = {
    searchTime: took.total,
    esTime: took.es,
    hydateTime: took.hydrate,
    stringifyTime: Date.now() - midTime,
    resultCount: resultCount,
  };

  macros.logAmplitudeEvent('Backend Search', analytics);

  macros.log(macros.getTime(), macros.getIpPath(req));
  macros.log(
    `Search for ${req.query.query} from ${minIndex} to ${maxIndex} took ${
      took.total
    } total. Hydrate from postgres took ${took.hydrate}. ES reports ${
      took.es
    } internally. Stringify took ${Date.now() - midTime} with ${
      searchContent.length
    } results`,
  );

  // Set the header for application/json and send the data.
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(string);
});
