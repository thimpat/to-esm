/** to-esm-browser: remove **/
const path = require("path");
const fs = require("fs");
const os = require("os");
/** to-esm-browser: end-remove **/

const stuff = require("./demo-test-15.cjs");

console.log(stuff.example.start())

/** to-esm-all: skip **/
console.log("Skip this 1");
/** to-esm-all: end-skip **/

const EOL =`
`;

/** to-esm-all: skip **/
console.log("Skip this 2");
/** to-esm-all: end-skip **/


class Example2
{
    constructor()
    {
        console.log("Hello you!");
    }
}

module.exports = new Example2();
module.exports.example2 = new Example2();
