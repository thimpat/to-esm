/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [./test/assets/given/demo-test.cjs]{@link ./test/assets/given/demo-test.cjs}
 * 
 **/
import {LOG_CONTEXT, LOG_TARGETS}  from "./test/assets/given/contexts-def.mjs";
import QuickLog  from "./test/src/cjs/quick-log.mjs";
import QuickLog2  from "./test/src/cjs/quick-log.mjs";
import QuickLog3  from "./test/src/cjs/quick-log.mjs";
import {COLOR_TABLE, SYSTEM}  from "./test/assets/given/constants.mjs";




const cc = `var QuickLog3 = require("../../src/cjs/quick-log.cjs")`;
// const aa = "let QuickLog2 = require(\"../../src/cjs/quick-log.cjs\")";

QuickLog.setContexts(LOG_CONTEXT);
QuickLog.setTargets(LOG_TARGETS);


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
