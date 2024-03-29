const chalk = require("chalk-cjs");
const rgbHex = require('rgb-hex-cjs');

const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

class Demo2
{
    system = ""

    logIndex = 0;
    contexts = [];
    targets = {};

    indexColor = 0;

    format = ""

    options = {
        hideHookMessage: false
    }

    static ALIGN = {
        LEFT : "LEFT",
        RIGHT: "RIGHT"
    }

    static ENVIRONMENT_TYPE = {
        BROWSER : "BROWSER",
        NODE: "NODE",
        OTHER: "OTHER"
    }

    constructor()
    {
        this.system = (typeof process === "object") ? SYSTEM.NODE : SYSTEM.BROWSER
        this.format = this.onBuildLog.bind(this)
        this.errorTargetHandler = this.onError.bind(this)
        this.errorUserTargetHandler = this.onErrorForUserTarget.bind(this)

        this.setOptions(this.options)

        this.realConsoleLog = console.log
        this.realConsoleInfo = console.info
        this.realConsoleWarn = console.warn
        this.realConsoleError = console.error

        this.ALIGN = Demo2.ALIGN
        this.ENVIRONMENT_TYPE = Demo2.ENVIRONMENT_TYPE
    }

    /**
     * Tell whether we are in a Node environment
     * @returns {boolean}
     */
    isNode()
    {
        return this.system === SYSTEM.NODE
    }

    /**
     * Tell whether the logger runs from a browser
     * @returns {boolean}
     */
    isBrowser()
    {
        return !this.isNode()
    }

    setOptions({
                   contextLenMax = 10,
                   idLenMax = 5,
                   lidLenMax = 5,
                   symbolLenMax = 2,
                   messageLenMax = 60,
                   hideLog = false,
                   hideError = false,
                   hideHookMessage = false,
                   silent = false
               } = {})
    {
        this.options.contextLenMax = contextLenMax
        this.options.idLenMax = idLenMax
        this.options.lidLenMax = lidLenMax
        this.options.messageLenMax = messageLenMax
        this.options.symbolLenMax = symbolLenMax
        this.options.hideLog = !!hideLog
        this.options.hideError = !!hideError
        this.options.hideHookMessage = !!hideHookMessage

        if (silent)
        {
            this.options.hideLog = true
            this.options.hideHookMessage = true
        }
    }

    truncateMessage(input = "", {fit = 0, align = Demo2.ALIGN.LEFT})
    {
        try
        {
            input = "" + input
            if (fit && input.length >= fit + 2)
            {
                input = input.substring(0, fit - 3) + "...";
            }

            input = align === Demo2.ALIGN.LEFT ? input.padEnd(fit + 1, " ") : input.padStart(fit + 1, " ")
            return input
        }
        catch (e)
        {
            console.error(`QuickLog:`, e)
        }
    }

    /**
     * Format inputs
     * @see Override {@link setLogFormat}
     * @param contextName
     * @param id
     * @param message
     * @param lid
     * @param symbol
     * @returns {string}
     */
    onBuildLog({contextName, id, message = "", lid = "", symbol = ""} = {})
    {
        // Time
        const date = new Date()
        let time = ('0' + date.getHours()).slice(-2) + ":" + ('0' + date.getMinutes()).slice(-2) + ":" + ('0' + date.getSeconds()).slice(-2);

        // Display content in columns
        time = this.truncateMessage(time, {fit: 7})
        contextName = this.truncateMessage(contextName, {fit: this.options.contextLenMax, align: Demo2.ALIGN.RIGHT})
        // id = this.truncateMessage(id, {fit: this.options.idLenMax})
        lid = this.truncateMessage(lid, {fit: this.options.lidLenMax})
        message = this.truncateMessage(message, {fit: this.options.messageLenMax})
        symbol = this.truncateMessage(symbol, {fit: this.options.symbolLenMax})

        return `[${time}] ${contextName}: (${lid}) ${symbol} ${message}`
    }

    onErrorForUserTarget(context, ...args)
    {
        this.errorUserTargetHandler(context, ...args)
    }

    onError(context, ...args)
    {
        if (context.target === this.targets.USER)
        {
            this.onErrorForUserTarget(context, ...args)
        }
    }

    /**
     * Forward input to real console log
     * @param args
     */
    onDisplayLog(...args)
    {
        this.log(...args);
    }

    /**
     * Forward input to real console log
     * @param args
     */
    onDisplayError(...args)
    {
        this.error(...args);
    }

    /**
     * Set log template
     * @param format
     */
    setLogFormat(format)
    {
        if (typeof format !== 'function')
        {
            console.error(`Invalid parameter for setFormat. It is expecting a function or method.`)
            return false
        }
        this.format = format.bind(this)
    }

    setErrorHandler(handler)
    {
        this.errorTargetHandler = handler.bind(this)
    }

    setErrorHandlerForUserTarget(handler)
    {
        this.errorUserTargetHandler = handler.bind(this)
    }

    // ------------------------------------------------
    // Color
    // ------------------------------------------------

    // ------------------------------------------------
    // Log Contexts
    // ------------------------------------------------
    isContext(context)
    {
        if (
            !(typeof context === 'object' &&
                !Array.isArray(context) &&
                context !== null)
        )
        {
            return false
        }

        return (context.hasOwnProperty("contextName") && context.hasOwnProperty("target"))

    }

    generateDefaultContext()
    {
        const defaultContext = {
            name       : "DEFAULT",
            contextName: "DEFAULT",
            target     : "DEV",
            symbol     : "⚡"
        }

        defaultContext.id = this.logIndex++;
        defaultContext.color = COLOR_TABLE[1]
        return defaultContext
    }

    generateNewContext()
    {
        const newContext = this.generateDefaultContext()
        newContext.color = COLOR_TABLE[(this.indexColor++) % (COLOR_TABLE.length - 3) + 2];
        newContext.symbol = ""
        return newContext
    }

    generateErrorContext()
    {
        const errorContext = this.generateDefaultContext()
        errorContext.color = COLOR_TABLE[0]
        errorContext.symbol = "v"
        errorContext.error = true
        return errorContext
    }

    allegeProperties(entry)
    {
        let converted = entry;

        const defaultContext = this.generateNewContext()

        if (!converted)
        {
            converted = {
                contextName: "DEFAULT",
            };
        }

        if (Array.isArray(converted))
        {
            throw new Error(`QuickLog: Cannot convert Array [${JSON.stringify(converted)}] to context`);
        }

        if (typeof converted === "string" || converted instanceof String)
        {
            converted = {
                contextName: converted
            };
        }

        if (
            typeof converted !== "object"
        )
        {
            throw new Error(`QuickLog: Cannot convert Unknown [${JSON.stringify(converted)}] to context`);
        }

        converted = Object.assign({}, defaultContext, converted);

        if (converted.color.toLowerCase().indexOf("rgb") > -1)
        {
            converted.color = "#" + rgbHex(converted.color)
        }

        return converted;
    }

    /**
     * Load the context names that should be available to the environment.
     * They are defined by the user.
     * @see Context definitions {@link ./example/cjs/contexts-def.cjs}
     * @param contextTable
     */
    setContexts(contextTable)
    {
        const arr = Object.keys(contextTable);
        contextTable["DEFAULT"] = this.contexts["DEFAULT"] = this.generateDefaultContext()
        contextTable["ERROR"] = this.contexts["ERROR"] = this.generateErrorContext()
        arr.forEach((key) =>
        {
            const contextPassed = contextTable[key] || {};
            contextPassed.contextName = key
            contextPassed.name = key
            this.contexts[key] = this.allegeProperties(contextPassed);
            contextTable[key] = this.contexts[key]
        });
    }

    setTargets(targetTable = {})
    {
        this.targets = Object.assign({}, targetTable, {ALL: "ALL", USER: "USER"})
    }

    enableContexts(contextNames)
    {
        this.contexts.forEach((context) =>
        {
        });
    }

    /**
     *
     * @returns {{}}
     */
    getActiveLogContexts()
    {
    }


    // ------------------------------------------------
    // Logging methods
    // ------------------------------------------------
    /**
     * Display log following template
     * @param context
     */
    processLog(context = {})
    {
        try
        {
            if (this.options.hideLog)
            {
                return
            }

            let args = Array.prototype.slice.call(arguments);
            args.shift();

            const message = args.join(" | ")

            const text = this.format({...context, message})
            if (this.isBrowser())
            {
                context.environnment = Demo2.ENVIRONMENT_TYPE.BROWSER
                this.realConsoleLog(`%c${text}`, `color: ${context.color}`)
            }
            else
            {
                context.environnment = Demo2.ENVIRONMENT_TYPE.NODE
                this.realConsoleLog(chalk.hex(context.color)(text));
            }

            this.errorTargetHandler(context, args)
        }
        catch (e)
        {
            console.error(`QuickLog:`, e.message)
        }
    }

    /**
     * Check that a parameter (should be the first) uses the expected format.
     * @param options
     * @returns {boolean}
     */
    isExtendedOptionsPassed(options)
    {
        if (typeof options !== "object")
        {
            return false;
        }

        return options.hasOwnProperty("context") || options.hasOwnProperty("target");
    }

    /**
     * console.log with options set on the first parameter to dictate console log behaviours
     * @param options
     * @param args
     */
    log(options, ...args)
    {
        if (!this.isExtendedOptionsPassed(options))
        {
            const defaultContext = this.generateDefaultContext()
            this.processLog.apply(this, [defaultContext, options, ...args]);
            return;
        }

        let context = options
        if (typeof options.context === "object")
        {
            const moreOptions = Object.assign({}, options)
            delete moreOptions.context
            context = Object.assign({}, options.context, moreOptions)
        }

        if (context.hasOwnProperty("context"))
        {
            context = Object.assign({}, this.generateDefaultContext(), context)
            delete context.context
        }

        // let args0 = Array.prototype.slice.call(arguments);
        // args0.unshift(options)
        this.processLog.apply(this, [context, ...args]);
    }

    error(options, ...args)
    {
        if (this.options.hideError)
        {
            return
        }

        const errorContext = this.generateErrorContext()

        if (this.isExtendedOptionsPassed(options))
        {
            options = Object.assign({}, errorContext, options)
            return this.log(options, ...args)
        }

        let args0 = Array.prototype.slice.call(arguments);
        this.log(errorContext, ...args0)
    }

    overrideError()
    {
        if (!this.options.hideHookMessage)
        {
            this.realConsoleLog(`QuickLog: Hook placed on console.error`)
        }
        console.error = this.onDisplayError.bind(this);
    }

    overrideConsole({log = true, info = true, warn = true, error = false} = {})
    {
        if (!this.options.hideHookMessage)
        {
            this.realConsoleLog(`QuickLog: Hook placed on console.log`)
        }

        if (log)
        {
            console.log = this.onDisplayLog.bind(this);
        }

        if (info)
        {
            console.info = this.onDisplayLog.bind(this);
        }

        if (warn)
        {
            console.warn = this.onDisplayLog.bind(this);
        }

        if (error)
        {
            this.overrideError()
        }
    }

    info(...args)
    {
        return this.log(...args)
    }

    warn(...args)
    {
        return this.log(...args)
    }

    alert(...args)
    {
        if (this.isNode())
        {
            return this.log(...args)
        }

        const message = args.join(" | ");
        alert(message)
    }

    assert()
    {

    }

}

module.exports.anaLogger = new Demo2()
