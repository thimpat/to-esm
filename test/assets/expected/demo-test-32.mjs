import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
let packageJson = {
  "name": "something",
  "version": "1.0.2",
  "random": 123456
};

export const ME  = process.env.GENSERVE_DEVELOPER;
export const DEV  = "PT";

export const CLIENT_BINARY  = packageJson.bin.genserve;

export const APP_NAME  = packageJson.name;
export const APP_VERSION  = packageJson.version;
const n = packageJson.random;

/**
 * Filename for global settings
 * @type {string}
 */
export const GLOBAL_SETTING_FILENAME  = ".genserve.json";
export const SUFFIX_SESSIONS_FILENAME  = "-sessions.json";

export const DEFAULT_NAMESPACE_NAME  = "default";
export const DEFAULT_SERVER_NAME  = "default";

export const PLUGIN_STAT_PATH  = joinPath(__dirname, "../../plugins/stats.cjs");
export const DEFAULT_DYNAMIC_EXTENSION  = "\.server\.[cm]?js";

export const FATAL_UNCHANGEABLE_LOG_PATH  = "genserve-errors.log";
export const DEFAULT_MESSAGE_STRING  = "Loggable initialised";

export const CONFIRM  = {
    YES: "yes",
    NO : "no"
};

export const FLAG  = {
    ON : "on",
    OFF: "off"
};

export const UNKNOWN_STAGE  = {
    TDB: "??"
};

/**
 * @enum {StatusType}
 */
export const STATUS  = {
    SUCCESS    : "success",
    FAILED     : "failed",
    UNPROCESSED: "unprocessed"
};

/**
 * @type {RemoteStatusType}
 */
export const REMOTE_STATUS  = {
    UP     : "up",
    DOWN   : "down",
    UNKNOWN: "unknown"
};

/**
 * @type {DisplayType}
 */
export const DISPLAY  = {
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
export const TARGET  = {
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

export const EXTENSION  = {
    CORS     : "cors",
    SSL      : "ssl",
    NAMESPACE: "namespace",
};

/**
 * @type {ItemType}
 */
export const ITEM_TYPE  = {
    STATIC : "static",
    DYNAMIC: "dynamic",
    UNKNOWN: "unknown",
};

export const JS_TYPE  = {
    CJS: "cjs",
    ESM: "mjs"
};

export const SETTING_TYPE  = {
    WEB    : "WEB",             // Settings for servers
    API    : "API",             // Settings for apis
    GENERAL: "GENERAL"      // Settings for all other things
};

export const ERRORS  = {
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

export const PROCESS_MESSAGE  = {
    SERVER_READY: "server-ready",                // Sent by child process to any parent process when child is
                                                 // ready
    PID_READY         : "pid-ready",
    SERVER_FATAL_ERROR: "fatal-server-error",
    PORT_UNAVAILABLE  : "fatal-port-error"
};


/**
 * @enum {CommandListType}
 */
export const COMMANDS  = {
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

export const FIXED_SETTINGS  = {
    "PASS"       : "re5fd212er4554gf223ds545",
    "WS_PATH"    : "mhgd5321321",
    "ENV_PASS"   : process.env.GENSERVE_PASS,
    "ENV_WS_PATH": process.env.GENSERVE_WS_PATH
};

export const LOG_SEPARATOR  = "---------------------------------------";









































