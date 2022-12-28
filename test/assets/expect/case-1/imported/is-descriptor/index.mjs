import typeOf  from "../../imported/kind-of/index.mjs";
import isAccessor  from "../../imported/is-accessor-descriptor/index.mjs";
import isData  from "../../imported/is-data-descriptor/index.mjs";
/*!
 * is-descriptor <https://github.com/jonschlinkert/is-descriptor>
 *
 * Copyright (c) 2015-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';





export default function isDescriptor(obj, key) {
  if (typeOf(obj) !== 'object') {
    return false;
  }
  if ('get' in obj) {
    return isAccessor(obj, key);
  }
  return isData(obj, key);
};
