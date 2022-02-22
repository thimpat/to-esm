const t1 = require("./../../../unrelated/t1-cjs.cjs");
const t2 = require("./../../../unrelated/t2.js");
const t3 = require("./../../../unrelated/t3.mjs");

const t4 = require("./../../../unrelated/deep1/t4-cjs.cjs");
const t5 = require("./../../../unrelated/deep1/t5.js");
const t6 = require("./../../../unrelated/deep1/t6.mjs");

const t7 = require("./../../../unrelated/deep1/deep2/t7-cjs.cjs");
const t8 = require("./../../../unrelated/deep1/deep2/t8.js");
const t9 = require("./../../../unrelated/deep1/deep2/t9.mjs");


console.log(t1, t2, t3, t4, t5, t6, t7, t8, t9);
