/**
 *
 */
// ==================================================================
// Generic functions
// ==================================================================
/**
 * Delay code execution for a number of milliseconds
 * @param {number} ms Number of milliseconds to delay the code
 * @returns {Promise<unknown>}
 */
function sleep(ms)
{
    return new Promise((resolve) =>
    {
        setTimeout(resolve, ms);
    });
}


/**
 * Simple object check
 * @param item
 * @returns {boolean}
 */
function isObject(item)
{
    // null is an object
    if (!item)
    {
        return false;
    }
    // Arrays are objects
    else if (Array.isArray(item))
    {
        return false;
    }
    return typeof item === "object";
}

/**
 * Deep merge two objects.
 * @param target
 * @param sources
 * @see https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
function mergeDeep(target, ...sources)
{
    if (!sources.length)
    {
        return target;
    }
    const source = sources.shift();

    if (isObject(target) && isObject(source))
    {
        for (const key in source)
        {
            if (isObject(source[key]))
            {
                if (!target[key])
                {
                    Object.assign(target, {[key]: {}});
                }
                mergeDeep(target[key], source[key]);
            }
            else
            {
                Object.assign(target, {[key]: source[key]});
            }
        }
    }

    return mergeDeep(target, ...sources);
}

/**
 * Generate a random name
 * @param {string} prefixName Prefix generated name with given value
 * @param {string} suffixName Suffix generated name with given value
 * @return {string}
 */
function generateTempName(prefixName = "", suffixName = "")
{
    const crypto = require("crypto");
    return prefixName +
        crypto.randomBytes(16).toString("base64").replace(/[^\w\d]/g, "") +
        suffixName;
}

/**
 * Convert a session key property into a CLI argument
 * @example
 *
 * convertSessionKeyNameToArg("staticDirs", ["./", "./public"])
 * // ["--dir", "./", "--dir", "./public"]
 *
 * convertSessionKeyNameToArg("silent")
 * // ["--silent"]
 *
 * convertSessionKeyNameToArg("enableapi", false)
 * // ["--disableapi"]
 * convertSessionKeyNameToArg("enableapi", true)
 * // []
 *
 * convertSessionKeyNameToArg("port", 3000)
 * // ["--port", 3000]
 *
 * convertSessionKeyNameToArg("defaultPage", "index.html")
 * // ["--defaultpage", "index.html"]
 *
 * @param key
 * @param value
 * @returns {(string|*)[]|*[]|*}
 */
const convertSessionKeyNameToArg = (key, value = undefined) =>
{
    const table = {
        port       : "port",
        protocol   : "protocol",
        timeout    : "timeout",
        host       : "host",
        defaultPage: "defaultpage",
        silent     : () => ["--silent"],
        staticDirs : (inputs) =>
        {
            const arr = [];
            inputs.forEach((input) =>
            {
                arr.push("--dir");
                arr.push(input);
            });
            return arr;
        },
        enableapi  : (input) =>
        {
            if (!input)
            {
                return ["--disableapi"];
            }

            return [];
        }
    };

    let arg = table[key];
    if (!arg)
    {
        return [];
    }

    if (typeof arg === "function")
    {
        return arg(value);
    }

    const option = `--${arg}`;
    return [option, value];
};

/**
 * Convert session properties to CLI array
 * @param session
 * @param argv
 * @param scriptPath
 * @param command
 * @param target
 * @returns {*}
 */
const convertSessionToArg = (session, argv, {scriptPath = "", command = "", target = ""} = {}) =>
{
    const argumentsFromSession = argv.slice(0, 1);

    if (scriptPath)
    {
        if (!fs.existsSync(scriptPath))
        {
            throw new Error(`[${scriptPath}] could not be found`);
        }

        argumentsFromSession.push(scriptPath);
    }

    if (command)
    {
        argumentsFromSession.push(command);
        if (target)
        {
            argumentsFromSession.push(target);
        }
    }

    for (const [key, values] of Object.entries(session))
    {
        const res = convertSessionKeyNameToArg(key, values);
        if (!res || !res.length)
        {
            continue;
        }
        argumentsFromSession.push(...res);
    }
    return argumentsFromSession;
};

const normalisePath = (filepath) =>
{
    filepath = path.normalize(filepath);
    filepath = filepath.replace(/\\/g, "/");
    return filepath;
};

const normaliseFileName = (sessionName) =>
{
    try
    {
        if (!sessionName)
        {
            return "";
        }

        sessionName = sessionName.trim().toLowerCase();
        return sessionName;
    }
    catch (e)
    {
        console.error(e);
    }
};

/**
 * Join and optimise path
 * @alias path.join
 * @param args
 * @returns {any}
 */
const joinPath = (...args) =>
{
    let filepath = path.join(...args);
    filepath = normalisePath(filepath);
    return filepath;
};

/**
 * Resolve and optimise path (replace backslashes with forward slashes)
 * @alias path.resolve
 * @param filepath
 * @returns {*}
 */
const resolvePath = (filepath) =>
{
    filepath = path.resolve(filepath);
    filepath = normalisePath(filepath);
    return filepath;
};

const isItemInList = (item, list = []) =>
{
    if (!item)
    {
        return false;
    }

    if (!Array.isArray(list))
    {
        throw new Error("list should be an array");
    }

    if (!list || !list.length)
    {
        return false;
    }
    return list.includes(item);
};

/**
 * Calculate file size
 * @param file
 * @returns {number}
 */
const getFilesizeInBytes = (file) =>
{
    const stats = fs.statSync(file);
    return stats.size;
};

const convertToUrl = ({protocol, host, port, pathname}) =>
{
    const url = new URL("http://localhost");
    url.protocol = protocol;
    url.host = host;
    url.port = port;
    if (pathname)
    {
        url.pathname = pathname;
    }

    return url.toString();
};

/**
 * Do nothing. Everything you do is to make any linter ignore you.
 * @param args
 */
const doNothing = function (args)
{
    if (!args)
    {
        console.log({lid: 2000, target: "void"}, args);
    }
};

/**
 * If source finishes with a "/", it's a folder,
 * otherwise, it's not.
 * @returns {boolean}
 */
const isConventionalFolder = (source) =>
{
    if (!source)
    {
        return false;
    }
    return source.charAt(source.length - 1) === "/";
};

/**
 * Use conventions (See file top)
 * @todo Change function name to more appropriate name
 * @param source
 * @param requiredPath
 * @returns {string}
 */
const calculateRelativePath = (source, requiredPath) =>
{
    source = normalisePath(source);
    requiredPath = normalisePath(requiredPath);

    if (!isConventionalFolder(source))
    {
        source = path.parse(source).dir + "/";
    }

    const relativePath = path.relative(source, requiredPath);
    return normalisePath(relativePath);
};


const fetchSync = async function (url, isJson = false)
{
    return new Promise(async function (resolve, reject)
    {
        try
        {
            https.get(url, res =>
            {
                let data = "";

                res.on("data", chunk =>
                {
                    data += chunk;
                });

                res.on("end", () =>
                {
                    data = isJson ? JSON.parse(data) : data;
                    resolve(data);
                });

            }).on("error", err =>
            {
                console.log(err.message);
            });
        }
        catch (e)
        {
            reject(e);
        }
    });
};

/**
 *
 * @param number
 * @param type
 */
function addPlural(number, type = "word")
{
    if (type === "verb")
    {
        return number === 1 ? "s" : "";
    }
    else if (type === "word")
    {
        return number === 1 ? "" : "s";
    }
}

// ==================================================================
// Path Related functions
// ==================================================================
//
// ------------------------------------------------------------------
/**
 * Returns OS data dir for the application
 * @returns {string|null}
 */
const getAppDataDir = (appName) =>
{
    try
    {
        const osDataDir = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share");
        return joinPath(osDataDir, appName);
    }
    catch (e)
    {

    }
    return null;
};

/**
 *
 * @returns {boolean}
 */
const createAppDataDir = (appName) =>
{
    try
    {
        const appDataDir = getAppDataDir(appName);
        if (!appDataDir)
        {
            console.error( PATH_ERRORS.DATA_DIR_FAILED );
            return false;
        }

        if (!fs.existsSync(appDataDir))
        {
            fs.mkdirSync(appDataDir, {recursive: true});
        }

        return fs.lstatSync(appDataDir).isDirectory();
    }
    catch (e)
    {
        console.error(e.message);
    }

    return false;
};


// Generic functions
module.exports.normalisePath = normalisePath;
module.exports.joinPath = joinPath;
module.exports.mergeDeep = mergeDeep;
module.exports.sleep = sleep;
module.exports.generateTempName = generateTempName;
module.exports.convertSessionKeyNameToArg = convertSessionKeyNameToArg;
module.exports.convertSessionToArg = convertSessionToArg;
module.exports.resolvePath = resolvePath;
module.exports.isItemInList = isItemInList;
module.exports.getFilesizeInBytes = getFilesizeInBytes;
module.exports.convertToUrl = convertToUrl;
module.exports.doNothing = doNothing;
module.exports.fetchSync = fetchSync;
module.exports.calculateRelativePath = calculateRelativePath;
module.exports.normaliseFileName = normaliseFileName;
module.exports.isObject = isObject;
module.exports.addPlural = addPlural;


// Path Related functions
module.exports.getAppDataDir = getAppDataDir;
module.exports.createAppDataDir = createAppDataDir;