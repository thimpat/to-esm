/**
 * Filename for global settings
 * @type {string}
 */
const GLOBAL_SETTING_FILENAME = ".genserve.json";
const SUFFIX_SESSIONS_FILENAME = "-sessions.json";

const DEFAULT_NAMESPACE_NAME = "default";
const DEFAULT_SERVER_NAME = "default";

const PLUGIN_STAT_PATH = joinPath(__dirname, "../plugins/stats.cjs");
const DEFAULT_DYNAMIC_EXTENSION = "\.server\.[cm]?js";

/**
 *
 * @enum {StatusType}
 */
const STATUS = {
    SUCCESS: "success",
    FAILED : "failed"
};

/**
 *
 * @enum {EditType}
 */
const TARGET = {
    ALL     : "all",
    SETTINGS: "settings",
    SERVERS : "servers",
};

const EXTENSION = {
    CORS: "cors",
    SSL : "ssl"
};

const CONFIRM = {
    YES: "yes",
    NO : "no"
};

const FLAG = {
    ON : "on",
    OFF: "off"
};

/**
 * @type {ItemType}
 */
const ITEM_TYPE = {
    STATIC : "static",
    DYNAMIC: "dynamic",
    UNKNOWN: "unknown",
};

const JS_TYPE = {
    CJS: "cjs",
    ESM: "mjs"
};

const SETTING_TYPE = {
    WEB    : "WEB",             // Settings for servers
    API    : "API",             // Settings for apis
    GENERAL: "GENERAL"      // Settings for all other things
};

/**
 * @see retrieveGlobalSettings
 * @note Globals should be capitalised.
 * @note Do not use directly. Use retrieveGlobalSettings() instead. The value below may have been redefined
 * in the une global config file, retrieveGlobalSettings knows what to use.
 * @type {{staticDirs: *[], START_STREAM_SIZE: number, protocol: string, strictPort: boolean, host: string,
 *     dynamicDirs: *[], API: {SERVER_STATUS: {SERVER_STARTED: string, SERVER_RUNNING: string, GET_SERVER_INFO:
 *     string}, SERVER_API_HOST: string, LOG_FOLDER_NAME: string, SPAWN: string, LOG_PATH: string, STRICT_PORT:
 *     boolean, AUTO_RELOAD_AGREEMENT_MESSAGE: string, NOT_HOT_RELOAD_QUERY: string, EDITOR: string, HOT_RELOAD_QUERY:
 *     string, TIMEOUT_ON_START_SERVER: number, SERVER_API_PORT: undefined, GREETINGS: string, PASS: string,
 *     ALIVE_PERIOD: number, PER_MESSAGE_DEFLATE: boolean}, dynamicExts: string}}
 */
const DEFAULT_WEB_SERVER_SETTINGS = {
    "protocol"  : "http://",
    "host"      : "localhost",
    "strictPort": false,
    /**
     * The server will be serving the public/ and build dirs as static
     */
    "staticDirs"       : [],
    "dynamicDirs"      : [],
    "monitorDirs"      : [],
    "plugins"          : [PLUGIN_STAT_PATH],
    "dynamicExts"      : DEFAULT_DYNAMIC_EXTENSION,
    "MONITOR_DIRS"     : [],
    "START_STREAM_SIZE": 2 * 1024 * 1024,
    "PRODUCTION"       : false
};

const DEFAULT_API_SERVER_SETTINGS = {
    "EDITOR"                 : "",
    "PASS"                   : "re5fd212er4554gf223ds545",
    "SERVER_API_PORT"        : undefined,
    "STRICT_PORT"            : false,
    "SERVER_API_HOST"        : "localhost",
    "SPAWN"                  : "no",
    "ALIVE_PERIOD"           : 5000,
    "LOG_FOLDER_NAME"        : "genserve-log",
    "LOG_PATH"               : ".",
    "TIMEOUT_ON_START_SERVER": 10000,
    "SERVER_STATUS"          : {
        "SERVER_STARTED" : "SERVER_STARTED",
        "SERVER_RUNNING" : "SERVER_RUNNING",
        "GET_SERVER_INFO": "GET_SERVER_INFO"
    },
    "AUTO_RELOAD"            : {
        "GREETINGS"                    : "Hello Server!",
        "AUTO_RELOAD_AGREEMENT_MESSAGE": "Code updated",
        "HOT_RELOAD_QUERY"             : "hot_reload=true",
        "NOT_HOT_RELOAD_QUERY"         : "hot_reload=false",
    },
    "PER_MESSAGE_DEFLATE"    : false
};

const DEFAULT_GENERAL_SETTINGS = {
    DEFAULT_NAMESPACE_NAME,
    OS_NOTIFICATIONS          : FLAG.OFF,
    SHOW_MISSING_FOLDER_ERRORS: CONFIRM.NO
};

const ERRORS = {
    NO_ERROR               : {
        code   : 0,
        message: "Success"
    },
    FAILED_INITIALISATION  : {
        code   : 3015,
        message: "Server failed to initialise"
    },
    SESSIONS_FILE_NOT_FOUND: {
        code   : 3017,
        message: "Sessions file not found"
    },
    INVALID_FORMAT         : {
        code   : 3019,
        message: "Invalid format"
    },
    NONEXISTENT_SESSION    : {
        code   : 3021,
        message: "Session nonexistent"
    },
    UNSPECIFIED_SESSION    : {
        code   : 3027,
        message: "No session name given"
    },
    UNSPECIFIED_PORT       : {
        code   : 3023,
        message: "Port not defined"
    },
    SESSION_ERROR          : {
        code   : 3025,
        message: "Session error"
    },
    TIMEOUT_ERROR          : {
        code   : 3027,
        message: "Failure due to timeout"
    },
    WRITE_ERROR            : {
        code   : 3029,
        message: "Failure to write file"
    },
    SERVER_BUSY_ERROR      : {
        code   : 3031,
        message: "Server busy"
    },
};

const PROCESS_MESSAGE = {
    SERVER_READY: "server-ready",                // Sent by child process to any parent process when child is
                                                 // ready
    PID_READY         : "pid-ready",
    SERVER_FATAL_ERROR: "fatal-server-error"
};


/**
 * @enum {CommandListType}
 */
const COMMANDS = {
    HELP     : "help",
    INFO     : "info",                         // Show session info in a json formatted way
    LOG      : "log",                          // Show log
    LIST     : "list",                         // List existing sessions
    SCAN     : "scan",                         // List existing sessions and check if they're running
    START    : "start",                        // Start server session
    RESTART  : "restart",                      // Restart server session
    RUN      : "run",
    STOP     : "stop",                         // Stop server session
    DELETE   : "delete",                       // Remove server
    REMOVE   : "remove",                       // Remove server
    STATUS   : "status",                       // Tells whether server is up
    FLUSH    : "flush",
    LOCK     : "lock",                         // Lock server status
    UNLOCK   : "unlock",                       // Unlock server status
    PROTECT  : "protect",                      // Allow server deletion
    UNPROTECT: "unprotect",                    // Allow server deletion
    EDIT     : "edit",                         // Edit sessions file
    SET      : "set",                          // Set server options
    SAVE     : "save",                         // Save server list
    LOAD     : "load",                         // Restore server list
    PATH     : "path",
    VERSION  : "version",
    CLONE    : "clone",
    RENAME   : "rename",
    MONITOR  : "monitor",
    ENABLE   : "enable",                       // Enable CORS, etc.
    NAMESPACE: "namespace",
    ERASE    : "erase",
    SHOW     : "show",
    REPORT   : "report",                      // Report details about genserve (namespace...)
    CLOSE    : "close",
    SHUTDOWN : "shutdown",                    // Stop all servers from every namespace
    PROJECT  : "project"
};


module.exports.GLOBAL_SETTING_FILENAME = GLOBAL_SETTING_FILENAME;
module.exports.SUFFIX_SESSIONS_FILENAME = SUFFIX_SESSIONS_FILENAME;

module.exports.SETTING_TYPE = SETTING_TYPE;

module.exports.DEFAULT_WEB_SERVER_SETTINGS = DEFAULT_WEB_SERVER_SETTINGS;
module.exports.DEFAULT_API_SERVER_SETTINGS = DEFAULT_API_SERVER_SETTINGS;
module.exports.DEFAULT_GENERAL_SETTINGS = DEFAULT_GENERAL_SETTINGS;

module.exports.DEFAULT_NAMESPACE_NAME = DEFAULT_NAMESPACE_NAME;
module.exports.DEFAULT_SERVER_NAME = DEFAULT_SERVER_NAME;


module.exports.PROCESS_MESSAGE = PROCESS_MESSAGE;
module.exports.ERRORS = ERRORS;
module.exports.STATUS = STATUS;
module.exports.CONFIRM = CONFIRM;
module.exports.FLAG = FLAG;
module.exports.TARGET = TARGET;
module.exports.COMMANDS = COMMANDS;
module.exports.EXTENSION = EXTENSION;
module.exports.ITEM_TYPE = ITEM_TYPE;
module.exports.JS_TYPE = JS_TYPE;
