const {LOG_CONTEXTS, LOG_TARGETS} = require("./contexts-def.cjs");
const {anaLogger} = require("analogger");

anaLogger.keepLogHistory();

anaLogger.setContexts(LOG_CONTEXTS);
anaLogger.setTargets(LOG_TARGETS);
anaLogger.setActiveTarget(LOG_TARGETS.DEV3);
anaLogger.setOptions({logToDom: ".analogger"});
anaLogger.setOptions({silent: true}); 

console.log("==========================");
anaLogger.log(LOG_CONTEXTS.C1, "Test Log example C1");
anaLogger.log(LOG_CONTEXTS.C2, "Test Log example C2");
anaLogger.log(LOG_CONTEXTS.C3, "Test Log example C3");

anaLogger.setOptions({silent: false, hideError: false, logToFile: "./logme.log"});
console.log(anaLogger.getLogHistory());

anaLogger.assert(1 === 1);
anaLogger.assert(1 === 2);
anaLogger.assert(()=>true, true);

anaLogger.assert((a, b)=> a === b, true, 2, 2);

console.log("Log Before override");
anaLogger.overrideConsole();
console.log("Log After override");
console.error("Error Before override");
anaLogger.overrideError();
console.error("Error After override");
console.log("==========================");

anaLogger.log(LOG_CONTEXTS.STANDARD, "Basic Log example 2", "+Something 0", "+Something 1");

anaLogger.log({context: LOG_CONTEXTS.TEST, lid: 100000}, "Test Log example");
anaLogger.log({context: LOG_CONTEXTS.TEST, target: LOG_TARGETS.DEV3, lid: 100001}, "Test Log example with active target");
anaLogger.log({context: LOG_CONTEXTS.TEST, target: LOG_TARGETS.DEV1, lid: 100002}, "Test Log example with DEV1 target");
anaLogger.log({context: LOG_CONTEXTS.TEST, target: LOG_TARGETS.DEV2, lid: 100003}, "Test Log example with DEV2 target");
anaLogger.log("Test Log example with DEFAULT target");

anaLogger.log(LOG_CONTEXTS.TEST, "Test Log example", "+Something 3");
anaLogger.log(LOG_CONTEXTS.C1, "Test Log example C1");
anaLogger.log(LOG_CONTEXTS.C2, "Test Log example C2");
anaLogger.log(LOG_CONTEXTS.C3, "Test Log example C3");

console.log(LOG_CONTEXTS.C1, "Test Log example C4");
console.log(LOG_CONTEXTS.C1, "Test Log example C5");
console.log(LOG_CONTEXTS.C1, "Test Log example C6");

console.error({context: LOG_CONTEXTS.ERROR, lid: 200000}, "Testing Error 1");
console.error(LOG_CONTEXTS.ERROR, "Testing Error 2");
console.error("Testing Error 3");
console.error(undefined, "Testing Error 4");

console.error({context: LOG_CONTEXTS.ERROR, target: LOG_TARGETS.USER, lid: 200010}, "Testing Error 4");

// anaLogger.alert(`Hello from alert`, {aaa: 1012})

anaLogger.setErrorHandlerForUserTarget(function (context/*, ...args*/)
{
    if (context.environnment === anaLogger.ENVIRONMENT_TYPE.BROWSER)
    {
        alert("Users explicitly see this message");
    }
});

console.error({context: LOG_CONTEXTS.ERROR, target: LOG_TARGETS.USER, lid: 200020}, "Testing Error that triggers a special handler");

anaLogger.setLogFormat(
    function({contextName, message})
    {
        return `${contextName}: ${message}`;
    }
);

console.log(LOG_CONTEXTS.C1, "Test Log example C4 with new format");
console.log(LOG_CONTEXTS.C1, "Test Log example C5 with new format");
console.log(LOG_CONTEXTS.C1, "Test Log example C6 with new format");

anaLogger.log("Basic Log example 1");
