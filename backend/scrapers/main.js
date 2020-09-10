/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import matchEmployees from './employees/matchEmployees';
import macros from '../macros';
import classes from './classes/main';
import dumpProcessor from '../dumpProcessor';
import {
  Professor
} from '../database/models/index';


// Main file for scraping
// Run this to run all the scrapers

class Main {
  async main() {
    const classesPromise = classes.main(['neu']);
    console.log(await Professor.findAll())

    const promises = [classesPromise, matchEmployees.main()];

    const [termDump, mergedEmployees] = await Promise.all(promises);

    await dumpProcessor.main({ termDump: termDump, profDump: mergedEmployees });

    macros.log('done scrapers/main.js');
  }
}

const instance = new Main();

if (require.main === module) {
  instance.main();
}

export default instance;
