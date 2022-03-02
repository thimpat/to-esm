/** This file is an extract of a module. Use for testing only **/
'use strict'

/**
 * Module dependencies.
 * @private
 */

var db = require('mime-db')
var extname = require('path').extname

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

exports.charset = charset
exports.charsets = { lookup: charset }
exports.contentType = contentType
exports.extension = extension
exports.extensions = Object.create(null)
exports.lookup = lookup
exports.types = Object.create(null)

// Populate the extensions/types maps
populateMaps(exports.extensions, exports.types)

/**
 * Get the default charset for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function charset (type) {
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
