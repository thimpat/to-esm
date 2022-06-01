const packageJson = require("../package.json");

const ME = process.env.GENSERVE_DEVELOPER;
const DEV = "PT";

const CLIENT_BINARY = packageJson.bin.genserve;

const APP_NAME = packageJson.name;
const APP_VERSION = packageJson.version;
const n = packageJson.random;

/**
 * Filename for global settings
 * @type {string}
 */
const GLOBAL_SETTING_FILENAME = ".genserve.json";
const SUFFIX_SESSIONS_FILENAME = "-sessions.json";

const DEFAULT_NAMESPACE_NAME = "default";
const DEFAULT_SERVER_NAME = "default";

const PLUGIN_STAT_PATH = joinPath(__dirname, "../../plugins/stats.cjs");
const DEFAULT_DYNAMIC_EXTENSION = "\.server\.[cm]?js";

const FATAL_UNCHANGEABLE_LOG_PATH = "genserve-errors.log";
const DEFAULT_MESSAGE_STRING = "Loggable initialised";

const CONFIRM = {
    YES: "yes",
    NO : "no"
};

const FLAG = {
    ON : "on",
    OFF: "off"
};

const UNKNOWN_STAGE = {
    TDB: "??"
};

/**
 * @enum {StatusType}
 */
const STATUS = {
    SUCCESS    : "success",
    FAILED     : "failed",
    UNPROCESSED: "unprocessed"
};

/**
 * @type {RemoteStatusType}
 */
const REMOTE_STATUS = {
    UP     : "up",
    DOWN   : "down",
    UNKNOWN: "unknown"
};

/**
 * @type {DisplayType}
 */
const DISPLAY = {
    JSON    : "json",               // Json
    JS      : "js",                 // Object
    STANDARD: "standard",           // Human
    RAW     : "raw",
    PRETTY  : "pretty",             // Indented Json
    FILE    : "file",
    FORCE   : "force",
    NEW     : "new",
    NOW     : "now",
    CLEAR   : "clear",
    OPEN    : "open",
    EDIT    : "edit"
};

/**
 *
 * @enum {EditType}
 */
const TARGET = {
    ALL       : "all",
    UPS       : "up",
    DOWNS     : "down",
    SETTINGS  : "settings",
    SERVERS   : "servers",
    NAMESPACES: "namespaces",
    SESSIONS  : "sessions",
    DETAILS   : "details",
    NOW       : "now",
    ACTIVE    : "active",
    DEFAULT   : "default",
};

const EXTENSION = {
    CORS     : "cors",
    SSL      : "ssl",
    NAMESPACE: "namespace",
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

const ERRORS = {
    NO_ERROR             : {
        code   : 0,
        message: "Success"
    },
    FAILED_INITIALISATION: {
        code   : 3015,
        message: "Server failed to initialise"
    },
    INVALID_FORMAT       : {
        code   : 3019,
        message: "Invalid format"
    },
    NONEXISTENT_SESSION  : {
        code   : 3021,
        message: "Session nonexistent"
    },
    UNSPECIFIED_SESSION  : {
        code   : 3027,
        message: "No session name given"
    },
    UNSPECIFIED_PORT     : {
        code   : 3023,
        message: "Port not defined"
    },
    SESSION_ERROR        : {
        code   : 3025,
        message: "Session error"
    },
    TIMEOUT_ERROR        : {
        code   : 3027,
        message: "Failure due to timeout"
    },
    WRITE_ERROR          : {
        code   : 3029,
        message: "Failure to write file"
    },
    SERVER_BUSY_ERROR    : {
        code   : 3031,
        message: "Server busy"
    },
};

const PROCESS_MESSAGE = {
    SERVER_READY: "server-ready",                // Sent by child process to any parent process when child is
                                                 // ready
    PID_READY         : "pid-ready",
    SERVER_FATAL_ERROR: "fatal-server-error",
    PORT_UNAVAILABLE  : "fatal-port-error"
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
    CREATE   : "create",                       // Create a server without starting it
    SAVE     : "save",                         // Save server list
    LOAD     : "load",                         // Restore server list
    PATH     : "path",
    VERSION  : "version",
    CLONE    : "clone",
    RENAME   : "rename",
    MONITOR  : "monitor",
    DISABLE  : "disable",                      // Disable CORS, SSL, etc.
    ENABLE   : "enable",                       // Enable CORS, SSL, etc.
    NAMESPACE: "namespace",
    ERASE    : "erase",
    SHOW     : "show",
    REPORT   : "report",                      // Report details about genserve (namespace...)
    CLOSE    : "close",
    SHUTDOWN : "shutdown",                    // Stop all servers from every namespace
    PROJECT  : "project",
    IMPORT   : "import",
    GET      : "get",
    PUT      : "put",
    PULL     : "pull",
    PUSH     : "push",
    PING     : "ping",
    RESET    : "reset",
    NOOP     : "noop"
};

const FIXED_SETTINGS = {
    "PASS"       : "re5fd212er4554gf223ds545",
    "WS_PATH"    : "mhgd5321321",
    "ENV_PASS"   : process.env.GENSERVE_PASS,
    "ENV_WS_PATH": process.env.GENSERVE_WS_PATH
};

const LOG_SEPARATOR = "---------------------------------------";

module.exports.GLOBAL_SETTING_FILENAME = GLOBAL_SETTING_FILENAME;
module.exports.SUFFIX_SESSIONS_FILENAME = SUFFIX_SESSIONS_FILENAME;

module.exports.SETTING_TYPE = SETTING_TYPE;

module.exports.DEFAULT_NAMESPACE_NAME = DEFAULT_NAMESPACE_NAME;
module.exports.DEFAULT_SERVER_NAME = DEFAULT_SERVER_NAME;
module.exports.DEFAULT_MESSAGE_STRING = DEFAULT_MESSAGE_STRING;


module.exports.PROCESS_MESSAGE = PROCESS_MESSAGE;
module.exports.ERRORS = ERRORS;
module.exports.STATUS = STATUS;
module.exports.REMOTE_STATUS = REMOTE_STATUS;
module.exports.CONFIRM = CONFIRM;
module.exports.FLAG = FLAG;
module.exports.UNKNOWN_STAGE = UNKNOWN_STAGE;
module.exports.TARGET = TARGET;
module.exports.COMMANDS = COMMANDS;
module.exports.DISPLAY = DISPLAY;
module.exports.EXTENSION = EXTENSION;
module.exports.ITEM_TYPE = ITEM_TYPE;
module.exports.JS_TYPE = JS_TYPE;

module.exports.FIXED_SETTINGS = FIXED_SETTINGS;

module.exports.PLUGIN_STAT_PATH = PLUGIN_STAT_PATH;
module.exports.DEFAULT_DYNAMIC_EXTENSION = DEFAULT_DYNAMIC_EXTENSION;
module.exports.FATAL_UNCHANGEABLE_LOG_PATH = FATAL_UNCHANGEABLE_LOG_PATH;
module.exports.LOG_SEPARATOR = LOG_SEPARATOR;


module.exports.ME = ME;
module.exports.DEV = DEV;

module.exports.CLIENT_BINARY = CLIENT_BINARY;

module.exports.APP_NAME = APP_NAME;
module.exports.APP_VERSION = APP_VERSION;

