/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import ProfSerializer from './profSerializer';

class HydrateProfSerializer extends ProfSerializer {
  /* eslint-disable no-underscore-dangle */
  _serializeProf(prof) {
    return prof;
  }
}

export default HydrateProfSerializer;
