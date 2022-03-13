/** to-esm-browser: remove **/
const path = require("path");
const fs = require("fs");
/** to-esm-browser: end-remove **/

/** to-esm-esm: remove **/
const os = require("os");
/** to-esm-esm: end-remove **/

abc/** to-esm-browser: skip **/
console.log("Skip this 1");
/** to-esm-all: end-skip **/def

const rgbHex = require("rgb-hex-cjs");
const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

/** to-esm-all: add
 console.log("1- LogToFile is not supported in this environment. ")
 **/

/** to-esm-esm: add
 console.log("2- LogToFile is not supported in this environment. ")
 **/

/** to-esm-browser: add
 console.log("3- LogToFile is not supported in this environment. ")
 **/

const EOL =`
`;

ghi/** to-esm-all: skip **/
console.log("Skip this 2");
/** to-esm-all: end-skip **/jkl


class Example
{

}

module.exports = new Example();
module.exports.anaLogger = new Example();
