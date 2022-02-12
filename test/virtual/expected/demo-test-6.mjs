import SuperLog from "../../src/cjs/quick-log-1.cjs";
import {LOG_CONTEXT, LOG_TARGETS}  from "./contexts-def.mjs"
;

import SuperLog2 from "../../src/cjs/quick-log-1.cjs";
import {LOG_CONTEXT2, LOG_TARGETS2}  from "./contexts-def.mjs"
;

import SuperLog3 from "../../src/cjs/quick-log-1.cjs";
import {LOG_CONTEXT3, LOG_TARGETS3}  from "./contexts-def.mjs"
;

import QuickLog2  from "../../src/cjs/quick-log-2.mjs";
import QuickLog3 from "../../src/cjs/quick-log.cjs" = require("../../src/cjs/quick-log-3.cjs");
var QuickLog4 = "rr";

const cc = `import `;
// const aa = "let QuickLog2 = require(\"../../src/cjs/quick-log.cjs\")";

QuickLog4  from "../../src/cjs/quick-log.mjs"

import myLog1, QuickLog5, yourLog;
import myLog2, QuickLog6, yourLog2;
import QuickLog7 from "../../src/cjs/quick-log.cjs", myLog2, yourLog2;

SuperLog.setContexts(LOG_CONTEXT);
SuperLog.setTargets(LOG_TARGETS);

QuickLog5  from "../../src/cjs/quick-log.mjs";
QuickLog6  from "../../src/cjs/quick-log.cjs"


import {COLOR_TABLE, SYSTEM}  from "./constants.mjs";

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
