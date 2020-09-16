import express from 'express';
import notifyer from '../libs/notifyer';
import macros from '../macros';

const feedbackRouter = express.Router()
export default feedbackRouter;

// This is more complicated than just req.connection.remoteAddress (which will always be 127.0.0.1)
// because this Node.js server is running behind both nginx and Cloudflare.
// This will return the IP of the user connecting to the site
// Because there are two step between us and the user,
// we need to check the second the last item in the x-forwarded-for header.
// We shouldn't check the first item in the header, because someone could send a forged x-forwarded-for header
// that would be added to the beginning of the x-forwarded-for that is received here.
function getRemoteIp(req) {
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }

  if (macros.PROD) {
    return '';
  }

  const forwardedForHeader = req.headers['x-forwarded-for'];

  if (!forwardedForHeader) {
    if (macros.PROD) {
      macros.warn(
        'No forwardedForHeader?',
        req.headers,
        req.connection.remoteAddress,
      );
    }

    return req.connection.remoteAddress;
  }

  const splitHeader = forwardedForHeader.split(',');

  // Cloudflare sometimes sends health check requests
  // which will only have 1 item in this header
  if (splitHeader.length === 1) {
    macros.warn('Only have one item in the header?', forwardedForHeader);
    return splitHeader[0].trim();
  }

  if (splitHeader.length > 2) {
    macros.log('Is someone sending a forged header?', forwardedForHeader);
  }

  return splitHeader[splitHeader.length - 2].trim();
}

// Rate-limit submissions on a per-IP basis
let rateLimit = {};
let lastHour = 0;

feedbackRouter.post('/', async (req, res) => {
  // Don't cache this endpoint.
  res.setHeader('Cache-Control', 'no-cache, no-store');

  if (!req.body.message) {
    macros.log('Empty message?');
    res.send(
      JSON.stringify({
        error: 'Need message.',
      }),
    );
    return;
  }

  const userIp = getRemoteIp(req);

  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));

  // Clear out the rate limit once per hour
  // Do this instead of a timer because the vast majority of the time people are not going to be submitting
  // submissions, and this works just as well.
  if (lastHour !== currentHour) {
    lastHour = currentHour;
    rateLimit = {};
  }

  if (!rateLimit[userIp]) {
    rateLimit[userIp] = 0;
  }

  // Max ten submissions per hour
  if (rateLimit[userIp] >= 10) {
    res.send({
      error: 'Rate limit reached. Please wait an hour before submitting again.',
    });

    return;
  }

  rateLimit[userIp]++;

  let message = `Feedback form submitted: ${req.body.message}`;

  if (req.body.contact) {
    message += ` | ${req.body.contact}`;
  }

  // Ryan's User ID for the Search NEU in facebook.
  // In order to send Ryan a FB message with this ID you would need the secret key for the Search NEU page
  const response = await notifyer.sendFBNotification(
    '1397905100304615',
    message,
  );

  // Also send a message to Da-Jin
  const response2 = await notifyer.sendFBNotification(
    '2289421987761573',
    message,
  );

  if (response.error || response2.error) {
    macros.log(response.error, response2.error);
    res.send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
  } else {
    res.send(
      JSON.stringify({
        status: 'Success.',
      }),
    );
  }
});
