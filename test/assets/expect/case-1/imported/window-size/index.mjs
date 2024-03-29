import define  from "../../imported/define-property/index.mjs";
import utils  from "./utils.mjs";
/*!
 * window-size <https://github.com/jonschlinkert/window-size>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';




/**
 * Expose `windowSize`
 */

export default utils.get();

if (module.exports) {
  /**
   * Expose `windowSize.get` method
   */

  define(module.exports, 'get', utils.get);

  /**
   * Expose methods for unit tests
   */

  define(module.exports, 'env', utils.env);
  define(module.exports, 'tty', utils.tty);
  define(module.exports, 'tput', utils.tput);
  define(module.exports, 'win', utils.win);
}

