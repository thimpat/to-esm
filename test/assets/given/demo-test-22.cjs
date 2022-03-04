/**
 * Some code extract from module to use with test only
 */
'use strict';

const { EMPTY_BUFFER } = require('./constants');

function concat(list, totalLength) {
}

/**
 * Some comment
 *
 */
function _mask(source, mask, output, offset, length) {
    for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
    }
}

function _unmask(buffer, mask) {
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
    }
}

function toArrayBuffer(buf) {
    if (buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
    }

    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Converts `data` to a `Buffer`.
 *
 * @param {*} data The data to convert
 * @return {Buffer} The buffer
 * @throws {TypeError}
 * @public
 */
function toBuffer(data) {

    return buf;
}

try {
    module.exports = require('node-gyp-build')(__dirname);
} catch (e) {
    module.exports = require('./fallback');
}
