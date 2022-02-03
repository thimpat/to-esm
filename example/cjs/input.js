const INFO = require("./dep-2.cjs");

const {DIRECTION, MESSAGE} = require("./dep-1.cjs");

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
        console.log(INFO)
    }
}

module.exports = SomeClass;