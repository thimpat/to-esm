/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [./test/assets/given/demo-test-22.cjs]{@link ./test/assets/given/demo-test-22.cjs}
 * 
 **/
import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
import { EMPTY_BUFFER }  from "./test/assets/given/constants.mjs";
import _toesmTemp1  from "node-gyp-build";
export default _toesmTemp1(__dirname);

/**
 * Some code extract from module to use with test only
 */
'use strict';


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

} catch (e) { 
}
