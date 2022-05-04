/** const chalk001 = require("chalk-cjs"); **/
const chalk000 = require("chalk-cjs");         // const path = require("path");
// const chalk002 = require("chalk-cjs");
const aa = "const chalk003 = require(\"chalk-cjs\");"
const magnimus = require("mama-magnimus");
const magnimus2 = require("mama-magnimus-cjs");
const rgbhex = /** Cool **/ require("rgb-hex-cjs");
const INFO1 = require("./dep-1.cjs");
const INFO2 = require("./dep-2.cjs");
const INFO3 = require('./dep-3.js');
const bb = `
    const chalk004 = require("chalk-cjs");
    
    const chalk005 = require("chalk-cjs");
`
const INFO4 = require("./something.js");
const INFO5 = require("./something.cjs");
const path = require("path");

/**
 * Multi line comment
 */
const {DIRECTION, MESSAGE} = require("./dep-1");

// ----

/**
 * @class SomeClass
 */
class SomeClass
{
    constructor()
    {
        console.log(DIRECTION)
        console.log(MESSAGE)
        console.log(INFO1)
    }
}

module.exports = SomeClass;