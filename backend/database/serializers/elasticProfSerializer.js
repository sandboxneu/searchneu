/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */
import _ from 'lodash';
import ProfSerializer from './profSerializer';

class ElasticProfSerializer extends ProfSerializer {
  /* eslint-disable no-underscore-dangle */
  _serializeProf(prof) {
    return _.pick(prof, ['name', 'emails', 'phone']);
  }
}

export default ElasticProfSerializer;
