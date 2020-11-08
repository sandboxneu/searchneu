import express from 'express';
import macros from '../macros';
import database from '../database';

const userRouter = express.Router()
export default userRouter;

// All of the requests/responses that haven't been pushed yet. Added here when
// requests come in for data that isn't quite in the backend yet
// saved as loginKey: {res, timeStamp}.
// Timestamp is the output of Date.now().
// getUserDataReqs are cleared after 3 seconds
export const getUserDataReqs = {};

// The minimum amount of time in milliseconds user data reqs are held before
// they are elgible for cleanup.
const MAX_HOLD_TIME_FOR_GET_USER_DATA_REQS = 3000;

// The interval id that fires when user data reqs are awaiting cleanup.
let getUserDataInterval = null;

// cleans up old requests that are more than 10 seconds old.
function cleanOldGetUserDataReqs() {
  macros.log('cleaning up old getUserDataReqs', Object.keys(getUserDataReqs));

  const now = Date.now();

  for (const loginKey of Object.keys(getUserDataReqs)) {
    // Purge all entries over 3s old
    if (
      now - getUserDataReqs[loginKey].timeStamp
      > MAX_HOLD_TIME_FOR_GET_USER_DATA_REQS
    ) {
      getUserDataReqs[loginKey].res.send(
        JSON.stringify({
          error: 'Request timed out',
        }),
      );

      delete getUserDataReqs[loginKey];
      macros.log('cleaned out loginKey req', loginKey);
    }
  }

  // If they are all gone, stop the interval
  if (Object.keys(getUserDataReqs).length === 0) {
    clearInterval(getUserDataInterval);
    getUserDataInterval = null;
  }
}

function addToUserDataReqs(loginKey, res) {
  if (getUserDataReqs[loginKey]) {
    // Respond with a warning instead of an error
    // because we don't need the frontend to invalidate the loginKey and sender id if this happens.
    getUserDataReqs[loginKey].res.send(
      JSON.stringify({
        warning:
          'Warning, multiple requests from the same user in quick succession',
      }),
    );
  }
  getUserDataReqs[loginKey] = {
    res: res,
    timeStamp: Date.now(),
  };

  // Start the interval if it isn't already running
  if (!getUserDataInterval) {
    getUserDataInterval = setInterval(
      cleanOldGetUserDataReqs,
      MAX_HOLD_TIME_FOR_GET_USER_DATA_REQS / 4,
    );
  }
}

// finds the user with the login key that's been requested
// if the user doesn't exist, return
async function findMatchingUser(requestLoginKey: string) {
  return database.getByLoginKey(requestLoginKey);
}

userRouter.post('/', async (req, res) => {
  // Don't cache this endpoint.
  res.setHeader('Cache-Control', 'no-cache, no-store');

  if (!req.body || !req.body.loginKey) {
    res.send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  // Checks checks checks
  // Make sure the login key is valid
  if (
    typeof req.body.loginKey !== 'string'
    || req.body.loginKey.length !== 100
  ) {
    macros.log('Invalid login key', req.body.loginKey);
    res.send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  const senderId = req.body.senderId;

  // If the sender is given, make sure it is valid
  if (
    senderId
    && (typeof senderId !== 'string'
      || senderId.length !== 16
      || !macros.isNumeric(senderId))
  ) {
    macros.log('Invalid senderId', req.body, senderId);
    res.send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  let matchingUser;

  // If the client specified a specific senderId, lookup that specific user.
  // if not, we have to loop over all the users's to find a matching loginKey

  if (senderId) {
    const user = await database.get(senderId);

    // Don't do long polling when the the sender id is given
    // and the user doesn't exist in the db because
    // the only time this would happen is if the data was cleared out of the db.
    if (!user) {
      macros.log('User with senderId not in database yet', senderId);
      res.send(
        JSON.stringify({
          error: 'Error.',
        }),
      );
      return;
    }

    // Ensure that a loginKey matches
    if (!user.loginKeys.includes(req.body.loginKey)) {
      macros.log('Invalid loginKey', senderId, req.body.loginKey, user);
      res.send(
        JSON.stringify({
          error: 'Error.',
        }),
      );
      return;
    }

    matchingUser = user;
    if (!matchingUser.watchingSections) {
      matchingUser.watchingSections = [];
    }

    if (!matchingUser.watchingClasses) {
      matchingUser.watchingClasses = [];
    }
  } else {
    matchingUser = await findMatchingUser(req.body.loginKey);

    if (!matchingUser) {
      // Hang onto the request for a bit in case the webhook comes in shortly.
      addToUserDataReqs(req.body.loginKey, res);
      return;
    }
  }

  res.send(
    JSON.stringify({
      status: 'Success',
      user: matchingUser,
    }),
  );
});
