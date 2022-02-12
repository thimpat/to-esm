let QuickLog;
const {LOG_CONTEXT, LOG_TARGETS} = require("./contexts-def.cjs")
QuickLog = require("../../src/cjs/quick-log.cjs");
let QuickLog2 = require("../../src/cjs/quick-log.cjs");
var QuickLog3 = require("../../src/cjs/quick-log.cjs");
var QuickLog4 = "rr";

let some1 = require("./demo-test-2.cjs");
var some2 = require("./demo-test-3");


const cc = `var QuickLog3 = require("../../src/cjs/quick-log.cjs")`;
// const aa = "let QuickLog2 = require(\"../../src/cjs/quick-log.cjs\")";

QuickLog4 = require("../../src/cjs/quick-log.cjs")

let myLog1, QuickLog5, yourLog;
let myLog2, QuickLog6, yourLog2;
let QuickLog7, yourLog2;

QuickLog.setContexts(LOG_CONTEXT);
QuickLog.setTargets(LOG_TARGETS);

QuickLog5 = require("../../src/cjs/quick-log.cjs");
QuickLog6 = require("../../src/cjs/quick-log.cjs")
QuickLog7 = require("../../src/cjs/quick-log.cjs")

const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

QuickLog.setFormat(({context, id, message})=>`${context}: (${id}) ${message}`);


QuickLog.log(LOG_CONTEXT.STANDARD, `Basic Log example 2`, "+Something 0", "+Something 1");
QuickLog.log({context: LOG_CONTEXT.TEST, lid: 1000}, `Test Log example`);
QuickLog.log(LOG_CONTEXT.TEST, `Test Log example`, "+Something 3");
QuickLog.log(LOG_CONTEXT.C1, `Test Log example C1`);
QuickLog.log(LOG_CONTEXT.C2, `Test Log example C2`);
QuickLog.log(LOG_CONTEXT.C3, `Test Log example C3`);
QuickLog.log(`Basic Log example 1`);
QuickLog2.log(`Basic Log example 1`);
QuickLog3.log(`Basic Log example 1`);
