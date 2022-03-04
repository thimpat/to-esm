/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [./test/assets/given/demo-test-21.cjs]{@link ./test/assets/given/demo-test-21.cjs}
 * 
 **/
import { EMPTY_BUFFER }  from "./test/assets/given/constants.mjs";
import bufferUtil  from "bufferutil";
export default {
        concat,
        mask(source, mask, output, offset, length) {
            if (length < 48) _mask(source, mask, output, offset, length);
            else bufferUtil.mask(source, mask, output, offset, length);
        },
        toArrayBuffer,
        toBuffer,
        unmask(buffer, mask) {
            if (buffer.length < 32) _unmask(buffer, mask);
            else bufferUtil.unmask(buffer, mask);
        }
    };

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
} catch (e) /* istanbul ignore next */ { 
}


