import fs from 'fs-extra';
import path from 'path';
import prisma from '../backend/prisma';

interface Major {
  name: string;
  majorId: string;
  major: string;
  plans: string;
}

type MajorJSON = Record<string, Major[]>

// return the javascript object equivalent of a file in data/
// NOTE Prisma doesn't export its JsonValue/Object type, so have to use this return
function fetchData(filename: string): Record<any, any> {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', filename)));
}

// migrate all majors in the directory to the DB
function migrateData(majorDirectory: MajorJSON): void {
  Object.entries(majorDirectory).forEach(([termId, majors]) => {
    majors.forEach((m: Major) => {
      const majorObj = fetchData(m.major);
      const planObj  = fetchData(m.plans);

      prisma.major.create({
        data: {
          requirements: majorObj,
          plansOfStudy: planObj,
          catalogYear: termId,
          name: m.name,
          majorId: m.majorId,
        }
      }).then(() => console.log('major created\n'));
    });
  });
}

migrateData(fetchData('major.json') as MajorJSON);
