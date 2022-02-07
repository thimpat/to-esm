const chalk = require("chalk-cjs");
const colorConvert = require("color-convert-cjs");
const magnimus = require("mama-magnimus");
const magnimus = require("mama-magnimus-cjs");
const rgbhex = require("rgb-hex-cjs");
const INFO1 = require("./dep-1.cjs");
const INFO2 = require("./dep-2.cjs");
const INFO3 = require('./dep-3.js');
const INFO4 = require("./something.js");
const INFO5 = require("./something.cjs");
const path = require("path");

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