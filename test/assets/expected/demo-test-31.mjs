

abc/** to-esm-all: skip **/
const path = require("path1");
/** to-esm-all: end-skip **/def

import rgbHex  from "./node_modules/rgb-hex-cjs/index.mjs";
import {COLOR_TABLE, SYSTEM}  from "./test/assets/given/constants.mjs";

const EOL =`
`;

ghi/** to-esm-esm: skip **/
import path  from "path2";
/** to-esm-esm: end-skip **/jkl

mno/** to-esm-browser: skip **/
const path = require("path3");
/** to-esm-browser: end-skip **/pqr


class Example
{

}


console.log("1- LogToFile is not supported in this environment. ")
 

console.log("2- LogToFile is not supported in this environment. ")
 

/** to-esm-esm: add
 console.log("3- LogToFile is not supported in this environment. ")
 **/

export default new Example();
export const anaLogger = new Example();
