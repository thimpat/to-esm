import db  from "mime-db";
import _toesmTemp1  from "path";
/** This file is an extract of a module. Use for testing only **/
'use strict'

/**
 * Module dependencies.
 * @private
 */



var extname  = _toesmTemp1.extname


/**
 * Module variables.
 * @private
 */

var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/
var TEXT_TYPE_REGEXP = /^text\//i

/**
 * Module exports.
 * @public
 */

 export function charset (type) {
}

/**
 * Create a full Content-Type header given a MIME type or extension.
 *
 * @param {string} str
 * @return {boolean|string}
 */

function contentType (str) {
}

function extension (type) {
    if (!type || typeof type !== 'string') {
        return false
    }
}

function lookup (path) {
    if (!path || typeof path !== 'string') {
        return false
    }

    // get the extension ("ext" or ".ext" or full path)
    var extension = extname('x.' + path)
        .toLowerCase()
        .substr(1)

    if (!extension) {
        return false
    }

    return exports.types[extension] || false
}

/**
 * Populate the extensions and types maps.
 * @private
 */
function populateMaps (extensions, types) {
    // source preference (least -> most)
}
