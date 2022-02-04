const INFO1 = require("./dep-1.cjs");
const INFO2 = require("./dep-2.cjs");
const INFO3 = require("./dep-6.js");
const INFO4 = require("./somehing.js");
const INFO5 = require("./somehing.cjs");

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