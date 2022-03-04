/** to-esm-browser: remove **/
const path = require("path");
const fs = require("fs");
const os = require("os");
/** to-esm-browser: end-remove **/

const toAnsi = require("to-ansi");
const rgbHex = require("rgb-hex-cjs");
const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

const EOL =`
`;

class AnaLogger
{
    system = "";

    logIndex = 0;
    logCounter = 0;
    contexts = [];
    targets = {};

    activeTarget = null;

    indexColor = 0;

    format = "";

    keepLog = false;
    logHistory = [];

    $containers = null;

    options = {
        hideHookMessage: false
    };

    static ALIGN = {
        LEFT : "LEFT",
        RIGHT: "RIGHT"
    };

    static ENVIRONMENT_TYPE = {
        BROWSER: "BROWSER",
        NODE   : "NODE",
        OTHER  : "OTHER"
    };
    originalFormatFunction;

    constructor()
    {
        if (AnaLogger.Instance)
        {
            return AnaLogger.Instance;
        }

        AnaLogger.Instance = this;

        this.system = (typeof process === "object") ? SYSTEM.NODE : SYSTEM.BROWSER;
        this.format = this.onBuildLog.bind(this);
        this.originalFormatFunction = this.format;

        this.errorTargetHandler = this.onError.bind(this);
        this.errorUserTargetHandler = this.onErrorForUserTarget.bind(this);

        this.setOptions(this.options);

        this.realConsoleLog = console.log;
        this.realConsoleInfo = console.info;
        this.realConsoleWarn = console.warn;
        this.realConsoleError = console.error;

        this.ALIGN = AnaLogger.ALIGN;
        this.ENVIRONMENT_TYPE = AnaLogger.ENVIRONMENT_TYPE;
    }

    keepLogHistory()
    {
        this.keepLog = true;
    }

    releaseLogHistory()
    {
        this.keepLog = false;
    }

    resetLogHistory()
    {
        this.logHistory = [];
    }

    getLogHistory(join = true, symbol = EOL)
    {
        const history = JSON.parse(JSON.stringify(this.logHistory.slice(0)));
        if (!join)
        {
            return history;
        }
        return history.join(symbol);
    }

    /**
     * Tell whether we are in a Node environment
     * @returns {boolean}
     */
    isNode()
    {
        return this.system === SYSTEM.NODE;
    }

    /**
     * Tell whether the logger runs from a browser
     * @returns {boolean}
     */
    isBrowser()
    {
        return !this.isNode();
    }

    resetLogger()
    {
        this.options = {
            contextLenMax       : 10,
            idLenMax            : 5,
            lidLenMax           : 5,
            symbolLenMax        : 2,
            messageLenMax       : undefined,
            hideLog             : undefined,
            hideError           : undefined,
            hideHookMessage     : undefined,
            hidePassingTests    : undefined,
            logToDom            : undefined,
            logToFile           : undefined,
            oneConsolePerContext: undefined,
            silent              : undefined
        };
    }

    resetOptions()
    {
        this.options.contextLenMax = 10;
        this.options.idLenMax = 5;
        this.options.lidLenMax = 5;
        this.options.messageLenMax = undefined;
        this.options.symbolLenMax = 60;
        this.options.hideHookMessage = false;
        this.options.hidePassingTests = false;
        this.options.hideLog = false;
        this.options.hideError = false;
        this.options.oneConsolePerContext = true;
        this.options.logToDom = undefined;
        this.options.logToDomlogToFile = undefined;
        this.options.silent = false;
    }

    setOptions({
                   contextLenMax = 10,
                   idLenMax = 5,
                   lidLenMax = 5,
                   symbolLenMax = 2,
                   messageLenMax = undefined,
                   hideLog = undefined,
                   hideError = undefined,
                   hideHookMessage = undefined,
                   hidePassingTests = undefined,
                   logToDom = undefined,
                   logToFile = undefined,
                   oneConsolePerContext = undefined,
                   silent = undefined
               } = null)
    {
        this.options.contextLenMax = contextLenMax;
        this.options.idLenMax = idLenMax;
        this.options.lidLenMax = lidLenMax;
        this.options.messageLenMax = messageLenMax;
        this.options.symbolLenMax = symbolLenMax;

        if (hidePassingTests !== undefined)
        {
            this.options.hidePassingTests = !!hidePassingTests;
        }

        if (hideHookMessage !== undefined)
        {
            this.options.hideHookMessage = !!hideHookMessage;
        }

        if (hideLog !== undefined)
        {
            this.options.hideLog = !!hideLog;
        }

        if (hideError !== undefined)
        {
            this.options.hideError = !!hideError;
        }

        if (oneConsolePerContext !== undefined)
        {
            this.options.oneConsolePerContext = !!oneConsolePerContext;
        }

        if (logToDom !== undefined)
        {
            this.options.logToDom = logToDom || "#analogger";
        }

        if (logToFile !== undefined)
        {
            if (!this.isBrowser())
            {
                this.options.logToFile = logToFile || "./analogger.log";

                /** to-esm-browser: remove **/
                // these require won't get compiled by to-esm
                this.options.logToFilePath = path.resolve(this.options.logToFile);
                this.logFile = fs.createWriteStream(this.options.logToFilePath, {flags : "a"});
                this.EOL = os.EOL;
                /** to-esm-browser: end-remove **/
            }

            /** to-esm-browser: add
             this.realConsoleLog("LogToFile is not supported in this environment. ")
             * **/

        }

        if (silent !== undefined)
        {
            this.options.silent = !!silent;
            this.options.hideLog = this.options.silent;
        }

    }

    getOptions()
    {
        return this.options;
    }

    truncateMessage(input = "", {fit = 0, align = AnaLogger.ALIGN.LEFT} = {})
    {
        input = "" + input;
        if (fit && input.length >= fit + 2)
        {
            input = input.substring(0, fit - 3) + "...";
        }

        input = align === AnaLogger.ALIGN.LEFT ? input.padEnd(fit, " ") : input.padStart(fit, " ");
        return input;
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
    onBuildLog({contextName, message = "", lid = "", symbol = ""} = {})
    {
        // Time
        const date = new Date();
        let time = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);

        // Display content in columns
        time = this.truncateMessage(time, {fit: 7});
        contextName = this.truncateMessage(contextName, {fit: this.options.contextLenMax, align: AnaLogger.ALIGN.RIGHT});
        // id = this.truncateMessage(id, {fit: this.options.idLenMax})
        lid = this.truncateMessage(lid, {fit: this.options.lidLenMax});

        if (this.options.messageLenMax !== undefined)
        {
            message = this.truncateMessage(message, {fit: this.options.messageLenMax});
        }

        symbol = this.truncateMessage(symbol, {fit: this.options.symbolLenMax});

        return `[${time}] ${contextName}: (${lid}) ${symbol} ${message}`;
    }

    onErrorForUserTarget(context, ...args)
    {
        this.errorUserTargetHandler(context, ...args);
    }

    onError(context, ...args)
    {
        if (context.target === this.targets.USER)
        {
            this.onErrorForUserTarget(context, ...args);
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
        if (typeof format !== "function")
        {
            console.error("Invalid parameter for setFormat. It is expecting a function or method.");
            return false;
        }
        this.format = format.bind(this);
    }

    resetLogFormatter()
    {
        this.format = this.originalFormatFunction;
    }

    setErrorHandler(handler)
    {
        this.errorTargetHandler = handler.bind(this);
    }

    setErrorHandlerForUserTarget(handler)
    {
        this.errorUserTargetHandler = handler.bind(this);
    }

    // ------------------------------------------------
    // Color
    // ------------------------------------------------

    // ------------------------------------------------
    // Log Contexts
    // ------------------------------------------------
    isContextValid(context)
    {
        if (
            !(typeof context === "object" &&
                !Array.isArray(context) &&
                context !== null)
        )
        {
            return false;
        }
        return (context.hasOwnProperty("contextName") && context.hasOwnProperty("target"));
    }

    generateDefaultContext()
    {
        const defaultContext = {
            name       : "DEFAULT",
            contextName: "DEFAULT",
            target     : "ALL",
            symbol     : "⚡"
        };

        defaultContext.id = this.logIndex++;
        defaultContext.color = COLOR_TABLE[1];
        return defaultContext;
    }

    generateNewContext()
    {
        const newContext = this.generateDefaultContext();
        newContext.color = COLOR_TABLE[(this.indexColor++) % (COLOR_TABLE.length - 3) + 2];
        newContext.symbol = "";
        return newContext;
    }

    generateErrorContext()
    {
        const errorContext = this.generateDefaultContext();
        errorContext.color = COLOR_TABLE[0];
        errorContext.symbol = "v";
        errorContext.error = true;
        return errorContext;
    }

    #allegeProperties(entry)
    {
        let converted = entry;

        const defaultContext = this.generateNewContext();

        converted = Object.assign({}, defaultContext, converted);

        if (converted.color.toLowerCase().indexOf("rgb") > -1)
        {
            converted.color = "#" + rgbHex(converted.color);
        }
        else if (converted.color.indexOf("#") === -1)
        {
            const colorConvert = require("color-convert-cjs");
            if (colorConvert)
            {
                converted.color = "#" + colorConvert.keyword.hex(converted.color);
            }
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
        contextTable["DEFAULT"] = this.contexts["DEFAULT"] = this.generateDefaultContext();
        contextTable["ERROR"] = this.contexts["ERROR"] = this.generateErrorContext();
        arr.forEach((key) =>
        {
            const contextPassed = contextTable[key] || {};
            contextPassed.contextName = key;
            contextPassed.name = key;
            this.contexts[key] = this.#allegeProperties(contextPassed);
            contextTable[key] = this.contexts[key];
        });
    }

    setTargets(targetTable = {})
    {
        this.targets = Object.assign({}, targetTable, {ALL: "ALL", USER: "USER"});
    }

    setActiveTarget(target)
    {
        this.activeTarget = target;
    }

    isTargetAllowed(target)
    {
        if (!target || !this.activeTarget)
        {
            return true;
        }

        if (target === this.targets.ALL)
        {
            return true;
        }

        return this.activeTarget === target;
    }


    // ------------------------------------------------
    // Logging methods
    // ------------------------------------------------
    setColumns($line, context, text)
    {
        let index = 0;
        for (let columnName in context)
        {
            if ("name" === columnName)
            {
                continue;
            }

            const colContent = context[columnName];
            const $col = document.createElement("span");
            $col.classList.add("analogger-col", `analogger-col-${columnName}`, `analogger-col-${index}`);
            ++index;
            $col.textContent = colContent;
            $line.append($col);
        }

        const $col = document.createElement("span");
        $col.classList.add("analogger-col", "analogger-col-text", `analogger-col-${index}`);
        $col.textContent = text;
        $line.append($col);
    }

    writeLogToDom(context, text)
    {
        this.$containers = this.$containers || document.querySelectorAll(this.options.logToDom);

        for (let i = 0; i < this.$containers.length; ++i)
        {
            const $container = this.$containers[i];

            let $view = $container.querySelector(".analogger-view");
            if (!$view)
            {
                $view = document.createElement("div");
                $view.classList.add("analogger-view");
                $container.append($view);
            }

            const $line = document.createElement("div");
            $line.classList.add("to-esm-line");
            $line.style.color = context.color;
            $line.setAttribute("data-log-counter", this.logCounter);
            $line.setAttribute("data-log-index", this.logIndex);

            this.setColumns($line ,context, text);

            $view.append($line);
        }
    }

    writeLogToFile(text)
    {
        this.logFile.write(text + this.EOL);
    }

    /**
     * Display log following template
     * @param context
     */
    processOutput(context = {})
    {
        try
        {
            if (!this.isTargetAllowed(context.target))
            {
                return;
            }

            let args = Array.prototype.slice.call(arguments);
            args.shift();

            const message = args.join(" | ");

            let output = "";
            const text = this.format({...context, message});

            ++this.logCounter;

            if (this.isBrowser())
            {
                context.environnment = AnaLogger.ENVIRONMENT_TYPE.BROWSER;
                if (this.options.logToDom)
                {
                    this.writeLogToDom(context, text);
                }
                output = `%c${text}`;
            }
            else
            {
                context.environnment = AnaLogger.ENVIRONMENT_TYPE.NODE;
                output = toAnsi.getTextFromHex(text, {fg: context.color});

                if (this.options.logToFile)
                {
                    this.writeLogToFile(text);
                }
            }

            if (this.keepLog)
            {
                this.logHistory.push(output);
            }

            if (this.options.hideLog)
            {
                return;
            }

            if (this.isBrowser())
            {
                this.realConsoleLog(output, `color: ${context.color}`);
            }
            else
            {
                this.realConsoleLog(output);
            }

            this.errorTargetHandler(context, args);
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error("AnaLogger:", e.message);
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

        return options.hasOwnProperty("context") ||
            options.hasOwnProperty("target") ||
            options.hasOwnProperty("color") ||
            options.hasOwnProperty("lid");
    }

    convertToContext(options, defaultContext)
    {
        defaultContext = defaultContext || this.generateDefaultContext();
        options  = options || defaultContext;
        let context = options;
        if (options.context && typeof options.context === "object")
        {
            const moreOptions = Object.assign({}, options);
            delete moreOptions.context;
            context = Object.assign({}, options.context, moreOptions);
        }

        context = Object.assign({}, defaultContext, context);
        delete context.context;

        return context;
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
            const defaultContext = this.generateDefaultContext();
            this.processOutput.apply(this, [defaultContext, options, ...args]);
            return;
        }

        let context = this.convertToContext(options);

        this.processOutput.apply(this, [context, ...args]);
    }

    error(options, ...args)
    {
        if (this.options.hideError)
        {
            return;
        }

        if (!this.isExtendedOptionsPassed(options))
        {
            const defaultContext = this.generateErrorContext();
            this.processOutput.apply(this, [defaultContext, options, ...args]);
            return;
        }

        const errorContext = this.generateErrorContext();
        let context = this.convertToContext(options, errorContext);

        let args0 = Array.prototype.slice.call(arguments, 1);
        this.log(context, ...args0);
    }

    overrideError()
    {
        if (!this.options.hideHookMessage)
        {
            this.realConsoleLog("AnaLogger: Hook placed on console.error");
        }
        console.error = this.onDisplayError.bind(this);
    }

    overrideConsole({log = true, info = true, warn = true, error = false} = {})
    {
        if (!this.options.hideHookMessage)
        {
            this.realConsoleLog("AnaLogger: Hook placed on console.log");
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
            this.overrideError();
        }
    }

    removeOverrideError()
    {
        console.warn = this.realConsoleError;
    }

    removeOverride({log = true, info = true, warn = true, error = false} = {})
    {
        if (log)
        {
            console.log = this.realConsoleLog;
        }

        if (info)
        {
            console.info = this.realConsoleInfo;
        }

        if (warn)
        {
            console.warn = this.realConsoleWarn;
        }

        if (error)
        {
            this.removeOverrideError();
        }

    }

    info(...args)
    {
        return this.log(...args);
    }

    warn(...args)
    {
        return this.log(...args);
    }

    alert(...args)
    {
        if (this.isNode())
        {
            return this.log(...args);
        }

        const message = args.join(" | ");

        alert(message);
    }

    assert(condition, expected = true, ...args)
    {
        let result;

        try
        {
            if (typeof condition === "function")
            {
                result = condition(...args);
                if (result !== expected)
                {
                    this.error("Asset failed");
                    return false;
                }

                if (!this.options.hidePassingTests)
                {
                    this.log("SUCCESS: Assert passed");
                }
                return true;
            }

            if (condition !== expected)
            {
                this.error("Assert failed");
                return false;
            }

            if (!this.options.hidePassingTests)
            {
                this.log("SUCCESS: Assert passed");
            }
            return true;
        }
        catch (e)
        {
            this.error("Unexpected error in assert");
        }

        return false;
    }

}

module.exports = new AnaLogger();
module.exports.anaLogger = new AnaLogger();
