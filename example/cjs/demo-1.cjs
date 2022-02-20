let SuperLog;

const rgbHex = require('rgb-hex-cjs');
const beforeReplace = require("before-replace");
const {stripStrings, parseString, stripComments} = require("strip-comments-strings");

const {LOG_CONTEXT, LOG_TARGETS} = require("./contexts-def.cjs")
SuperLog = require("../../src/cjs/quick-log-1.cjs");

let SuperLog2;
const {LOG_CONTEXT2, LOG_TARGETS2} = require("./contexts-def.cjs")
SuperLog2 = require("../../src/cjs/quick-log-1.cjs");

let SuperLog3;
const {LOG_CONTEXT3, LOG_TARGETS3} = require("./contexts-def.cjs")
SuperLog3 = require("../../src/cjs/quick-log-1.cjs");

let QuickLog2 = require("../../src/cjs/quick-log-2.cjs");
var QuickLog3 = require("../../src/cjs/quick-log-3.cjs");
var QuickLog4 = "rr";

const cc = `var QuickLog3 = require("../../src/cjs/quick-log.cjs")`;
// const aa = "let QuickLog2 = require(\"../../src/cjs/quick-log.cjs\")";

QuickLog4 = require("../../src/cjs/quick-log.cjs")

let myLog1, QuickLog5, yourLog;
let myLog2, QuickLog6, yourLog2;
let QuickLog7, myLog2, yourLog2;

SuperLog.setContexts(LOG_CONTEXT);
SuperLog.setTargets(LOG_TARGETS);

QuickLog5 = require("../../src/cjs/quick-log.cjs");
QuickLog6 = require("../../src/cjs/quick-log.cjs")
QuickLog7 = require("../../src/cjs/quick-log.cjs")

const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

SuperLog.setFormat(({context, id, message})=>`${context}: (${id}) ${message}`);


SuperLog.log(LOG_CONTEXT.STANDARD, `Basic Log example 2`, "+Something 0", "+Something 1");
SuperLog.log({context: LOG_CONTEXT.TEST, lid: 1000}, `Test Log example`);
SuperLog.log(LOG_CONTEXT.TEST, `Test Log example`, "+Something 3");
SuperLog.log(LOG_CONTEXT.C1, `Test Log example C1`);
SuperLog.log(LOG_CONTEXT.C2, `Test Log example C2`);
SuperLog.log(LOG_CONTEXT.C3, `Test Log example C3`);
SuperLog.log(`Basic Log example 1`);
QuickLog2.log(`Basic Log example 1`);
QuickLog3.log(`Basic Log example 1`);
