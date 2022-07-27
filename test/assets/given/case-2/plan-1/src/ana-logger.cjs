let _terminalSize = {};

/** to-esm-browser: remove **/
const path = require("path");
const fs = require("fs");
const os = require("os");
let terminalSize = require("window-size");
_terminalSize = terminalSize;
/** to-esm-browser: end-remove **/

/** to-esm-browser: add
 _terminalSize = {}
 **/

const toAnsi = require("to-ansi");

const {COLOR_TABLE, SYSTEM, MAX_CHILDREN_DOM_ANALOGGER, CLASS_REMOVED_NOTIF, ADD_TYPE, CONSOLE_AREA_CLASSNAME,
    PREDEFINED_FORMATS, ANALOGGER_NAME, LINE_CLASSNAME
} = require("./constants.cjs");
const PREDEFINED_CONTEXT_NAMES = {
    "DEFAULT": "DEFAULT",
    // "LOG"      : "LOG",
    // "INFO"     : "INFO",
    // "WARN"     : "WARN",
    // "ATTENTION": "ATTENTION",
    "ERROR": "ERROR"
};


const {stringify} = require("flatted");

const EOL = `
`;

const symbolNames = {
    airplane                  : "✈",
    anchor                    : "⚓",
    arrow_backward            : "◀",
    arrow_double_up           : "⏫",
    arrow_double_down         : "⏬",
    arrow_forward             : "▶",
    arrow_lower_right         : "↘",
    arrow_lower_left          : "↙",
    arrow_right_hook          : "↪",
    arrow_up_down             : "↕",
    arrow_upper_left          : "↖",
    arrow_upper_right         : "↗",
    ballot_box_with_check     : "☑",
    biohazard                 : "☣",
    black_circle              : "⏺",
    black_medium_small_square : "◾",
    black_medium_square       : "◼",
    black_nib                 : "✒",
    black_small_square        : "▪",
    black_square              : "⏹",
    chains                    : "⛓",
    check                     : "✔",
    chess_pawn                : "♟",
    cloud_and_rain            : "⛈",
    clubs                     : "♣",
    coffee                    : "☕",
    copyright                 : "©",
    cross                     : "❌",
    diamonds                  : "♦",
    divisions_ign             : "➗",
    double_triangle_right     : "⏭",
    double_triangle_left      : "⏮",
    email                     : "✉",
    eject                     : "⏏",
    exclamation_mark          : "❗",
    fast_forward              : "⏩",
    female_sign               : "♀",
    fist                      : "✊",
    fuel_pump                 : "⛽",
    gear                      : "⚙",
    hammer_and_pick           : "⚒",
    hand                      : "✋",
    hearts                    : "♥",
    infinity                  : "♾",
    information               : "ℹ",
    left_right_arrow          : "↔",
    leftwards_arrow_with_hook : "↩",
    male_sign                 : "♂",
    minus_sign                : "➖",
    no_entry                  : "⛔",
    partly_sunny              : "⛅",
    pencil                    : "✏",
    phone                     : "☎",
    plus_sign                 : "➕",
    question                  : "❔",
    radioactive               : "☢",
    raised_hand               : "✋",
    recycle                   : "♻",
    registered                : "®",
    relaxed                   : "☺",
    rewind                    : "⏪",
    scissors                  : "✂",
    snowman                   : "☃",
    spades                    : "♠",
    sparkles                  : "✨",
    star                      : "⭐",
    sunny                     : "☀",
    tent                      : "⛺",
    trademark                 : "™",
    triangle_with_vertical_bar: "⏯",
    umbrella                  : "☔",
    vertical_bars             : "⏸",
    watch                     : "⌚",
    white_frowning_face       : "☹",
    white_medium_square       : "◻",
    white_medium_small_square : "◽",
    white_small_square        : "▫",
    wheelchair                : "♿",
    white_circle              : "⚪",
    writing_hand              : "✍",
};

class ____AnaLogger
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

    #realConsoleLog = console.log;
    #realConsoleInfo = console.info;
    #realConsoleWarn = console.warn;
    #realConsoleError = console.error;

    isBrowser0 = null;

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
        this.system = (typeof process === "object") ? SYSTEM.NODE : SYSTEM.BROWSER;
        this.format = this.onBuildLog.bind(this);
        this.originalFormatFunction = this.format;

        this.errorTargetHandler = this.onError.bind(this);
        this.errorUserTargetHandler = this.onErrorForUserTarget.bind(this);

        this.setOptions(this.options);

        this.rawLog = this.#realConsoleLog;
        this.rawInfo = this.#realConsoleInfo;
        this.rawWarn = this.#realConsoleWarn;
        this.rawError = this.#realConsoleError;

        console.rawLog = this.#realConsoleLog;
        console.rawInfo = this.#realConsoleInfo;
        console.rawWarn = this.#realConsoleWarn;
        console.rawError = this.#realConsoleError;

        console.table = this.table;
        console.buildTable = this.buildTable;
        console.isNode = this.isNode;
        console.isBrowser = this.isBrowser;
        console.truncateMessage = this.truncateMessage;
        console.rawLog = this.rawLog;
        console.rawInfo = this.rawInfo;
        console.rawWarn = this.rawWarn;
        console.rawError = this.rawError;
        console.isBrowser0 = this.system === SYSTEM.BROWSER;

        this.ALIGN = ____AnaLogger.ALIGN;
        this.ENVIRONMENT_TYPE = ____AnaLogger.ENVIRONMENT_TYPE;
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
        this.options = {};
        this.options.timeLenMax = 10;
        this.options.contextLenMax = 10;
        this.options.idLenMax = 5;
        this.options.lidLenMax = 6;
        this.options.messageLenMax = undefined;
        this.options.symbolLenMax = 60;
        this.options.hideHookMessage = undefined;
        this.options.hidePassingTests = undefined;
        this.options.hideLog = undefined;
        this.options.hideError = undefined;
        this.options.oneConsolePerContext = true;
        this.options.logToDom = undefined;
        this.options.logToFile = undefined;
        this.options.logToDomlogToFile = undefined;
        this.options.silent = false;

    }

    resetOptions()
    {
        this.resetLogger();
    }

    setOptions({
                   contextLenMax = 10,
                   idLenMax = 5,
                   lidLenMax = 6,
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

        if (logToFile === false)
        {
            this.options.logToFile = false;
        }
        else if (logToFile !== undefined)
        {
            if (!this.isBrowser())
            {
                this.options.logToFile = logToFile || "./analogger.log";

                /** to-esm-browser: remove **/
                // these require won't get compiled by to-esm
                this.options.logToFilePath = path.resolve(this.options.logToFile);
                this.EOL = os.EOL;
                /** to-esm-browser: end-remove **/
            }

            /** to-esm-browser: add
             this.#realConsoleLog("LogToFile is not supported in this environment. ")
             **/
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

    truncateMessage(input = "", {fit = 0, align = ____AnaLogger.ALIGN.LEFT, ellipsis = "..."} = {})
    {
        input = "" + input;
        if (fit && input.length > fit)
        {
            input = input.substring(0, fit - ellipsis.length) + ellipsis;
        }

        input = align === ____AnaLogger.ALIGN.LEFT ? input.padEnd(fit, " ") : input.padStart(fit, " ");
        return input;
    }

    /**
     * Display data
     * @param {any[]} table
     * @param objList
     * @param ellipsis
     * @param ColumnMinChars
     * @param columnMaxChars
     * @param verticalSeparator
     * @param horizontalSeparator
     * @param availableLength
     * @param onCompleteHeaders
     * @param onCompleteSeparators
     * @param onCompleteLines
     */
    buildTable(objList, {
        ellipsis = "...",
        ColumnMinChars = 6,
        columnMaxChars = 0,
        verticalSeparator = " │ ",
        horizontalSeparator = "─",
        availableLength = 0,
        onCompleteHeaders = null,
        onCompleteSeparators = null,
        onCompleteLines = null
    } = {})
    {
        let text = "";

        const isArray = Array.isArray(objList);
        if (!isArray)
        {
            objList = Object.values(Object.values(objList));
        }

        if (!objList || !objList.length)
        {
            return "";
        }

        let table = objList.map(a => Object.assign({}, a));

        const firstLine = table[0];
        const titles = Object.keys(firstLine);
        table.unshift(titles);

        horizontalSeparator = horizontalSeparator.repeat(100);

        const fits = {};
        for (let i = 1; i < table.length; ++i)
        {
            const line = table[i];
            for (let ii = 0; ii < titles.length; ++ii)
            {
                const colName = titles[ii];
                const colContent = line[colName];

                fits[colName] = fits[colName] || 0;
                let colLength;
                try
                {
                    colLength = JSON.stringify(colContent).length;
                }
                catch (e)
                {
                }

                colLength = colLength || ColumnMinChars;
                fits[colName] = Math.max(fits[colName], colLength, colName.length);
            }
        }

        if (!this.isBrowser0)
        {
            _terminalSize = _terminalSize || {};

            if (!availableLength)
            {
                availableLength = _terminalSize.width || process.stdout.columns || 120 - verticalSeparator.length - 1 - 5;
            }
        }

        availableLength = availableLength - 4;

        let totalLength = Object.values(fits).reduce((a, b) => a + b, 0);

        /* istanbul ignore next */
        if (availableLength < totalLength)
        {
            const ratio = (availableLength) / totalLength;
            for (let key in fits)
            {
                fits[key] = Math.floor(fits[key] * ratio) - 1;
                if (ColumnMinChars && fits[key] < ColumnMinChars)
                {
                    fits[key] = ColumnMinChars;
                }

                if (columnMaxChars && fits[key] > columnMaxChars)
                {
                    fits[key] = columnMaxChars;
                }

                fits[key] = fits[key];
            }

        }

        let strLine;

        // Headers
        strLine = "";
        for (let i = 0; i < titles.length; ++i)
        {
            const colName = titles[i];
            const fit = fits[colName];
            strLine += this.truncateMessage(colName, {fit, ellipsis});
            strLine += verticalSeparator;
        }

        if (onCompleteHeaders)
        {
            strLine = onCompleteHeaders(strLine, titles);
        }
        text += this.truncateMessage(strLine, {fit: availableLength});
        text += EOL;


        // Separators
        strLine = "";
        const colContent = horizontalSeparator;
        for (let i = 0; i < titles.length; ++i)
        {
            const colName = titles[i];
            const fit = fits[colName];
            strLine += this.truncateMessage(colContent, {fit, ellipsis: ""});
            strLine += verticalSeparator;
        }

        if (onCompleteSeparators)
        {
            strLine = onCompleteSeparators(strLine, titles);
        }

        text += this.truncateMessage(strLine, {fit: availableLength});
        text += EOL;

        // Content
        for (let i = 1; i < table.length; ++i)
        {
            strLine = "";
            const line = table[i];
            for (let ii = 0; ii < titles.length; ++ii)
            {
                const colName = titles[ii];
                const colContent = line[colName];
                const fit = fits[colName];

                strLine += this.truncateMessage(colContent, {fit, ellipsis});
                strLine += verticalSeparator;
            }

            if (onCompleteLines)
            {
                strLine = onCompleteLines(strLine, line);
            }

            text += this.truncateMessage(strLine, {fit: availableLength});
            text += EOL;
        }

        this.rawLog(text);

        return text;
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
        time = this.truncateMessage(time, {fit: this.options.timeLenMax});
        contextName = this.truncateMessage(contextName, {
            fit  : this.options.contextLenMax,
            align: ____AnaLogger.ALIGN.RIGHT
        });
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

    setContext(contextName, context)
    {
        this.contexts[contextName] = context;
    }

    setDefaultContext(context)
    {
        this.setContext(PREDEFINED_CONTEXT_NAMES.DEFAULT, context);
    }

    generateDefaultContext()
    {
        let defaultContext = this.contexts[PREDEFINED_CONTEXT_NAMES.DEFAULT] || {};
        defaultContext = Object.assign({},
            {
                name       : PREDEFINED_CONTEXT_NAMES.DEFAULT,
                contextName: PREDEFINED_CONTEXT_NAMES.DEFAULT,
                target     : "ALL",
                symbol     : "⚡",
                color      : COLOR_TABLE[1]
            }, defaultContext);

        defaultContext.id = this.logIndex++;
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
        errorContext.name = PREDEFINED_CONTEXT_NAMES.ERROR;
        errorContext.contextName = PREDEFINED_CONTEXT_NAMES.ERROR;
        errorContext.color = COLOR_TABLE[0];
        errorContext.symbol = "❌";
        errorContext.error = true;
        return errorContext;
    }

    // TODO: Need testing before activating
    // generateCustomContext(contextName, {symbol = "", error = false, color = "gray"} = {})
    // {
    //     const customContext = this.generateDefaultContext();
    //     customContext.name = contextName;
    //     customContext.contextName = contextName;
    //     customContext.color = color;
    //     customContext.symbol = symbol;
    //     customContext.error = error;
    //     return customContext;
    // }

    #allegeProperties(entry)
    {
        let converted = entry;

        const defaultContext = this.generateNewContext();

        converted = Object.assign({}, defaultContext, converted);

        if (converted.color.toLowerCase().indexOf("rgb") > -1)
        {
            converted.color = toAnsi.rgbStringToHex(converted.color);
        }
        else if (converted.color.indexOf("#") === -1)
        {
            converted.color = toAnsi.colorNameToHex(converted.color);
        }

        return converted;
    }

    /**
     * Load the context names that should be available to the environment.
     * They are defined by the user.
     * @see Context definitions {@link ./example/more/contexts-def.cjs}
     * @param contextTable
     */
    setContexts(contextTable)
    {
        const arr = Object.keys(contextTable);
        contextTable[PREDEFINED_CONTEXT_NAMES.DEFAULT] = this.contexts[PREDEFINED_CONTEXT_NAMES.DEFAULT] = this.generateDefaultContext();
        contextTable[PREDEFINED_CONTEXT_NAMES.ERROR] = this.contexts[PREDEFINED_CONTEXT_NAMES.ERROR] = this.generateErrorContext();
        // contextTable[PREDEFINED_CONTEXT_NAMES.LOG] = this.contexts[PREDEFINED_CONTEXT_NAMES.LOG] =
        // this.generateCustomContext("LOG", {}); contextTable[PREDEFINED_CONTEXT_NAMES.INFO] =
        // this.contexts[PREDEFINED_CONTEXT_NAMES.INFO] = this.generateCustomContext("INFO", { symbol:
        // symbolNames.information, color : "orange" }); contextTable[PREDEFINED_CONTEXT_NAMES.WARN] =
        // this.contexts[PREDEFINED_CONTEXT_NAMES.WARN] = this.generateCustomContext("WARN", { symbol:
        // symbolNames.hand, color : "orange" });
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
            if (!["contextName", "symbol", "lid", "text"].includes(columnName))
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

    /**
     * Check that the div has not too many entries
     * @param $view
     */
    removeDomOldEntries = ($view) =>
    {
        const nbChildren = $view.childElementCount;
        if (nbChildren > MAX_CHILDREN_DOM_ANALOGGER)
        {
            const n = Math.ceil(MAX_CHILDREN_DOM_ANALOGGER / 10);
            for (let i = 0; i < n; ++i)
            {
                $view.removeChild($view.firstChild);
            }
            return n;
        }

        return 0;
    };

    /**
     * Scroll to bottom if div is already at the bottom
     * @param $view
     */
    scrollDivToBottom = ($view) =>
    {
        const scrollBottom =  $view.scrollHeight - ($view.clientHeight + $view.scrollTop);
        const divHeight = $view.clientHeight || $view.offsetHeight;
        if (scrollBottom > divHeight / 2)
        {
            /* istanbul ignore next */
            return;
        }

        $view.scrollTop = $view.scrollHeight;
    };

    /**
     * Add a line to the Analogger div.
     * Remove older lines if exceeding limit.
     * @param $view
     * @param $line
     * @param context
     * @param addType
     */
    addLineToDom($view, $line, {context, addType})
    {
        if (addType === ADD_TYPE.BOTTOM)
        {
            $view.append($line);
        }
        else
        {
            $view.insertBefore($line, $view.firstChild);
        }

        let nbRemoved = this.removeDomOldEntries($view);
        if (nbRemoved)
        {
            if ($view.getElementsByClassName(CLASS_REMOVED_NOTIF).length)
            {
                return;
            }

            context.contextName = ANALOGGER_NAME;
            context.symbol = "🗑";
            context.color = "orange";
            context.className = CLASS_REMOVED_NOTIF;

            clearTimeout(this.timerAddLineToDomID);
            this.timerAddLineToDomID = setTimeout(()=>
            {
                this.timerAddLineToDomID = null;
                /* istanbul ignore next */
                this.writeLogToDom(context, "", {addType: ADD_TYPE.TOP, message: `Oldest entries removed`});
            }, 500);
            return;
        }

        this.scrollDivToBottom($view);

    }

    writeLogToDom(context, fullText, {addType = ADD_TYPE.BOTTOM, message = ""} = {})
    {
        this.$containers = this.$containers || document.querySelectorAll(this.options.logToDom);
        fullText = message || fullText;

        for (let i = 0; i < this.$containers.length; ++i)
        {
            const $container = this.$containers[i];

            let $view = $container.querySelector("." + CONSOLE_AREA_CLASSNAME);
            if (!$view)
            {
                $view = document.createElement("div");
                $view.classList.add(CONSOLE_AREA_CLASSNAME);
                $container.append($view);
            }

            const $line = document.createElement("div");
            $line.classList.add(LINE_CLASSNAME);
            if (context.className)
            {
                $line.classList.add(context.className);
            }
            $line.style.color = context.color;

            this.setColumns($line, context, fullText);

            // Prevent the application to be stuck when many logs are entered at once
            /* istanbul ignore next */
            setTimeout(/* istanbul ignore next */function($view, $line, {addType, context})
            {
                /* istanbul ignore next */
                this.addLineToDom($view, $line, {addType, context});
            }.bind(this, $view, $line, {addType, context}), 0);

        }
    }

    writeLogToFile(text)
    {
        try
        {
            fs.appendFileSync(this.options.logToFilePath, text + this.EOL);
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.rawError("LOG_TO_FILE_FAILURE: ", e.message);
        }
    }

    convertArgumentsToText(args)
    {
        const strs = [];
        let text;
        const n = args.length;
        for (let i = 0; i < n; ++i)
        {
            let str;
            let arg = args[i];

            try
            {
                str = JSON.stringify(arg);
            }
            catch (e)
            {

            }

            if (!str)
            {
                try
                {
                    str = stringify(arg);
                }
                catch (e)
                {

                }
            }

            strs.push(str);
        }

        text = strs.join("•");
        return text;
    }

    /**
     * Display log following template
     * @param context
     */
    processOutput(context = {})
    {
        try
        {
            let message = "";

            if (!this.isTargetAllowed(context.target))
            {
                return;
            }

            let args = Array.prototype.slice.call(arguments);
            args.shift();

            message = this.convertArgumentsToText(args);

            let output = "";
            let text = "";
            text = this.format({...context, message});

            ++this.logCounter;

            /* istanbul ignore next */
            if (this.isBrowser())
            {
                context.environnment = ____AnaLogger.ENVIRONMENT_TYPE.BROWSER;
                /* istanbul ignore next */
                if (this.options.logToDom)
                {
                    /* istanbul ignore next */
                    this.writeLogToDom(context, text, {message});
                }

                output = `%c${text}`;
            }
            else
            {
                context.environnment = ____AnaLogger.ENVIRONMENT_TYPE.NODE;
                output = toAnsi.getTextFromColor(text, {
                    fg         : context.color,
                    bg         : context.bgColor,
                    isBold     : context.bold,
                    isUnderline: context.underline,
                    isReversed : context.reversed
                });

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
                this.#realConsoleLog(output, `color: ${context.color}`);
            }
            else
            {
                this.#realConsoleLog(output);
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
            options.hasOwnProperty("contextName") ||
            options.hasOwnProperty("lid");
    }

    listSymbols()
    {
        for (let key in symbolNames)
        {
            console.rawLog(symbolNames[key] + `   ${key} `);
        }
    }

    applySymbolByName(context)
    {
        try
        {
            if (context.symbol && symbolNames[context.symbol])
            {
                context.symbol = symbolNames[context.symbol];
            }
        }
        catch (e)
        {

        }
    }

    convertToContext(options, defaultContext)
    {
        defaultContext = defaultContext || this.generateDefaultContext();
        options = options || defaultContext;
        let context = options;
        if (options.context && typeof options.context === "object")
        {
            const moreOptions = Object.assign({}, options);
            delete moreOptions.context;
            context = Object.assign({}, options.context, moreOptions);
        }

        context = Object.assign({}, defaultContext, context);
        delete context.context;

        this.applySymbolByName(context);

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
            this.#realConsoleLog("AnaLogger: Hook placed on console.error");
        }
        console.error = this.onDisplayError.bind(this);
    }

    overrideConsole({log = true, info = true, warn = true, error = false} = {})
    {
        if (!this.options.hideHookMessage)
        {
            this.#realConsoleLog("AnaLogger: Hook placed on console.log");
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
        console.warn = this.#realConsoleError;
    }

    removeOverride({log = true, info = true, warn = true, error = false} = {})
    {
        if (log)
        {
            console.log = this.#realConsoleLog;
        }

        if (info)
        {
            console.info = this.#realConsoleInfo;
        }

        if (warn)
        {
            console.warn = this.#realConsoleWarn;
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

    table(...args)
    {
        return this.buildTable(...args);
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

    /**
     * Set standard Analogger format
     * @example
     * // Output Example
     * // [14:01:06]    DEFAULT: (1060) ⚡  " ✔ My log ..."
     * @param activeTarget
     * @param override
     * @returns {boolean}
     */
    applyAnalogFormatting({activeTarget = "", override = false} = {})
    {
        try
        {
            const silent = false, lidLenMax = 4;

            const LOG_CONTEXTS = {
                STANDARD: null,
                TEST    : {color: "#B18904", symbol: "diamonds"},
                C1      : null,
                C2      : null,
                C3      : null,
                DEFAULT : {}
            };

            const DEV = (typeof process === "object") ? process.env.DEVELOPER : "DEV";
            const DEV1 = (typeof process === "object") ? process.env.DEVELOPER : "DEV1";

            const LOG_TARGETS = {
                ALL  : "ALL",
                DEBUG: "DEBUG",
                DEV,
                DEV1,
                USER : "USER"
            };

            this.setDefaultContext(LOG_CONTEXTS.DEFAULT);
            this.setTargets(LOG_TARGETS);

            activeTarget && this.setActiveTarget(activeTarget);

            this.setOptions({silent, hideError: false, hideHookMessage: true, lidLenMax});
            if (override)
            {
                this.overrideConsole();
                this.overrideError();
            }

            return true;
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 3249}, e.message);
        }

        /* istanbul ignore next */
        return false;
    }

    applyPredefinedFormat(name = PREDEFINED_FORMATS.DEFAULT_FORMAT, {activeTarget = "", override = false} = {})
    {
        if (name === PREDEFINED_FORMATS.DEFAULT_FORMAT)
        {
            return this.applyAnalogFormatting({activeTarget, override});
        }
    }

}

const _AnaLogger = ____AnaLogger;
module.exports.AnaLogger = _AnaLogger;

const __AnaLogger = ____AnaLogger;
module.exports = __AnaLogger;

const ___anaLogger = new ____AnaLogger();
module.exports.anaLogger = ___anaLogger;

