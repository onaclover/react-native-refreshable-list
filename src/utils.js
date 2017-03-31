/**
 * @providesModule RefreshableList.Utils
 */

import _ from 'lodash';

/**
 * @README:
 * Function to check whether a transformed dataBlob is empty or not
 * First map all empty check of its values (`_.map` works for both Arrays & Plain objects)
 * Then reduce results (array of booleans) using `&&` operator.
 * This function can be written verbosely in pseudo-code as:
 *  return isEmpty(valuesOf(dataBlob)[0]) && isEmpty(valuesOf(dataBlob)[1]) && ...
 */
export function isEmptyDataBlob(dataBlob) {
  return _.reduce(_.map(dataBlob, _.isEmpty), (final, element) => (final && element));
}

export function hasSectionsDataBlob(dataBlob) {
  if (_.isArray(dataBlob) && _.isArray(dataBlob[0])) return true;

  if (_.isPlainObject(dataBlob)) {
    const firstKey = _.keys(dataBlob)[0];
    const { [firstKey]: firstChild } = dataBlob;

    if (_.isPlainObject(firstChild) || _.isArray(firstChild))
      return true;
  }

  return false;
}
