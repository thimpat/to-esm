import isValidUTF8  from "utf-8-validate";
'use strict';

//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
// prettier-ignore


export default {
    isValidStatusCode,
    isValidUTF8(buf)
    {
        return buf.length < 150 ? _isValidUTF8(buf) : isValidUTF8(buf);
    },
    tokenChars
};
