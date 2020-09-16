import express from 'express';
import atob from 'atob';
import _ from 'lodash';
import macros from '../macros';
import notifyer from '../libs/notifyer';
import database from '../libs/database';
import HydrateCourseSerializer from '../database/serializers/hydrateCourseSerializer';
import { Course, Section } from '../database/models/index';
import { FBUserPayload } from '../../common/types';
import { getUserDataReqs } from './user';

const webhookRouter = express.Router();
export default webhookRouter;

// for Facebook verification of the endpoint.
webhookRouter.get('/', (req, res) => {
  const verifyToken = macros.getEnvVariable('fbVerifyToken');

  if (req.query['hub.verify_token'] === verifyToken) {
    macros.log('yup!');
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong token');
  }
});

async function onSendToMessengerButtonClick(
  sender: string,
  userPageId: number,
  b64ref: string,
) {
  macros.log('Got opt in button click!', b64ref);

  // The frontend send a classHash to follow and a list of sectionHashes to follow.
  let userObject: FBUserPayload | null = null;
  try {
    userObject = JSON.parse(atob(b64ref));
  } catch (e) {
    macros.error('Unable to parse user data from frontend?', b64ref);
    return;
  }

  // When the site is running in development mode,
  // and the send to messenger button is clicked,
  // Facebook will still send the webhooks to prod
  // Keep another field on here to keep track of whether the button was clicked in prod or in dev
  // and if it was in dev ignore it
  if (userObject.dev && macros.PROD) {
    return;
  }

  if (
    !userObject.classHash
    || !userObject.sectionHashes
    || !userObject.loginKey
  ) {
    macros.error('Invalid user object from webhook ', userObject);
    return;
  }

  if (
    typeof userObject.loginKey !== 'string'
    || userObject.loginKey.length !== 100
  ) {
    macros.error('Invalid login key', userObject.loginKey);
    return;
  }

  macros.log('Got webhook - received ', userObject);
  // TODO: check that sender is a string and not a number
  const existingData = await database.get(sender);
  const classModel = await Course.findByPk(userObject.classHash);
  const aClass = (Object.values(
    await new HydrateCourseSerializer(Section).bulkSerialize([classModel]),
  )[0] as any).class; // TODO fix when serializers are typed

  // User is signing in from a new device
  if (existingData) {
    macros.log('User found in db', existingData);
    // Add this array if it dosen't exist. It should exist
    if (!existingData.watchingClasses) {
      existingData.watchingClasses = [];
    }

    if (!existingData.watchingSections) {
      existingData.watchingSections = [];
    }

    const wasWatchingClass = existingData.watchingClasses.includes(
      userObject.classHash,
    );

    const sectionWasentWatchingBefore = [];

    for (const section of userObject.sectionHashes) {
      if (!existingData.watchingSections.includes(section)) {
        sectionWasentWatchingBefore.push(section);
      }
    }

    const classCode = `${aClass.subject} ${aClass.classId}`;
    // Check to see how many of these classes they were already signed up for.
    if (wasWatchingClass && sectionWasentWatchingBefore.length === 0) {
      notifyer.sendFBNotification(
        sender,
        `You are already signed up to get notifications if any of the sections of ${classCode} have seats that open up. Toggle the sliders back on https://searchneu.com to adjust notifications!`,
      );
    } else if (wasWatchingClass && sectionWasentWatchingBefore.length > 0) {
      // This should never run, because
      // 1) This flow only runs for classes with 0 or 1 sections
      // 2) It isn't possible to sign up for notification for a class but no sections in the class for classes that have sections
      // 3) Given that, the user must be signed up for the only section in the class too.
      // 4) And if there is only 1 section, there can't be any more sections to sign up for
      macros.warn(
        'User signed up for more sections through the webhook?',
        userObject,
        existingData,
      );
      notifyer.sendFBNotification(
        sender,
        `You are already signed up to get notifications if seats open up in some of the sections in ${classCode} and are now signed up for ${sectionWasentWatchingBefore.length} more sections too!`,
      );
    } else if (sectionWasentWatchingBefore.length === 0) {
      notifyer.sendFBNotification(
        sender,
        `Successfully signed up for notifications if sections are added to ${classCode}!`,
      );
    } else {
      // Same here
      macros.warn(
        'User signed up for more sections through the webhook?',
        userObject,
        existingData,
      );
      notifyer.sendFBNotification(
        sender,
        `Successfully signed up for notifications for ${sectionWasentWatchingBefore.length} sections in ${classCode}. Toggle the sliders back on https://searchneu.com to adjust notifications!`,
      );
    }

    // Only add if it dosen't already exist in the user data.
    if (!existingData.watchingClasses.includes(userObject.classHash)) {
      existingData.watchingClasses.push(userObject.classHash);
    }

    existingData.watchingSections = _.uniq(
      existingData.watchingSections.concat(userObject.sectionHashes),
    );

    // Remove any null or undefined values from the watchingClasses and watchingSections
    // This can happen if data is manually deleted from the DB, and the data is no longer continuous.
    // (eg index 0 is deleted and Google keeps the others at index 1 and index 2, so index 0 just contains undefined)
    if (
      existingData.watchingClasses.includes(undefined)
      || existingData.watchingSections.includes(undefined)
    ) {
      macros.log(
        'existing data class hashes or section hashes includes undefined!',
        existingData.watchingClasses,
        existingData.watchingSections,
      );
    }

    if (
      existingData.watchingClasses.includes(null)
      || existingData.watchingSections.includes(null)
    ) {
      macros.log(
        'existing data class hashes or section hashes includes null!',
        existingData.watchingClasses,
        existingData.watchingSections,
      );
    }

    _.pull(existingData.watchingClasses, null);
    _.pull(existingData.watchingClasses, undefined);

    _.pull(existingData.watchingSections, null);
    _.pull(existingData.watchingSections, undefined);

    // Add the login key to the array of login keys stored on this user
    if (!existingData.loginKeys) {
      existingData.loginKeys = [];
    }

    const loginKeys = new Set(existingData.loginKeys);
    loginKeys.add(userObject.loginKey);
    existingData.loginKeys = Array.from(loginKeys);
    if (getUserDataReqs[userObject.loginKey]) {
      macros.log('In webhook, responding to matching f request');
      getUserDataReqs[userObject.loginKey].res.send(
        JSON.stringify({
          status: 'Success',
          user: existingData,
        }),
      );

      delete getUserDataReqs[userObject.loginKey];
    } else {
      macros.log('in webhook, did not finding matching f request ');
    }

    database.set(sender, existingData);
  } else {
    let names = await notifyer.getUserProfileInfo(sender);
    if (!names || !names.first_name) {
      macros.warn('Unable to get name', names);
      names = {};
    } else {
      macros.log(
        'Got first name and last name',
        names.first_name,
        names.last_name,
      );
    }

    const newUser = {
      watchingSections: userObject.sectionHashes,
      watchingClasses: [userObject.classHash],
      firstName: names.first_name,
      lastName: names.last_name,
      facebookMessengerId: sender,
      facebookPageId: userPageId,
      loginKeys: [userObject.loginKey],
    };

    macros.log('Adding ', newUser, 'to the db');

    // Send the user a notification letting them know everything was successful.
    const classCode = `${aClass.subject} ${aClass.classId}`;
    if (userObject.sectionHashes.length === 0) {
      // Don't mention the sliders here because there are only sliders if there are sections.
      notifyer.sendFBNotification(
        sender,
        `Thanks for signing up for notifications ${names.first_name}. Successfully signed up for notifications if sections are added to ${classCode}!`,
      );
    } else {
      // Mention the sliders because there are sections.
      notifyer.sendFBNotification(
        sender,
        `Successfully signed up for notifications for ${userObject.sectionHashes.length} sections in ${classCode}. Toggle the sliders back on https://searchneu.com to adjust notifications!`,
      );
    }

    database.set(sender, newUser);
    if (getUserDataReqs[userObject.loginKey]) {
      macros.log('In webhook, responding to matching f request');
      getUserDataReqs[userObject.loginKey].res.send(
        JSON.stringify({
          status: 'Success',
          user: newUser,
        }),
      );

      delete getUserDataReqs[userObject.loginKey];
    } else {
      macros.log('in webhook, did not finding matching f request ');
    }
  }
}

// TODO: maybe there should be delete functionality?
async function unsubscribeSender(sender) {
  const existingData = await database.get(sender);

  if (existingData) {
    existingData.watchingClasses = [];
    existingData.watchingSections = [];
    macros.log('Unsubscribed ', sender, ' from everything.');
    database.set(sender, existingData);
  } else {
    macros.log(
      "Didn't unsubscribe ",
      sender,
      ' from anything because they were not in the database',
    );
  }

  notifyer.sendFBNotification(
    sender,
    "You've been unsubscribed from everything! Free free to re-subscribe to updates on https://searchneu.com",
  );
}

// In production, this is called from Facebook's servers.
// When a user sends a Facebook messsage to the Search NEU bot or when someone hits the send to messenger button.
// If someone sends a message to this bot it will respond with some hard-coded responses
// In development, this is called directly from the frontend so the backend will do the same actions as it would in prod for the same user actions in the frontend.
// Facebook will still call the webhook on the production server when the send to messenger button is clicked in dev. This webhook call is ignored in prod.
webhookRouter.post('/', async (req, res) => {
  // Verify that the webhook is actually coming from Facebook.
  // This is important.
  if ((!(req as any).isXHub || !(req as any).isXHubValid()) && macros.PROD) {
    macros.log(
      macros.getTime(),
      macros.getIpPath(req),
      'Tried to send a webhook',
    );
    macros.log(req.headers);
    res.send('nope');
    return;
  }

  // Check to see if the body is valid (https://rollbar.com/ryanhugh/searchneu/items/54/)
  if (!req.body || !req.body.entry || req.body.entry.length === 0) {
    macros.log('Invalid body on webhook?', req.body);
    res.send('nope');
    return;
  }

  // Now process the message.
  const messagingEvents = req.body.entry[0].messaging;
  for (let i = 0; i < messagingEvents.length; i++) {
    const event = messagingEvents[i];
    const sender = event.sender.id;
    if (event.message && event.message.text) {
      const text = event.message.text;

      if (text === 'test') {
        notifyer.sendFBNotification(
          sender,
          'CS 1800 now has 1 seat available!! Check it out on https://searchneu.com/cs1800 !',
        );
      } else if (text.toLowerCase() === 'stop') {
        unsubscribeSender(sender);
      } else if (text === 'What is my facebook messenger sender id?') {
        notifyer.sendFBNotification(sender, sender);
      } else if (
        text === 'no u'
        || text === 'no you'
        || text === 'nou'
        || text === 'noyou'
        || text === 'haha DJ & Ryan get spammed'
      ) {
        notifyer.sendFBNotification(sender, 'no u');
      } else {
        // Don't send anything if the user sends a message.
        // notifyer.sendFBNotification(sender, "Yo! 👋😃😆 I'm the Search NEU bot. I will notify you when seats open up in classes that are full. Sign up on https://searchneu.com !");
      }
    } else if (event.optin) {
      onSendToMessengerButtonClick(
        sender,
        req.body.entry[0].id,
        event.optin.ref,
      );

      // We should allways respond with a 200 status code, even if there is an error on our end.
      // If we don't we risk being unsubscribed for webhook events.
      // https://developers.facebook.com/docs/messenger-platform/webhook
      res.send(
        JSON.stringify({
          status: 'OK',
        }),
      );
      return;
    } else {
      macros.log(
        'Unknown webhook',
        sender,
        JSON.stringify(event),
        JSON.stringify(req.body),
      );
    }
  }
  res.sendStatus(200);
});
