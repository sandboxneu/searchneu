import express, { Request, Response } from 'express';
import _ from 'lodash';
import macros from '../macros';
import notifyer from '../notifyer';
import database from '../database';
import prisma from '../prisma';

const subscriptionRouter = express.Router();
export default subscriptionRouter;

// sends data to the database in the backend
async function verifyRequestAndGetDbUser(req: Request, res: Response) {
  // Don't cache this endpoint.
  res.setHeader('Cache-Control', 'no-cache, no-store');

  // if there's no body in the request, well, we'll crash, so let's not
  if (!req.body || !req.body.loginKey) {
    return null;
  }

  // Checks checks checks
  // Make sure the login key is valid
  if (
    typeof req.body.loginKey !== 'string'
    || req.body.loginKey.length !== 100
  ) {
    macros.log('Invalid login key', req.body.loginKey);
    return null;
  }

  const senderId = req.body.senderId;

  // Ensure sender id exists and is valid.
  if (
    !senderId
    || typeof senderId !== 'string'
    || senderId.length !== 16
    || !macros.isNumeric(senderId)
  ) {
    macros.log('Invalid senderId', req.body, senderId);
    return null;
  }

  // Get the user from the db.
  const user = await database.get(senderId);
  if (!user) {
    macros.log(
      `Didn't find valid user from client request: ${JSON.stringify(user)}`,
      req.body.loginKey,
    );
    return null;
  }

  // Verify the loginkey
  if (!user.loginKeys.includes(req.body.loginKey)) {
    macros.log(
      `Login Key's didn't match: ${JSON.stringify(user.loginKeys, null, 4)}`,
      req.body.loginKey,
    );
    return null;
  }

  return user;
}

subscriptionRouter.post('/', async (req, res) => {
  const userObject = await verifyRequestAndGetDbUser(req, res);

  if (!userObject) {
    res.status(401).send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  const { sectionHash = null, classHash = null } = req.body;

  if ((sectionHash && typeof sectionHash !== 'string') || (classHash && typeof classHash !== 'string')) {
    res.status(400).send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  // Early exit if user is already watching this section and class.
  if (
    userObject.watchingSections.includes(sectionHash)
    && userObject.watchingClasses.includes(classHash)
  ) {
    macros.log('User was already watching', userObject);
    res.send(
      JSON.stringify({
        status: 'Success',
      }),
    );
    return;
  }

  if (sectionHash) {
    userObject.watchingSections.push(sectionHash);
    const section = await prisma.section.findOne({ where: { id: sectionHash }, include: { course: true } });

    if (!section || !section.course) {
      res.status(404).send(
        JSON.stringify({
          status: 'No such section',
        }),
      );
      return
    }
    notifyer.sendFBNotification(
      req.body.senderId,
      `You have subscribed to notification for a section in ${section.course.subject} ${section.course.classId} (CRN: ${section.crn})!`,
    );
  }
  if (classHash) {
    userObject.watchingClasses.push(classHash);
    const course = await prisma.course.findOne({ where: { id: classHash } });
    if (!course) {
      res.status(404).send(
        JSON.stringify({
          status: 'No such class',
        }),
      );
      return
    }
    notifyer.sendFBNotification(
      req.body.senderId,
      `You have subscribed to notifications for the class ${course.subject} ${course.classId}`,
    );
  }

  await database.set(req.body.senderId, userObject);
  macros.log('sending done, section/class added. User:', userObject);

  // Send a status of success.
  res.send(
    JSON.stringify({
      status: 'Success',
    }),
  );
});

subscriptionRouter.delete('/', async (req, res) => {
  const userObject = await verifyRequestAndGetDbUser(req, res);

  if (!userObject) {
    macros.log('Invalid request', req.body);
    res.send(
      JSON.stringify({
        error: 'Error.',
      }),
    );
    return;
  }

  const sectionHash = req.body.sectionHash;

  // Early exit if user is not watching this section.
  if (!userObject.watchingSections.includes(sectionHash)) {
    res.send(
      JSON.stringify({
        status: 'Success',
      }),
    );
    return;
  }

  _.pull(userObject.watchingSections, sectionHash);

  await database.set(req.body.senderId, userObject);
  macros.log('sending done, section removed.');

  const section = await prisma.section.findOne({ where: { id: sectionHash }, include: { course: true } });

  notifyer.sendFBNotification(
    req.body.senderId,
    `You have unsubscribed from notifications for a section of ${section.course.subject} ${section.course.classId} (CRN: ${section.crn}).`,
  );

  res.send(
    JSON.stringify({
      status: 'Success',
    }),
  );
});
