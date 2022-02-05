const {LOG_CONTEXT, LOG_TARGETS} = require("./contexts-def.cjs")
const QuickLog = require("../../src/cjs/quick-log.cjs");

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
