/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import path from 'path';
import express from 'express';
import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import compress from 'compression';
import bodyParser from 'body-parser';
import xhub from 'express-x-hub';
import { onShutdown } from 'node-graceful-shutdown';

import webpackConfig from './webpack.config.babel';
import macros from './macros';
import graphql from './graphql';
import generateSitemap from './generateSitemap';
import searchRouter from './routes/search';
import webhookRouter from './routes/webhook';
import subscriptionRouter from './routes/subscription';
import userRouter from './routes/user';
import feedbackRouter from './routes/feedback';
import prisma from './prisma';

const app = express();

// This xhub code is responsible for verifying that requests that hit the /webhook endpoint are from facebook in production
// This does some crypto stuff to make this verification
// This way, only facebook can make calls to the /webhook endpoint
// This is not used in development
const fbAppSecret = macros.getEnvVariable('fbAppSecret');

// Verify that the webhooks are coming from facebook
// This needs to be above bodyParser for some reason
app.use(xhub({ algorithm: 'sha1', secret: fbAppSecret }));

// gzip the output
app.use(compress());

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Process application/json
app.use(bodyParser.json());

// Prevent being in an iFrame.
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (macros.PROD) {
    // Assets are cached for a day.
    // This time interval was chosen because the scrapers are ran daily, so there is no point for the browser to update the cache more often that this.
    // These Cache-control headers are far from perfect though haha
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    // Don't cache in DEV
    // Could also use no-store which would prevent the browser from storing it all.
    // This no-cache header requires the browser to revalidate the cache with the server before serving it.
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

app.use('/search', searchRouter);
app.use('/webhook/', webhookRouter);
app.use('/subscription', subscriptionRouter);
app.use('/user', userRouter);
app.use('/feedback', feedbackRouter);

graphql.applyMiddleware({ app: app });

// This variable is also used far below to serve static files from ram in dev
let middleware;

if (macros.DEV) {
  const compiler = webpack(webpackConfig);
  middleware = webpackMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    logLevel: 'silent',
    stats: {
      colors: true,
      timings: true,
      hash: false,
      chunksM: false,
      chunkModules: false,
      modules: false,
    },
  });

  app.use(middleware);
  app.use(
    webpackHotMiddleware(compiler, {
      log: false,
    }),
  );
}

app.use(express.static('public'));

app.get('/sitemap.xml', async (req, res) => res.send(await generateSitemap()));

// Google Search Console Site Verification.
// I could make this a static file... but it is never going to change so though this would be easier.
// If this is removed, the domain will no longer be verified with Google.
app.get('/google840b636639b40c3c.html', (req, res) => {
  res.write('google-site-verification: google840b636639b40c3c.html');
  res.end();
});

// Bing site authentication.
app.get('/BingSiteAuth.xml', (req, res) => {
  res.write(
    '<?xml version="1.0"?>\n<users>\n  <user>8E6E97A65CAB89F73346E3E6DCE84142</user>\n</users>',
  );
  res.end();
});

app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  if (macros.PROD) {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  } else {
    res.write(
      middleware.fileSystem.readFileSync(
        path.join(webpackConfig.output.path, 'index.html'),
      ),
    );
    res.end();
  }
});

// your express error handler
// Express handles functions with four arguments as error handlers and functions with 3 arguments as middleware
// Add the eslint comment to keep all the args.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  // in case of specific URIError
  if (err instanceof URIError) {
    macros.log('Warning, could not process malformed url: ', req.url);
    return res.send('Invalid url.');
  }
  macros.error(err);
  return res.send(err);
});

// If this port is ever changed we would also need to update the port in Facebook's whitelisted_domains
const port = 5000;

if (macros.PROD) {
  const rollbarFunc = macros.getRollbar().errorHandler();

  // https://rollbar.com/docs/notifier/node_rollbar/
  // Use the rollbar error handler to send exceptions to your rollbar account
  app.use(rollbarFunc);
}

app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    macros.log(err);
  }

  macros.logAmplitudeEvent('Backend Server startup', {});

  macros.log(`Listening on port ${port}.`);
});

onShutdown('server', async () => {
  await prisma.$disconnect();
});
