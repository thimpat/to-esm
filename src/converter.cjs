/**
 * This file is to convert a Commonjs file into an ESM one.
 */
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const commonDir = require("commondir");
const {hideText, restoreText, beforeReplace, resetAll} = require("before-replace");
const {stripStrings, stripComments, stripRegexes, clearStrings, parseString} = require("strip-comments-strings");
const {Readable} = require("stream");
const toAnsi = require("to-ansi");

const {findPackageEntryPoint} = require("find-entry-point");

const espree = require("espree");
const estraverse = require("estraverse");

const esbuild = require("esbuild");

const toEsmPackageJson = require("../package.json");

// Value for parsable code
let commentMasks = {
    COMMENT_MASK_START: "🥽👕🧥",
    COMMENT_MASK_END  : "🥾👑🩳",
};
let sourceExtractedComments = [];
let sourceExtractedStrings = [];
let sourceExtractedRegexes = [];

const blockMaskIn = "👉";
const blockMaskOut = "👈";


let strSheBang = "";

let dumpCounter = 0;
let DEBUG_MODE = false;


const TARGET = {
    BROWSER: "browser",
    ESM    : "esm",
    CJS    : "cjs",
    PACKAGE: "package",
    ALL    : "all"
};
const ESM_EXTENSION = ".mjs";

const COMMENT_MASK = "❖✎🔏❉";

const STRING_MASK_START = "❖✎❉";
const STRING_MASK_END = "❉✎❖";

const REGEX_MASK_START = "✋⛽⚒";
const REGEX_MASK_END = "⚒⛽✋";

const EOL = require("os").EOL;
const IMPORT_MASK_START = EOL + "/** to-esm: import-start **/" + EOL;
const IMPORT_MASK_END = EOL + "/** to-esm: import-end **/" + EOL;
const EXPORT_KEYWORD_MASK = "🦊";

const DEBUG_DIR = "./debug/";

let indexGeneratedTempVariable = 1;

/**
 * module and exports can be redeclared in a block. They are not protected keywords.
 * @type {[{search: RegExp, original: string, replace: string},{search: RegExp, original: string, replace: string}]}
 */
const AMBIGUOUS = [
    {
        search  : /\bmodule\b/gm,
        replace : "❖❖❖❖❖❖",
        original: "module"
    },
    {
        search  : /\bexports\b/gm,
        replace : "❉❉❉❉❉❉❉",
        original: "exports"
    }
];
const AMBIGUOUS_VAR_NAMES = ["module", "exports"];

const nativeModules = Object.keys(process.binding("natives"));

// The whole list of files to convert
let cjsList = [];

const normaliseString = (content) =>
{
    content = content.replace(/\r\n/gm, "\n").replace(/\n/gm, EOL);
    return content;
};

const setupConsole = () =>
{
    const {anaLogger} = require("analogger");

    anaLogger.setOptions({silent: false, hideError: false, hideHookMessage: true, lidLenMax: 4});
    anaLogger.overrideConsole();
    anaLogger.overrideError();

    console.log({lid: 1300}, "Console is set up");
};

/**
 * Build target directory.
 * Ignore, if the directory already exist
 * @param {string} targetDir Directory to build
 * @test Some parts are ignored for the coverage (needs to simulate conditions
 * linked to filesystem like root access or bad hard drive)
 */
const buildTargetDir = (targetDir) =>
{
    try
    {
        if (fs.existsSync(targetDir))
        {
            return true;
        }

        fs.mkdirSync(targetDir, {recursive: true});
        return true;
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1001}, "", e.message);
    }

    /* istanbul ignore next */
    return false;
};

/**
 * Execute some non-trivial transformations that require multiple passes
 * @param {string} converted String to perform transformations onto
 * @param source
 * @param detectedExported
 * @returns {*}
 */
const convertNonTrivialExportsWithAST = (converted, source, detectedExported = []) =>
{
    let converted0, subst;

    converted = hideKeyElementCode(converted, source);

    for (let i = 0; i < detectedExported.length; ++i)
    {
        const item = detectedExported[i];

        const regexSentence =
            `(class|const|let|var|class|function\\s*\\*?)\\s*\\b${item.funcname}\\b([\\S\\s]*?)(?:module\\.)?exports\\.\\b${item.namedExport}\\b\\s*=\\s*\\b${item.funcname}\\b\\s*;?`;

        const regexp =
            new RegExp(regexSentence, "gm");

        subst = `export $1 ${item.namedExport} $2`;

        converted0 = converted;
        converted = converted0.replace(regexp, subst);
    }

    converted = restoreKeyElementCode(converted);

    return converted;
};

/**
 * Execute some non-trivial transformations that require multiple passes
 * @param {string} converted String to perform transformations onto
 * @param source
 * @returns {*}
 */
const convertNonTrivial = (converted, source) =>
{
    let converted0;
    let regex = /((?<!export\s+)(?:const|let|var|class|function\s*\*?)\s+)(\w+)(\s+=.*\b(?:module\.)?exports\s*=\s*{[^}]*\2\b)/sgm;
    let subst = "export $1$2$3";
    converted0 = converted;
    converted = converted0.replaceAll(regex, subst);
    dumpData(converted, source, "convertNonTrivial - p1");

    regex = /(?:const|let|var|class|function\s*\*?)\b\s+\b([\w]+)\b([\s\S]*)\1\s*=\s*require\(([^)]+.js[^)])\)/sgm;
    subst = "import $1 from $3$2";
    converted0 = converted;
    converted = converted0.replaceAll(regex, subst);
    dumpData(converted, source, "convertNonTrivial - p2");

    return converted;

};

/**
 * Check whether the given text has a valid JavaScript syntax
 * @param str
 * @param syntaxType
 * @returns {boolean}
 */
const validateSyntax = (str, syntaxType = "commonjs") =>
{
    try
    {
        espree.parse(
            str, {
                sourceType   : syntaxType,
                ecmaVersion  : "latest",
                allowReserved: false,
                loc          : false,
                range        : false,
                tokens       : false,
                comment      : false
            }
        );
        return true;
    }
        /* istanbul ignore next */
    catch (e)
    {
    }

    return false;
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
 * Returns the path of a relative path relative to source.
 * @param source File that contains the require or import
 * @param requiredPath Relative path inside the require or import
 * @todo Change function name to more appropriate name
 */
const concatenatePaths = (source, requiredPath) =>
{
    source = normalisePath(source);
    const sourceDir = isConventionalFolder(source) ? source : path.parse(source).dir;
    let importPath = path.join(sourceDir, requiredPath);
    return normalisePath(importPath);
};

/**
 * Calculate the relative path from a source to another path.
 * For instance, when doing a require() or import, the target
 * path needs to be resolved for file1 to correctly require file2.
 * ------> /some/path/to/file1
 * ------> /some/other/path/to/file2
 * Resolution on file1: require("../../other/path/to/file2")
 * @param sourcePath
 * @param targetPath
 * @returns {string}
 */
const calculateRelativePath = (sourcePath, targetPath) =>
{
    sourcePath = normalisePath(sourcePath);
    targetPath = normalisePath(targetPath);

    if (!isConventionalFolder(sourcePath))
    {
        sourcePath = path.parse(sourcePath).dir + "/";
    }

    const relativePath = path.relative(sourcePath, targetPath);
    return normalisePath(relativePath);
};

/**
 * Third-Party Module path starting with ./node_modules/ + relative path to the entry point
 * @param moduleName
 * @param targetDir
 * @param target
 * @returns {string|null}
 */
const getModuleEntryPointPath = (moduleName, targetDir = "", target = "") =>
{
    try
    {
        let isCjs = target === TARGET.CJS;

        let entryPoint;
        entryPoint = findPackageEntryPoint(moduleName, targetDir, {
            isCjs,
            isBrowser       : target === TARGET.BROWSER,
            useNativeResolve: false
        });
        /* istanbul ignore next */
        if (entryPoint === null)
        {
            console.log({lid: 1149}, ` Could not find entry point for module ${moduleName}.`);
            return null;
        }
        entryPoint = normalisePath(entryPoint);

        const nodeModulesPos = entryPoint.indexOf("node_modules");
        /* istanbul ignore next */
        if (nodeModulesPos === -1)
        {
            console.error({lid: 1381}, ` The module [${moduleName}] is located in a non-node_modules directory.`);
        }

        entryPoint = "./" + entryPoint.substring(nodeModulesPos);

        return entryPoint;
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.info({lid: 1147}, ` Checking [${moduleName}] package.json`, e.message);
    }

    /* istanbul ignore next */
    return null;
};

const getCJSModuleEntryPath = (moduleName, targetDir = "") =>
{
    return getModuleEntryPointPath(moduleName, targetDir, TARGET.CJS);
};

const getESMModuleEntryPath = (moduleName, targetDir, target) =>
{
    return getModuleEntryPointPath(moduleName, targetDir, target);
};

// ---------------------------------------------------
// NEW STUFF
// ---------------------------------------------------

const dumpData = (converted, source, title = "") =>
{
    try
    {
        if (!DEBUG_MODE)
        {
            return;
        }
        ++dumpCounter;
        const name = path.parse(source).name;
        if (title)
        {
            title = "-" + title;
        }

        const indexCounter = dumpCounter.toString().padStart(4, "0");
        fs.writeFileSync(path.join(DEBUG_DIR, `dump-${indexCounter}-${name}-${title}.js`), converted, "utf-8");
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3001}, e.message);
    }
};

/**
 * Transform a given path following some conventions.
 * @param somePath
 * @param isFolder
 * @returns {string}
 *
 * CONVENTIONS:
 * - All folders must finish with a "/"
 * - Paths must be made of forward slashes (no backward slash)
 */
const normalisePath = (somePath, {isFolder = false} = {}) =>
{
    somePath = somePath.replace(/\\/gm, "/");
    if (isFolder)
    {
        if (!isConventionalFolder(somePath))
        {
            somePath = somePath + "/";
        }
    }

    if (path.isAbsolute(somePath))
    {
        return somePath;
    }

    const firstChar = somePath.charAt(0);
    if (!somePath)
    {
        somePath = "./";
    }
    else if (somePath === ".")
    {
        somePath = "./";
    }
    else if (!([".", "/"].includes(firstChar)))
    {
        somePath = "./" + somePath;

    }
    return somePath;
};

/**
 * Convert path like:
 * C:/a/b/c/d => /a/b/c/d
 * So, they can be created as subdirectory
 * @param wholePath
 * @returns {*|string[]}
 */
const convertToSubRootDir = (wholePath) =>
{
    wholePath = normalisePath(wholePath);
    const arr = wholePath.split("/");
    arr.shift();
    return arr.join("/");
};

/**
 * Remove part of path by subtracting a given directory from a whole path
 * @param wholePath File Path
 * @param pathToSubtract Subdirectory to remove from path
 * @returns {*}
 */
const subtractPath = (wholePath, pathToSubtract) =>
{
    let subPath, subDir;

    // Get mapped path by subtracting rootDir
    wholePath = wholePath.replace(/\\/gm, "/");
    pathToSubtract = pathToSubtract.replace(/\\/gm, "/");

    if (wholePath.length < pathToSubtract.length)
    {
        console.error({lid: 1123}, "" + "Path subtraction will not work here. " +
            "The subtracting path is bigger than the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubtract === "./")
    {
        subPath = convertToSubRootDir(wholePath);
        subDir = path.parse(subPath).dir;
        subDir = normalisePath(subDir, {isFolder: true});

        return {
            subDir, subPath
        };
    }
    else if (wholePath.indexOf(pathToSubtract) === -1)
    {
        console.error({lid: 1125}, "" + "Path subtraction will not work here. " +
            "The subtracting path is not part of the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubtract.charAt(pathToSubtract.length - 1) !== "/")
    {
        pathToSubtract = pathToSubtract + "/";
    }

    let subPaths = wholePath.split(pathToSubtract);
    subPath = subPaths[1];
    subPath = normalisePath(subPath);

    subDir = path.parse(subPath).dir;
    subDir = normalisePath(subDir);

    return {
        subDir, subPath
    };
};

/**
 * Look up for a path in the glob list
 * @param requiredPath
 * @param list
 * @returns {{}|*}
 */
const getTranslatedPath = (requiredPath, list) =>
{
    requiredPath = normalisePath(requiredPath);
    for (let i = 0; i < list.length; ++i)
    {
        const item = list[i];

        const source = normalisePath(item.source);
        if (requiredPath === source)
        {
            return item;
        }
    }
    return {};
};

const getProjectedPathAll = ({source, rootDir, outputDir}) =>
{
    try
    {
        const sourcePath = path.resolve(source);
        rootDir = path.resolve(rootDir);

        // Get mapped path by subtracting rootDir
        let {subPath, subDir} = subtractPath(sourcePath, rootDir);

        let projectedDir = path.join(outputDir, subDir);
        projectedDir = normalisePath(projectedDir);

        let projectedPath = path.join(outputDir, subPath);
        projectedPath = normalisePath(projectedPath);

        return {
            sourcePath,
            subPath,
            subDir,
            projectedPath,
            projectedDir
        };
    }
    catch (e)
    {
        console.error({lid: 1120}, "", e.message);
    }

    return {};
};

/**
 * Change the given path extension to .mjs
 * @param filepath
 * @returns {string}
 */
const changePathExtensionToESM = (filepath) =>
{
    const parsed = path.parse(filepath);
    const renamed = path.join(parsed.dir, parsed.name + ESM_EXTENSION);
    return normalisePath(renamed);
};

/**
 *
 * @param sourcePath
 * @param requiredPath
 * @param list
 * @param followlinked
 * @param outputDir
 * @returns {string}
 */
const calculateRequiredPath = ({sourcePath, requiredPath, list, followlinked, outputDir}) =>
{
    let projectedRequiredPath;

    // Projected path of required path
    const requiredPathProperties = getTranslatedPath(requiredPath, list);
    const target = requiredPathProperties.target;

    if (target)
    {
        // The relative path of the two projected paths above (projectedPath + target)
        projectedRequiredPath = calculateRelativePath(sourcePath, target);
    }
    else
    {
        if (followlinked)
        {
            const newPath = concatenatePaths(outputDir, requiredPath);
            projectedRequiredPath = calculateRelativePath(sourcePath, newPath);
        }
        else
        {
            projectedRequiredPath = calculateRelativePath(sourcePath, requiredPath);
        }
        projectedRequiredPath = changePathExtensionToESM(projectedRequiredPath);
    }

    return projectedRequiredPath;
};

/**
 * Parse imported libraries (the ones that don't have a relative or absolute path)
 * @param text
 * @param list
 * @param fileProp
 * @returns {*}
 */
const reviewEsmImports = (text, list, {
    source,
    rootDir,
    outputDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions
}) =>
{
    // Locate third party
    // const re = /\bfrom\s+["']([^.\/~@][^"']+)["'];?/gmu;
    const re = /\bfrom\s+["']([^"']+?)["'];?/gmu;

    return text.replace(re, function (match, regexRequiredPath)
    {
        try
        {
            if (~nativeModules.indexOf(regexRequiredPath))
            {
                if (moreOptions.target === TARGET.BROWSER)
                {
                    console.info({lid: 1017}, ` ${regexRequiredPath} is a built-in NodeJs module.`);
                }
                return match;
            }

            // Third party libraries
            if (!regexRequiredPath.startsWith(".") && !regexRequiredPath.startsWith("/"))
            {
                let moduleName = regexRequiredPath;
                if (nonHybridModuleMap[moduleName])
                {
                    moduleName = nonHybridModuleMap[moduleName];
                }

                // Hack
                let requiredPath;
                if (moreOptions.target === TARGET.BROWSER || moreOptions.target === TARGET.ESM)
                {
                    requiredPath = getESMModuleEntryPath(moduleName, workingDir, moreOptions.target);
                    if (!requiredPath)
                    {
                        console.warn({
                            lid  : 1099,
                            color: "#FF0000"
                        }, ` The module [${moduleName}] for [target: ${moreOptions.target}] was not found in your node_modules directory. `
                            + "Skipping.");
                        return match;
                    }

                    let isESM = isESMCompatible(requiredPath);
                    if (isESM)
                    {
                        if (moreOptions.target === TARGET.ESM)
                        {
                            return match;
                        }
                        else if (moreOptions.target === TARGET.BROWSER)
                        {
                            // Check if browser compatible
                            if (isBrowserCompatible(requiredPath))
                            {
                                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});
                                let relativePath = calculateRelativePath(projectedPath, requiredPath);

                                importMaps[moduleName] = requiredPath;

                                if (moreOptions.useImportMaps)
                                {
                                    return match;
                                }

                                if (moreOptions.prefixpath)
                                {
                                    relativePath = path.join(moreOptions.prefixpath, relativePath);
                                    relativePath = normalisePath(relativePath);
                                }

                                match = `from "${relativePath}"`;
                                return match;
                            }

                            console.warn({
                                lid  : 1101,
                                color: "yellow"
                            }, ` The file [${requiredPath}] is not browser compatible. The system will try to generate one`);

                            // If not, start conversion from the .cjs
                            requiredPath = getCJSModuleEntryPath(moduleName, workingDir);
                        }
                    }
                    else
                    {
                        console.warn({
                            lid  : 1236,
                            color: "yellow"
                        }, `The npm module '${moduleName}' does not seem to be ESM compatible.`);
                        console.warn({
                            lid  : 1238,
                            color: "yellow"
                        }, `The system will try to convert it to ESM in the local "${moreOptions.nm}" directory`);
                    }
                }
                else
                {
                    // TODO: Check if obsolete
                    requiredPath = getCJSModuleEntryPath(moduleName, workingDir);
                }

                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                let projectedRequiredPath = calculateRequiredPath(
                    {
                        sourcePath: projectedPath, requiredPath, list,
                        followlinked, workingDir, outputDir
                    });

                importMaps[moduleName] = requiredPath;

                if (followlinked)
                {
                    addFileToConvertingList({
                        source   : requiredPath,
                        rootDir  : workingDir,
                        outputDir,
                        workingDir,
                        followlinked,
                        notOnDisk: moreOptions.useImportMaps,
                        referrer : source
                    });
                }

                // importMaps[moduleName] = requiredPath;
                if (moreOptions.useImportMaps)
                {
                    //     projectedRequiredPath = moduleName;
                    //     if (requiredPath.indexOf("node_modules") > -1)
                    //     {
                    //         requiredPath = "./node_modules" + requiredPath.split("node_modules")[1];
                    //     }
                    //     importMaps[moduleName] = requiredPath;
                    //     match = `from "${moduleName}"`;
                    return match;
                }

                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            if (regexRequiredPath.startsWith("./") || regexRequiredPath.startsWith(".."))
            {
                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                // The required path from the source path above
                let requiredPath = concatenatePaths(source, regexRequiredPath);

                let projectedRequiredPath = calculateRequiredPath(
                    {
                        sourcePath: projectedPath, requiredPath, outputDir,
                        list, followlinked, workingDir
                    });

                if (followlinked)
                {
                    addFileToConvertingList({
                        source           : requiredPath,
                        rootDir          : workingDir,
                        outputDir,
                        workingDir,
                        followlinked,
                        referrer         : source,
                        multiCsjExtension: true
                    });
                }

                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            /* istanbul ignore next */
            return match;
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 1108}, "", e.message);
        }

    });

};

/**
 * Parse the string within "requires" to evaluate given paths
 * @param text
 * @param list
 * @param fileProp
 * @param workingDir
 * @returns {*}
 */
const parseImportWithRegex = (text, list, fileProp, workingDir) =>
{
    const parsedFilePath = path.join(workingDir, fileProp.source);
    const parsedFileDir = path.dirname(parsedFilePath);

    const re = /require\(["'`]([.\/][^)]+)["'`]\)/gmu;

    return text.replace(re, function (match, group)
    {
        const target = path.join(parsedFileDir, group);
        const extension = path.extname(target);

        const targets = [];
        if (!extension)
        {
            targets.push(target + ".cjs");
            targets.push(target + ".js");
        }
        else if (![".js", ".cjs"].includes(extension))
        {
            /* istanbul ignore next */
            return match;
        }
        else
        {
            targets.push(target);
        }

        const index = list.findIndex(function ({source})
        {
            const possibleFilePath = path.join(workingDir, source);
            return (targets.includes(possibleFilePath));
        });

        if (index < 0)
        {
            return match;
        }

        // current file's absolute path
        const sourcePath = path.resolve(fileProp.outputDir);

        const {source, outputDir} = list[index];
        const basename = path.parse(source).name;

        // Absolute path in the "require"
        const destinationPath = path.resolve(outputDir);

        let relativePath = path.relative(sourcePath, destinationPath);
        relativePath = path.join(relativePath, basename + ESM_EXTENSION);
        relativePath = relativePath.replace(/\\/g, "/");
        if (!([".", "/"].includes(relativePath.charAt(0))))
        {
            relativePath = "./" + relativePath;
        }

        return match.replace(group, relativePath);
    });
};

/**
 * Rename variables declared as exports
 * @example
 * let exports = ...
 * @param converted
 * @param ambiguousList
 * @returns {*}
 */
const convertAmbiguous = (converted, ambiguousList) =>
{
    const n = ambiguousList.length;
    let extract = "";
    for (let i = n - 1; i >= 0; --i)
    {
        let ambiguous = ambiguousList[i];
        let block = ambiguous.block;

        let start = block.start;
        let end = block.end;

        extract = converted.substring(start, end);

        for (let ii = 0; ii < AMBIGUOUS.length; ++ii)
        {
            let ambiguousWord = AMBIGUOUS[ii];
            let search = ambiguousWord.search;
            let replace = ambiguousWord.replace;
            extract = extract.replace(search, replace);
        }

        converted = converted.substring(0, start) + extract + converted.substring(end);

    }

    return converted;
};

/**
 * Put back original naming for ambiguous declarations
 * like
 * let exports = ...
 * @param converted
 * @returns {*}
 */
const putBackAmbiguous = (converted) =>
{
    const n = AMBIGUOUS.length;
    for (let i = 0; i < n; ++i)
    {
        let ambiguousWord = AMBIGUOUS[i];
        let search = ambiguousWord.replace;
        let replace = ambiguousWord.original;
        converted = converted.replaceAll(search, replace);
    }

    return converted;
};

const removeShebang = (converted) =>
{
    const firstLine = converted.split("\n")[0];
    if (/^(?:\/\/ *)?#!.+/.test(firstLine))
    {
        strSheBang = firstLine.trim();
        converted = converted.substring(strSheBang.length).trim();
    }
    return converted;
};

const restoreShebang = (converted) =>
{
    if (strSheBang)
    {
        converted = strSheBang + EOL + converted;
    }

    strSheBang = "";
    return converted;
};

/**
 * Will not work if a variable is named "exports"
 * @param converted
 * @param source
 * @returns {*}
 */
const convertModuleExportsToExport = (converted, source) =>
{
    converted = hideKeyElementCode(converted, source);

    converted = converted.replace(/\bexports\b\s*=\s*module.exports\s*=/, "module.exports =");
    converted = converted.replace(/\bmodule\.exports\b\s*=\s*exports\s*=/, "module.exports =");

    converted = converted.replace(
        /\b(const|let|var|class|function\s*\*)\s+\b(\w+)\b([\s\S]*?)(\bmodule\b\.)?\bexports\b\.\2\s*=\s*\2.*/gm,
        "export $1 $2 $3");

    let converted0;
    do
    {
        converted0 = converted;
        // Convert module.exports.something ... function something
        // to import something
        converted = converted.replaceAll(
            /\b(?:\bmodule\b\.)?\bexports\b\.([\w]+)\s*=\s*\1.*([\s\S]*)(\bfunction\s*\*?\1)/sgm,
            "$2 export $3");
    }
    while (converted !== converted0);

    // Convert module.exports to export default
    converted = converted.replace(/(?:\bmodule\b\.)?\bexports\b\s*=/gm, "export default");

    // Convert module.exports.default to export default
    converted = converted.replace(/(?:\bmodule\b\.)?\bexports\b\.default\s*=/gm, "export default");

    // Convert module.exports.something to export something
    converted = converted.replace(/(?:\bmodule\b\.)?\bexports\b\.([\w]+)\s*=/gm, "export const $1 =");

    const defaultExportNumber = converted.split("export default").length - 1;
    if (defaultExportNumber > 1)
    {
        console.log({lid: 1207, color: "yellow"}, `${defaultExportNumber} default exports detected`);
        console.log({lid: 1209, color: "yellow"}, "Assure that you have only one export (or none) of type " +
            `"module.exports = ..."` +
            " and use named export if possible => i.e. \"module.exports.myValue = ...\"");
    }

    converted = restoreKeyElementCode(converted);

    return converted;
};

const convertJsonImportToVars = (converted, {
    source
}) =>
{
    const matchData = converted.matchAll(/(?:const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*require\(['"]([^)]+.json)[^)]\)/g);
    const matches = [...matchData];
    const found = Array.from(matches, m => m[0]);
    const identifiers = Array.from(matches, m => m[1]);
    const files = Array.from(matches, m => m[2]);

    const n = identifiers.length;
    for (let i = 0; i < n; ++i)
    {
        const identifier = identifiers[i].trim();
        const filepath = files[i];
        let absPath = path.resolve(source);
        let jsonPath = concatenatePaths(absPath, filepath);
        if (!fs.existsSync(jsonPath))
        {
            continue;
        }

        const jsonContent = fs.readFileSync(jsonPath, "utf-8");
        const json = JSON.parse(jsonContent.toString());
        if (Array.isArray(json))
        {
            continue;
        }

        const newObject = {};
        for (let k in json)
        {
            const search1 = `${identifier}.${k}`;
            if (converted.indexOf(search1) > -1)
            {
                newObject[k] = json[k];
            }

            const search2 = `${identifier}["${k}"]`;
            if (converted.indexOf(search2) > -1)
            {
                newObject[k] = json[k];
            }
        }

        converted = converted.replace(found, `let ${identifier} = ${JSON.stringify(newObject, null, 2)}`);
    }

    return converted;
};

/**
 * Parse the given test and use regex to transform requires into imports.
 * @note This function is used with both parser (AST or Regex)
 * When use via AST, the transformation is applied by line.
 * When use with the regex fallback, the transformation is done on the whole source.
 * @param converted
 * @returns {*}
 */
const convertRequiresToImport = (converted) =>
{
    converted = stripCodeComments(converted);

    // convert require with .json file to import
    converted = converted.replace(/(?:const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*require\(([^)]+.json[^)])\)/gm, "import $1 from $2 assert {type: \"json\"}");

    // convert require with .js or .cjs extension to import
    converted = converted.replace(/(?:const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*require\(([^)]+\.c?js)([^)])\)/gm, "import $1" +
        " from" +
        " $2$3");

    // convert require without extension to import without extension
    converted = converted.replace(/(?:const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*require\(["'`]([./\\][^"'`]+)["'`]\)/gm, "import $1 from \"$2\"");

    // convert require with non-relative path to import (Third Party libraries)
    converted = converted.replace(/(?:const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*require\(["'`]([^"'`]+)["'`]\)/gm, "import $1 from \"$2\"");

    return converted;
};

const stripMasked = (str, limit, {
    COMMENT_MASK_START = COMMENT_MASK,
    COMMENT_MASK_END = COMMENT_MASK
} = {}) =>
{
    for (let i = 0; i < limit; ++i)
    {
        const maskedComment = COMMENT_MASK_START + i + COMMENT_MASK_END;
        str = str.replace(maskedComment, "");
    }

    return str;
};

/**
 *
 * @param converted
 * @param source Only for debuggin
 * @returns {*}
 */
const convertComplexRequiresToSimpleRequires = (converted, source = "") =>
{
    try
    {
        const extractedComments = [];
        converted = stripCodeComments(converted, extractedComments, commentMasks);
        dumpData(converted, source, "stripCodeComments");

        const extractedStrings = [];
        converted = stripCodeStrings(converted, extractedStrings);
        dumpData(converted, source, "stripCodeStrings");

        // Introduce temporary variables (_toesm) for tricky require
        converted = beforeReplace(/(const|let|var|class|function\s*\*?)\s+([^=]+)\s*=\s*(require\(["'`]([^"'`]+)["'`]\))(.+);?/g, converted, function (found, wholeText, index, match)
        {
            if (match.length < 6)
            {
                return match[0];
            }

            if (match[5].trim() === ";")
            {
                return match[0];
            }

            let unmasked = stripMasked(match[5], extractedComments.length, commentMasks);
            if (unmasked.trim() === ";")
            {
                return match[0];
            }

            let intermediaryVariableName = "_toesmTemp" + indexGeneratedTempVariable++;

            const line1 = `let ${intermediaryVariableName} = ${match[3]};`;
            const line2 = `${match[1]} ${match[2]} = ${intermediaryVariableName}${match[5]}`;
            return line1 + EOL + line2 + EOL;
        });
        dumpData(converted, source, "add-extra-toesm-variable-for-tricky-requires");

        converted = putBackStrings(converted, extractedStrings);
        dumpData(converted, source, "putBackStrings");

        commentMasks.source = source;
        converted = putBackComments(converted, extractedComments, commentMasks);
        dumpData(converted, source, "putBackComments");

        return converted;
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1203}, "", e.message);
    }
};

/**
 * An import is a declaration + assignment, so we need to remove cjs
 * declarations that were not combined in the same line.
 * TODO: Needs optimisation
 * @param converted
 * @param extracted
 */
const removeDeclarationForAST = (converted, extracted) =>
{
    let regexp;
    for (let i = 0; i < extracted.length; ++i)
    {
        const prop = extracted[i];
        if (!prop.declareNotOnTheSameLine)
        {
            continue;
        }

        const identifier = prop.identifier;

        // Replace declaration of type `let something =`
        regexp = new RegExp(`(var|let|const)\\s+(${identifier}\\s+=)`);
        converted = converted.replace(regexp, "$2");

        // Remove declaration of type `let something, something2;`
        regexp = new RegExp(`(var|let|const)\\s+(${identifier}\\s*\,)`);
        converted = converted.replace(regexp, "$1");

        // Remove declaration of type `let something2, something`
        regexp = new RegExp(`(var|let|const)(.*)\\,\\s*${identifier}`);
        converted = converted.replace(regexp, "$1$2");

        // Remove declaration of type `log something;`
        regexp = new RegExp(`(?:var|let|const)\\s+${identifier}\\s*[;]`);
        converted = converted.replace(regexp, "");
    }

    return converted;
};


/**
 * Convert "requires" to imports and move them to the top of the file.
 * @param converted
 * @param extracted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @returns {string|*}
 * @private
 */
const applyExtractedASTToImports = (converted, extracted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions
}) =>
{
    try
    {
        if (!extracted.length)
        {
            return converted;
        }

        const importList = new Set();
        for (let i = extracted.length - 1; i >= 0; --i)
        {
            const prop = extracted[i];
            try
            {
                if (prop.declareNotOnTheSameLine)
                {
                    prop.text = "let " + prop.text;
                }

                let transformedLines = stripCodeComments(prop.text);
                transformedLines = convertRequiresToImport(transformedLines);

                const valid = validateSyntax(transformedLines, "module");
                if (!valid)
                {
                    continue;
                }

                transformedLines = reviewEsmImports(transformedLines, list,
                    {
                        source, outputDir, rootDir, importMaps,
                        nonHybridModuleMap, workingDir, followlinked, moreOptions
                    });

                transformedLines = transformedLines.trim();
                if (transformedLines.charAt(transformedLines.length - 1) !== ";")
                {
                    transformedLines = transformedLines + ";";
                }
                importList.add(transformedLines);
                converted = converted.substring(0, prop.start) + converted.substring(prop.end);
            }
            catch (e)
            {
                /* istanbul ignore next */
                console.error({lid: 1006}, "", e.message);
            }
        }

        let imports = [...importList].reverse().join(EOL) + ";";
        imports = imports.substring(0, imports.length - 1);
        if (converted.startsWith(";"))
        {
            converted = converted.substring(1);
        }
        if (!(converted.startsWith(EOL)))
        {
            converted = EOL + converted;
        }

        imports = IMPORT_MASK_START + imports + IMPORT_MASK_END;
        converted = imports + converted;
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1007}, "", e.message);
    }

    return converted;
};

/**
 * Given an identifier detected by AST, returns the block it belongs to.
 * @param identifier
 * @param previouses
 * @returns {*|null|string|boolean|null}
 */
const findNearestBlock = (identifier, previouses) =>
{
    const n = previouses.length;
    for (let i = n - 1; i >= 0; --i)
    {
        const previous = previouses[i].node;
        if ("BlockStatement" === previous.type && identifier.start >= previous.start && identifier.end <= previous.end)
        {
            return previous;
        }
    }

    /* istanbul ignore next */
    return null;
};

/**
 * Extract information related to cjs imports and use them to do the transformation.
 * @param converted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @param debuginput
 * @returns {{converted, success: boolean}}
 */
const convertRequiresToImportsWithAST = (converted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions,
    debuginput
}) =>
{
    let success = true;
    const detectedExported = [];
    const detectedAmbiguous = [];
    const detectedBlockFunctions = [];

    try
    {
        const extracted = [];

        let ast;
        try
        {
            ast = espree.parse(
                converted, {
                    sourceType   : "commonjs",
                    ecmaVersion  : "latest",
                    allowReserved: false,
                    loc          : true,
                    range        : true,
                    tokens       : true,
                    comment      : true
                }
            );
        }
        catch (e)
        {
            console.warn({lid: 1052}, ` WARNING: Syntax issues found on [${source}]`);
            console.error({lid: 1208}, " ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ", e.message);
            return {converted, success: false};
        }

        let text, start, end, requirePath, identifier;

        const previouses = [];

        let writeStream;
        let readable;

        if (debuginput)
        {
            const debugPath = path.join(DEBUG_DIR, source + ".json");
            buildTargetDir(path.parse(debugPath).dir);
            writeStream = fs.createWriteStream(debugPath);
            readable = Readable.from([""]);
            readable.pipe(writeStream);
        }


        estraverse.traverse(ast, {
            enter: function (node, parent)
            {
                try
                {
                    if (debuginput)
                    {
                        const myText = JSON.stringify(node, null, 2);
                        readable.push(myText);
                    }

                    if ("FunctionDeclaration" === node.type || "FunctionExpression" === node.type || "ArrowFunctionExpression" === node.type || "MethodDefinition" === node.type)
                    {
                        detectedBlockFunctions.push({
                            node
                        });
                    }

                    // Look for: let exports, let modules,
                    if ("VariableDeclarator" === node.type)
                    {
                        let identifier = node.id;
                        if (identifier.type === "Identifier" && AMBIGUOUS_VAR_NAMES.includes(identifier.name))
                        {
                            let nearestBlock = findNearestBlock(identifier, previouses);
                            if (nearestBlock)
                            {
                                detectedAmbiguous.push({
                                    identifier, block: nearestBlock
                                });
                            }
                        }
                    }

                    if (node.type === "Identifier" && node.name === "exports")
                    {
                        if (parent && parent.type === "MemberExpression")
                        {
                        }
                    }

                    const lastFound = extracted[extracted.length - 1];
                    if (lastFound)
                    {
                        if (!lastFound.wholeLine)
                        {
                            lastFound.wholeLine = true;
                            lastFound.end = node.range[0] - 1;
                            lastFound.text = converted.substring(lastFound.start, lastFound.end);
                        }
                    }

                    // Look for: require(...)
                    if (node && "Literal" === node.type)
                    {
                        if (parent && parent.type === "CallExpression" && parent.callee && parent.callee.name === "require")
                        {
                            requirePath = node.value;
                            end = parent.range[0];

                            for (let i = previouses.length - 2; i >= 0; --i)
                            {
                                let previous = previouses[i];

                                // Declaration without "kind" (const, let, var...)
                                if (previous.parent.type === "AssignmentExpression")
                                {
                                    if (previous.parent.left && previous.parent.left.type === "Identifier")
                                    {
                                        identifier = previous.parent.left.name;
                                    }
                                }

                                if (previous.parent.type === "AssignmentExpression" || previous.parent.kind === "const" || previous.parent.kind === "var" || previous.parent.kind === "let")
                                {
                                    previous = previouses[i];
                                    start = previous.parent.range[0];
                                    break;
                                }
                            }

                        }
                    }

                    /**
                     * NOTE: As much as I wanted to avoid using optional chaining, this is getting annoying not to
                     * use them in this logic.
                     */
                    if (parent?.type === "ExpressionStatement" && node?.left?.object?.name === "exports" && node?.left?.property?.name && node?.right?.name)
                    {
                        const namedExport = node.left.property.name;
                        const funcname = node.right.name;

                        detectedExported.push({
                            namedExport, funcname, source
                        });
                    }

                    if (parent?.type === "MemberExpression" && parent?.object?.property?.name === "exports" && parent?.property?.name)
                    {
                        const namedExport = parent.property.name;

                        detectedExported.push({
                            namedExport, source
                        });
                    }

                    // Look for: exports
                    if (parent?.expression?.left?.object?.property?.name === "exports" && parent?.expression?.left?.type === "MemberExpression" && parent?.expression?.right?.name)
                    {
                        const namedExport = parent.expression.left.property.name;
                        const funcname = parent.expression.right.name;

                        detectedExported.push({
                            namedExport, funcname, source
                        });
                    }

                    previouses.push({
                        parent,
                        node
                    });
                }
                catch (e)
                {
                    /* istanbul ignore next */
                    console.error({lid: 1008}, e.message);
                }
            },
            leave: function (node, parent)
            {
                try
                {
                    if (end > 0)
                    {
                        end = parent.range[1];
                        text = converted.substring(start, end);

                        const textTrimmed = text.trim();

                        const info = {
                            start, end, text, requirePath, source, identifier
                        };

                        if (!(textTrimmed.indexOf("const") === 0 || textTrimmed.indexOf("let") === 0 || textTrimmed.indexOf("var") === 0))
                        {
                            info.declareNotOnTheSameLine = true;
                        }

                        extracted.push(info);

                        requirePath = null;
                        start = 0;
                        end = 0;
                    }

                }
                catch (e)
                {
                    /* istanbul ignore next */
                    console.error({lid: 1057}, "", e.message);
                }
            }
        });

        if (detectedAmbiguous.length)
        {
            converted = convertAmbiguous(converted, detectedAmbiguous);
        }

        converted = applyExtractedASTToImports(converted, extracted, list, {
            source,
            outputDir,
            rootDir,
            importMaps,
            nonHybridModuleMap,
            workingDir,
            followlinked,
            moreOptions
        });
        converted = removeDeclarationForAST(converted, extracted);
        return {converted, success, detectedExported, detectedAmbiguous, detectedBlockFunctions};
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1009}, ` [${source}] ->`, e.message);
    }

    return {converted, success: false, detectedExported, detectedAmbiguous, detectedBlockFunctions};
};

/**
 * Remove comments from code
 * @param code
 * @param {[]} extracted If not null, comments are replaced instead of removed.
 * @param COMMENT_MASK_START
 * @param COMMENT_MASK_END
 * @returns {*}
 */
const stripCodeComments = (code, extracted = null, {
    COMMENT_MASK_START = COMMENT_MASK,
    COMMENT_MASK_END = COMMENT_MASK
} = {}) =>
{
    const commentProps = parseString(code).comments;

    if (!commentProps.length)
    {
        return code;
    }

    let commentIndexer = 0;
    for (let i = commentProps.length - 1; i >= 0; --i)
    {
        const commentProp = commentProps[i];
        const indexCommentStart = commentProp.index;
        const indexCommentEnd = commentProp.indexEnd;
        if (!extracted)
        {
            code = code.substring(0, indexCommentStart) + code.substring(indexCommentEnd);
            continue;
        }

        extracted[commentIndexer] = code.substring(indexCommentStart, indexCommentEnd);
        code =
            code.substring(0, indexCommentStart) +
            COMMENT_MASK_START + commentIndexer + COMMENT_MASK_END +
            code.substring(indexCommentEnd);

        ++commentIndexer;
    }

    return code;
};

const escapeDollar = (text) =>
{
    return text.split("$").join("$$");
};

const putBackComments = (str, extracted, {
    COMMENT_MASK_START = COMMENT_MASK,
    COMMENT_MASK_END = COMMENT_MASK
} = {}) =>
{
    if (!extracted.length)
    {
        return str;
    }

    for (let i = 0; i < extracted.length; ++i)
    {
        let escaped = escapeDollar(extracted[i]);
        str = str.replace(COMMENT_MASK_START + i + COMMENT_MASK_END, escaped);
    }

    return str;
};

/**
 * Remove comments from code
 * @param code
 * @param {[]} extracted If not null, comments are replaced instead of removed.
 * @returns {*}
 */
const stripCodeStrings = (code, extracted = []) =>
{
    let index = -1;
    code = stripStrings(code, function (info)
    {
        ++index;
        extracted[index] = info.content;
        return STRING_MASK_START + index + STRING_MASK_END;
    }, {includeDelimiter: false});

    return code;
};

const stripCodeRegexes = (code, extracted = []) =>
{
    let index = -1;
    code = stripRegexes(code, function (info)
    {
        ++index;
        extracted[index] = info.content;
        return REGEX_MASK_START + index + REGEX_MASK_END;
    }, {includeDelimiter: false});

    return code;
};

const putBackStrings = (str, extracted) =>
{
    for (let i = 0; i < extracted.length; ++i)
    {
        let mask = STRING_MASK_START + i + STRING_MASK_END;
        str = str.replace(mask, extracted[i]);
    }

    return str;
};

const putBackRegexes = (str, extracted) =>
{
    for (let i = 0; i < extracted.length; ++i)
    {
        let mask = REGEX_MASK_START + i + REGEX_MASK_END;
        str = str.replace(mask, extracted[i]);
    }

    return str;
};

/**
 * Apply command found in source code comments
 * @param converted
 * @param target
 * @param saved
 */
const applyDirectives = (converted, {target = "all"} = {}) =>
{
    let regexp;

    const targets = target === "all" ? ["browser", "esm", "all"] : [target, "all"];

    targets.forEach((target) =>
    {
        // Remove => to-esm-browser: remove
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*remove\\s*\\*\\*\\/[\\s\\S]*?\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*end-remove\\s*\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");

        // Insert => to-esm-browser: add
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*add\\s*([\\s\\S]*?)\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "$1");

        // Hide/skip => to-esm-browser: skip
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*skip\\s*\\*\\*\\/([\\s\\S]*?)\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*end-skip\\s*\\*\\*\\/`, "gm");
        converted = hideText(regexp, converted);
    });

    return converted;
};


/**
 * Generate an object describing a file to convert
 * @param source
 * @param rootDir
 * @param outputDir
 * @param workingDir
 * @returns {{outputDir: string, targetAbs: *, sourceAbs: string, subDir: *, sourceNoExt: string, rootDir, source:
 *     string, subPath: *, target: string}}
 */
const formatConvertItem = ({source, rootDir, outputDir, workingDir}) =>
{
    try
    {
        let sourceAbs = path.join(workingDir, source);
        sourceAbs = normalisePath(sourceAbs);

        rootDir = normalisePath(rootDir);
        let {subPath, subDir} = subtractPath(sourceAbs, rootDir);

        let targetName = path.parse(subPath).name + ESM_EXTENSION;

        let target = path.join(outputDir, subDir, targetName);
        target = normalisePath(target);

        let targetAbs = path.join(workingDir, target);

        let extra = path.parse(source);
        let sourceNoExt = path.join(extra.dir, extra.name);
        sourceNoExt = normalisePath(sourceNoExt);

        source = normalisePath(source);

        outputDir = normalisePath(outputDir, {isFolder: true});

        let id = require("crypto")
            .createHash("sha256")
            .update(source)
            .digest("hex");

        return {
            source,
            sourceAbs,
            sourceNoExt,
            outputDir,
            rootDir,
            subPath,
            subDir,
            target,
            targetAbs,
            id,
            weight: 1
        };
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1011}, "", e.message);
    }
};

const hasImportmap = (content) =>
{
    const regex = /<script.+importmap.+>([\s\S]+?)<\/script>/gm;
    let match;
    match = regex.exec(content);
    return match && match.length;
};

const getImportMapFromPage = (fullHtmlPath) =>
{
    let content = fs.readFileSync(fullHtmlPath, "utf-8");

    const regex = /<script.+importmap.+>([\s\S]+?)<\/script>/gm;

    let match;
    match = regex.exec(content);
    if (!match || !match.length)
    {
        return {};
    }

    let rawImportMap = match[1].trim();

    try
    {
        return JSON.parse(rawImportMap);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1231}, "", e.message);
    }

    return {};
};

/**
 * Merge importmap from html page, importmap from parsing and importmap from configfile
 * @param newMaps
 * @param importMaps
 * @returns {{imports: any}}
 */
const combineImportMaps = (newMaps, importMaps) =>
{
    let result = Object.assign({}, newMaps.imports, importMaps);
    return {imports: result};
};

const rewriteImportMapPaths = (newMaps, htmlPath) =>
{
    for (let kk in newMaps.imports)
    {
        try
        {
            const root = path.relative(htmlPath, "./");
            const jsPath = path.join(root, newMaps.imports[kk]);
            newMaps.imports[kk] = normalisePath(jsPath);
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 1205}, "", e.message);
        }
    }

    return newMaps;
};

const applyReplaceToImportMap = (newMaps, htmlOptions) =>
{
    if (!htmlOptions.importmapReplace || !htmlOptions.importmapReplace.length)
    {
        return newMaps;
    }

    regexifySearchList(htmlOptions.importmapReplace);

    for (let kk in newMaps.imports)
    {
        try
        {
            newMaps.imports[kk] = applyReplaceFromConfig(newMaps[kk], htmlOptions.importmapReplace);
        }
        catch (e)
        {
            console.error({lid: 1205}, "", e.message);
        }
    }

    return newMaps;
};

const writeImportMapToHTML = (newMaps, fullHtmlPath) =>
{
    let content = fs.readFileSync(fullHtmlPath, "utf-8");
    const scriptMap = normaliseString(JSON.stringify(newMaps, null, 4));

    if (hasImportmap(content))
    {
        content = content.replace(/(<script.+importmap.+>)([\s\S]+?)(<\/script>)/gm, `$1${scriptMap}$3`);
    }
    else
    {
        const ins = `<script type="importmap">
    ${scriptMap}
</script>
`;
        content = content.replace(/(<head.*?>)/gm, `$1${EOL}${ins}`);
    }

    fs.writeFileSync(fullHtmlPath, content, "utf-8");
    return newMaps;
};

/**
 * Insert importmaps into the passed html file
 * @param fullHtmlPath
 * @param htmlPath
 * @param importMaps
 */
const parseHTMLFile = (htmlPath, {importMaps = {}, htmlOptions = {}}) =>
{
    try
    {
        let fullHtmlPath = path.resolve(htmlPath);
        /* istanbul ignore next */
        if (!fs.existsSync(fullHtmlPath))
        {
            console.error({lid: 1081}, ` Could not find HTML file at [${fullHtmlPath}]`);
            return;
        }

        // Get merged version of importmap from html page and importmap from parsing
        let newMaps = getImportMapFromPage(fullHtmlPath);

        newMaps = combineImportMaps(newMaps, importMaps);

        newMaps = rewriteImportMapPaths(newMaps, htmlPath);

        newMaps = applyReplaceToImportMap(newMaps, htmlOptions);

        newMaps = combineImportMaps(newMaps, htmlOptions.importmap);

        writeImportMapToHTML(newMaps, fullHtmlPath);

        console.log({lid: 1080}, `"${fullHtmlPath}" has been successfully updated`);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1093}, e.message);
    }

};

/**
 * Browse and update all specified html files with importmaps
 * @param list
 * @param importMaps
 * @param confFileOptions
 * @param moreOptions
 * @param htmlOptions
 */
const updateHTMLFiles = (list, {importMaps = {}, confFileOptions = {}, moreOptions = {}, htmlOptions = {}}) =>
{
    list.forEach((html) =>
    {
        console.log({lid: 1200}, `Processing [${html}] for importing maps.`);
        parseHTMLFile(html, {importMaps, confFileOptions, moreOptions, htmlOptions});
    });
};

/**
 * Fallback conversion when parsing fails.
 * @param converted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @param nonHybridModuleMap
 * @returns {*}
 */
const convertToESMWithRegex = (converted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    workingDir,
    followlinked,
    moreOptions,
    nonHybridModuleMap
} = {}) =>
{
    try
    {
        const extractedComments = [];

        converted = stripCodeComments(converted, extractedComments);
        dumpData(converted, source, "stripCodeComments");

        converted = parseImportWithRegex(converted, list, {source, outputDir, rootDir}, workingDir);
        dumpData(converted, source, "parseImportWithRegex");

        converted = convertNonTrivial(converted, source);
        dumpData(converted, source, "convertNonTrivial");

        converted = convertModuleExportsToExport(converted, source);
        dumpData(converted, source, "convertModuleExportsToExport");

        converted = convertJsonImportToVars(converted, {source});
        dumpData(converted, source, "convertJsonImportToVars");

        converted = convertRequiresToImport(converted);
        dumpData(converted, source, "convertRequiresToImport");

        converted = reviewEsmImports(converted, list,
            {
                source, outputDir, rootDir,
                importMaps, workingDir, followlinked, moreOptions, nonHybridModuleMap
            });
        dumpData(converted, source, "reviewEsmImports");

        converted = putBackComments(converted, extractedComments);
        dumpData(converted, source, "putBackComments");
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1012}, "", e.message);
    }
    return converted;
};

const getOptionsConfigFile = async (configPath) =>
{
    let confFileOptions = {};

    configPath = path.resolve(configPath);
    if (fs.existsSync(configPath))
    {
        const extension = path.parse(configPath).ext;

        if ([".js", ".cjs"].includes(extension))
        {
            /* istanbul ignore next */
            confFileOptions = require(configPath);
        }
        else if ([".mjs"].includes(extension))
        {
            const {default: options} = await import(configPath);
            confFileOptions = options;
        }
        else
        {
            const contents = fs.readFileSync(configPath, {encoding: "utf8"});
            try
            {
                confFileOptions = JSON.parse(contents.toString());
            }
            catch (e)
            {
                /* istanbul ignore next */
                console.error({lid: 1013}, " Skipping config file options", e.message);
            }
        }
    }

    return confFileOptions;
};

/**
 * Parse "replace" entry list given by the user.
 * Convert all search entries into their Regex equivalent.
 * @param replace
 * @returns {*[]}
 */
const regexifySearchList = (replace = []) =>
{
    replace.forEach((item) =>
    {
        if (item.search instanceof RegExp)
        {
            item.regex = true;
        }
        else if (item.regex)
        {
            item.search = new RegExp(item.search);
        }
    });

    return replace || [];
};

const getLibraryInfo = (modulePackname) =>
{
    const info = {
        installed: false
    };
    try
    {
        const installed = require.resolve(modulePackname);
        if (installed)
        {
            info.installed = true;

            const dir = path.parse(installed).dir;
            const packageJsonPath = path.join(dir, "package.json");
            const packageJson = require(packageJsonPath);
            info.version = packageJson.version;
        }

    }
    catch (e)
    {

    }
    return info;
};
/* istanbul ignore next */

/**
 * Install npm packages on the users project.
 * Ignore for the tests as it requires some End to End testing.
 * @param name
 * @param version
 * @param isDevDependencies
 * @param moduleName
 * @param isCjs
 * @param packageJson
 */
const installPackage =
    ({name, version, isDevDependencies, moduleName, isCjs} = {}) =>
    {
        try
        {
            const info = getLibraryInfo(name);
            if (info.installed && (version.split(info.version).length === 1 || version.split(info.version).length === 2))
            {
                return;
            }

            if (info.installed && info.version.indexOf("latest") > -1)
            {
                return;
            }
        }
        catch (e)
        {

        }

        const devOption = isDevDependencies ? " -D" : "";

        const child_process = require("child_process");

        const environment = isCjs ? "CommonJs modules" : "ES Modules";

        console.info({lid: 1142}, `Installing (${environment}) package [${moduleName}${version}] as [${name}]`);
        child_process.execSync(`npm install ${name}@npm:${moduleName}${version} ${devOption}`, {stdio: []});
        console.info({lid: 1142}, "✔ Success");
    };

/**
 * When defined in the config file, install a specific module version for commonjs
 * and a specific module version for ESM.
 * We do this to be able to keep working with both CJS and ESM.
 * The cjs working code will point to the cjs package and after applying the transformation,
 * the converted code (ESM) will know where to point at to solve the location of
 * a particular library.
 * It is specially useful for the importmaps.
 * @note Some libraries only supports ESM on their latest version.
 * @param config
 * @returns {Promise<{}|null>}
 */
const installNonHybridModules = async (config = []) =>
{
    try
    {
        const replaceModules = config.replaceModules || [];

        let packageJsonPath = path.resolve("./package.json");
        /* istanbul ignore next */
        if (!fs.existsSync(packageJsonPath))
        {
            console.error({lid: 1014}, " Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.");
            return null;
        }

        // const toEsmPackageJson = require(packageJsonPath);
        const moduleList = Object.keys(replaceModules);

        const nonHybridModules = {};

        if (!moduleList || !moduleList.length)
        {
            return null;
        }

        for (const moduleName of moduleList)
        {
            try
            {
                const moduleItem = replaceModules[moduleName];

                moduleItem.cjs = moduleItem.cjs || {};
                moduleItem.esm = moduleItem.esm || {};

                let version = moduleItem.cjs.version || "@latest";
                let cjsName = moduleItem.cjs.name || moduleName;
                let isDevDependencies = !!moduleItem.cjs.devDependencies;

                // Install cjs package
                installPackage({
                    version,
                    name       : cjsName,
                    isDevDependencies,
                    moduleName,
                    isCjs      : true,
                    packageJson: toEsmPackageJson
                });

                version = moduleItem.esm.version || "@latest";
                let esmName = moduleItem.esm.name || moduleName;
                isDevDependencies = !!moduleItem.esm.devDependencies;

                // Install esm package
                installPackage({
                    version,
                    name       : esmName,
                    isDevDependencies,
                    moduleName,
                    isCjs      : false,
                    packageJson: toEsmPackageJson
                });

                nonHybridModules[cjsName] = esmName;
                return nonHybridModules;
            }
            catch (e)
            {
                /* istanbul ignore next */
                console.error({lid: 1015}, "", e.message);
            }
        }

        return null;
    }
    catch (e)
    {
        console.error({lid: 1535}, e);
    }

    return null;
};


const parseEsm = (filepath, content, {
    range = false,
    loc = false,
    comment = false,
    tokens = false,
    ecmaVersion = "latest",
    allowReserved = false,
    sourceType = "module",
    ecmaFeatures = {
        jsx          : false,
        globalReturn : false,
        impliedStrict: false
    }
} = {}) =>
{
    try
    {
        const parserOtions = {
            range,
            loc,
            comment,
            tokens,
            ecmaVersion,
            allowReserved,
            sourceType,
            ecmaFeatures
        };
        content = content || fs.readFileSync(filepath, "utf-8");

        espree.parse(content, parserOtions);
    }
    catch (error)
    {
        return {success: false, error};
    }

    return {success: true};
};

/**
 * Check whether a file is CommonJs
 * @param filepath
 * @param content
 * @returns {boolean}
 */
const isCjsCompatible = (filepath, content = "") =>
{
    try
    {
        const extension = path.extname(filepath);
        if (".mjs" === extension)
        {
            return false;
        }

        content = content || fs.readFileSync(filepath, "utf-8");
        content = stripComments(content);
        content = clearStrings(content);
        content = stripRegexes(content);

        if (/\bimport\b[\s\S]*?\bfrom\b/gm.test(content) || /\bexport\b\s+\bdefault\b/gm.test(content))
        {
            return false;
        }

        if (/\brequire\b\s*\(/gm.test(content) || /(?:module\.)?\bexports\b\.?/gm.test(content))
        {
            return true;
        }

        return !/\bexport\b\s+/gm.test(content);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1137}, e);
    }

    /* istanbul ignore next */
    return false;
};

const isESMCompatible = (filepath, content = "") =>
{
    try
    {
        const extension = path.extname(filepath);
        if (".cjs" === extension)
        {
            return false;
        }

        content = content || fs.readFileSync(filepath, "utf-8");
        return !isCjsCompatible(filepath, content);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1141}, e);
    }

    /* istanbul ignore next */
    return false;
};

const isBrowserCompatible = (filepath, content = "") =>
{
    try
    {
        content = content || fs.readFileSync(filepath, "utf-8");
        if (!isESMCompatible(filepath, content))
        {
            return false;
        }

        espree.parse(
            content, {
                sourceType : "module",
                ecmaVersion: "latest",
            }
        );

        content = stripComments(content);
        content = clearStrings(content);
        content = stripRegexes(content);

        const regexp = new RegExp(`\\bfrom\\b.+\\b(${nativeModules.join("|")})\\b`);
        const hasCore = regexp.test(content);
        return !hasCore;
    }
    catch (e)
    {
        // console.error({lid: 1139}, e);
    }

    /* istanbul ignore next */
    return false;
};

const findEntry = (source, propertyName = "source") =>
{
    if (!source)
    {
        return null;
    }

    const n = cjsList.length;
    for (let i = 0; i < n; ++i)
    {
        const item = cjsList[i] || {};
        if (item[propertyName] === source)
        {
            return item;
        }
    }
    return null;
};

/**
 * Add a file to the list of files to parse.
 * @param source
 * @param rootDir
 * @param outputDir
 * @param workingDir
 * @param notOnDisk
 * @param referrer
 * @param entryPoint
 * @param multiCsjExtension
 * @returns {{outputDir: string, targetAbs: *, sourceAbs: string, subDir: *, sourceNoExt: string, rootDir, source:
 *     string, subPath: *, target: string}|{boolean}}
 */
const addFileToConvertingList = ({
                                     source,
                                     rootDir,
                                     outputDir,
                                     workingDir,
                                     notOnDisk,
                                     referrer = null,
                                     entryPoint = false,
                                     multiCsjExtension = false
                                 }) =>
{
    if (!fs.existsSync(source))
    {
        if (!multiCsjExtension)
        {
            console.error({lid: 1141}, ` Could not find the file [${source}]`);
            return false;
        }

        const extension = path.parse(source).extname;
        if (extension)
        {
            /* istanbul ignore next */
            console.error({lid: 1143}, ` Could not find the file [${source}]`);
            /* istanbul ignore next */
            return false;
        }

        let found = false;
        let foundPath = "";
        let possibleCjsExtensions = [".js", ".json", ".node"];
        for (let i = 0; i < possibleCjsExtensions.length; ++i)
        {
            const extension = possibleCjsExtensions[i];
            foundPath = path.join(source + extension);
            if (fs.existsSync(foundPath))
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            console.error({lid: 1145}, ` Could not find the file [${source}]`);
            return false;
        }

        source = normalisePath(foundPath);
    }

    const entryReferer = findEntry(referrer) || {weight: 1};
    let entry = findEntry(source);
    if (!entry)
    {
        entry = formatConvertItem({source, rootDir, outputDir, workingDir});
    }

    entry.weight = entry.weight + entryReferer.weight;
    entry.notOnDisk = !!notOnDisk;
    entry.entryPoint = entryPoint;
    entry.referrees = entry.referrees || [];
    if (referrer)
    {
        ++entry.weight;
        entry.referrees.push(referrer);
    }

    for (let i = 0; i < cjsList.length; ++i)
    {
        const item = cjsList[i];
        if (entry.source === item.source)
        {
            return entry;
        }
    }

    cjsList.push(entry);
    return entry;
};

const resetFileList = () =>
{
    cjsList = [];
    indexGeneratedTempVariable = 1;
    dumpCounter = 0;
};

const getIndent = async (str) =>
{
    try
    {
        const match = str.match(/([\t ]+)"name"/);
        return match[1];
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1301}, "", e.message);
    }
    return 2;
};

/**
 * Apply replacements from user config file or modules parsing
 * @param converted
 * @param replace
 * @returns {*}
 */
const applyReplaceFromConfig = (converted, replace) =>
{
    replace.forEach((item) =>
    {
        if (item.regex)
        {
            converted = converted.replace(item.search, item.replace);
        }
        else
        {
            converted = converted.split(item.search).join(item.replace);
        }
    });
    return converted;
};

const insertDirname = (converted) =>
{
    try
    {
        const dirnameCode = `import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
`;

        const filenameCode = `const __filename = fileURLToPath(import.meta.url);
`;

        const importCode = `import { fileURLToPath } from "url";
`;

        let insertion = "";
        if (converted.indexOf("__dirname") > -1 && converted.indexOf("import { dirname } from \"path\"") === -1)
        {
            insertion = dirnameCode;
        }

        if (converted.indexOf("__filename") > -1 && converted.indexOf("import { __filename } from \"path\"") === -1)
        {
            insertion = insertion + filenameCode;
        }

        if (insertion)
        {
            if (converted.indexOf("import { fileURLToPath } from \"url\"") === -1)
            {
                insertion = importCode + insertion;
            }

            converted = insertion + converted;
        }
    }
    catch (e)
    {
        console.error({lid: 1381}, "", e.message);
    }

    return converted;
};

/**
 * Insert header to source
 * @param converted
 * @param source
 * @param noHeader
 * @returns {string}
 */
const insertHeader = (converted, source, {noHeader = false} = {}) =>
{
    if (noHeader)
    {
        return converted;
    }

    converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [${source}]{@link ${source}}
 * 
 **/${EOL}` + converted;

    return converted;
};

/**
 *
 * @note Event though we already loaded package.json, things might have happened,
 * so, we load a fresh version than we rewrite immediately.
 * @param entryPoint
 * @param workingDir
 * @param target
 * @param useImportMaps
 * @param importMaps
 * @param bundlePath
 * @returns {boolean}
 */
const updatePackageJson = async ({entryPoint, workingDir, target, useImportMaps, importMaps, bundlePath} = {}) =>
    {
        if (!entryPoint)
        {
            console.error({lid: 1401}, " Can not update package.json. The option --entrypoint was not set.");
            return false;
        }

        const packageJsonLocation = path.join(workingDir, "./package.json");

        /* istanbul ignore next */
        if (!fs.existsSync(packageJsonLocation))
        {
            console.error({lid: 1281}, ` package.json not in [${packageJsonLocation}].`);
            return false;
        }

        let json;

        try
        {
            let content = fs.readFileSync(packageJsonLocation, "utf-8") || "";
            /* istanbul ignore next */
            if (!content.trim())
            {
                console.error({lid: 1283}, " package.json is empty or invalid.");
                return false;
            }
            json = JSON.parse(content);

            if (useImportMaps)
            {
                if (importMaps && Object.keys(importMaps).length)
                {
                    json.imports = json.imports || {};
                    Object.assign(json.imports, importMaps);
                }
            }

            if (target === TARGET.BROWSER)
            {
                const browserField = json.browser;
                if (typeof browserField === "string" || !browserField)
                {
                    const target = bundlePath || entryPoint.target;
                    if (target)
                    {
                        json.browser = target;
                    }
                }
                else
                {
                    console.error({lid: 1285}, "The field browser is already set to a non string value. It will not" +
                        " be updated");
                }
            }
            else
            {
                const entry = {
                    "require": entryPoint.source,
                    "import" : entryPoint.target
                };

                json.module = entryPoint.target;
                json.type = "module";

                if (!json.exports)
                {
                    /* istanbul ignore next */
                    json.exports = entry;
                }
                else
                {
                    // Cannot update
                    if (Array.isArray(json.exports["."]))
                    {
                        console.log({lid: 1419}, "Cannot update package.json. Expecting exports key to be an object.");
                        return false;
                    }

                    if (Object.keys(json.exports).length <= 0)
                    {
                        json.exports = entry;
                    }
                    else if (json.exports.hasOwnProperty("import") || json.exports.hasOwnProperty("require"))
                    {
                        json.exports.import = entry.import;
                        json.exports.require = entry.require;
                    }
                    else if (typeof json.exports["."] === "object")
                    {
                        json.exports["."] = Object.assign({}, json.exports["."], entry);
                    }
                    else
                    {
                        /* istanbul ignore next */
                        json.exports["."] = entry;
                    }
                }
            }

            let indent = 2;
            try
            {
                indent = await getIndent(content);
            }
            catch (e)
            {
                /* istanbul ignore next */
                console.info({lid: 1289}, " ", e.message);
            }

            let str = normaliseString(JSON.stringify(json, null, indent));
            fs.writeFileSync(packageJsonLocation, str, "utf8");

            console.log({lid: 1412}, " ");
            console.log({lid: 1414}, " ================================================================");
            console.log({lid: 1416}, " package.json updated");
            console.log({lid: 1418}, " ----------------------------------------------------------------");
            console.log({lid: 1420}, " Your package.json has successfully been updated (--update-all option)");
        }
        catch
            (e)
        {
            /* istanbul ignore next */
            console.error({lid: 1285}, " Could not update package.json.");
        }

        return true;
    }
;

/**
 * Bundle and minify
 * @param entryPointPath
 * @param bundlePath Generated build File path
 * @param target
 * @param minify
 * @param sourcemap
 * @returns {Promise<unknown>}
 */
const minifyCode = async (entryPointPath, bundlePath, target, {minify = false, sourcemap = false} = {}) =>
{
    try
    {
        const minifyDir = path.parse(bundlePath).dir;
        buildTargetDir(minifyDir);

        entryPointPath = path.resolve(entryPointPath);
        bundlePath = path.resolve(bundlePath);

        let platform;
        if (target === TARGET.ESM)
        {
            platform = "node";
        }

        await esbuild.build({
            entryPoints  : [entryPointPath],
            bundle       : true,
            outfile      : bundlePath,
            sourcemap,
            format       : "esm",
            target       : "es6",
            minify,
            legalComments: "eof",
            platform
        });

        let content = fs.readFileSync(bundlePath, "utf-8");
        content = content.replace(/\/\*! [^*]+\*\//g, "");
        fs.writeFileSync(bundlePath, content);

        return true;
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 1387}, " Fail to bundle.");
    }

    return false;
};

/**
 * Bundle generated ESM code into minified bundle
 * @param cjsList
 * @param entryPointPath
 * @param target
 * @param bundlePath
 */
const bundleResult = async (entryPointPath, {
    target = TARGET.BROWSER,
    bundlePath = "./",
    minify = false,
    sourcemap = false
}) =>
{
    if (!await minifyCode(entryPointPath, bundlePath, target, {minify, sourcemap}))
    {
        console.error({lid: 1743}, " Failed to minify");
        return false;
    }

    console.log({lid: 1312}, " ");
    console.log({lid: 1314}, " ================================================================");
    console.log({lid: 1316}, " Bundle generated");
    console.log({lid: 1318}, " ----------------------------------------------------------------");
    console.log({lid: 1320}, " The bundle has been generated. Use");
    console.log({lid: 1322}, ` require("./node_modules/${bundlePath}")`);
    console.log({lid: 1324}, " or");
    console.log({lid: 1326}, ` <script type="module" src="./node_modules/${bundlePath}"></script>`);
    console.log({lid: 1328}, " from your html code to load it in the browser.");
    return true;
};

const hideKeyElementCode = (str, source) =>
{
    sourceExtractedComments = [];
    sourceExtractedStrings = [];
    sourceExtractedRegexes = [];

    str = stripCodeComments(str, sourceExtractedComments, commentMasks);
    dumpData(str, source, "hideKeyElementCode - stripCodeComments");

    str = stripCodeStrings(str, sourceExtractedStrings);
    dumpData(str, source, "hideKeyElementCode - stripCodeStrings");

    str = stripCodeRegexes(str, sourceExtractedRegexes);
    dumpData(str, source, "hideKeyElementCode - stripCodeRegexes");

    str = markBlocks(str).modifiedSource;
    dumpData(str, source, "hideKeyElementCode - markBlocks");

    return str;
};

const restoreKeyElementCode = (str) =>
{
    str = putBackStrings(str, sourceExtractedStrings);
    str = putBackComments(str, sourceExtractedComments, commentMasks);
    str = putBackRegexes(str, sourceExtractedRegexes);

    return str;
};

const hasWord = (word, str) =>
{
    return str.indexOf(word) === 0;
};

const markBlocks = str =>
{
    const n = str.length;
    let blockLevel = -1;
    let modifiedSource = "";
    let lastPos = 0;
    let max = 0;
    let regexOn = false;
    const lookFor = "export";
    for (let i = 0; i < n; ++i)
    {
        let char = str.charAt(i);
        if (!regexOn && char === "/")
        {
            /* istanbul ignore next */
            if (i > 0 && str.charAt(i - 1) === "\\")
            {
                continue;
            }
            regexOn = true;
            continue;
        }

        if (regexOn && (char === "/" || char === "\n"))
        {
            regexOn = false;
            continue;
        }

        if (regexOn)
        {
            continue;
        }

        if (lookFor.charAt(0) === char)
        {
            let currentPart = str.substring(i);
            if (hasWord(lookFor, currentPart))
            {
                const nextChar = currentPart.charAt(lookFor.length);
                if (!(/\s+/.test(nextChar)))
                {
                    continue;
                }

                if (blockLevel >= 0)
                {
                    const exportString = " " + lookFor + EXPORT_KEYWORD_MASK + blockLevel;
                    modifiedSource += exportString;
                    i = i + lookFor.length;
                    lastPos = i;
                    continue;
                }
            }
        }
        if (char === "{")
        {
            /* istanbul ignore next */
            if (i > 0 && str.charAt(i - 1) === "\\")
            {
                continue;
            }
            ++blockLevel;
            max = Math.max(max, blockLevel);
            modifiedSource += str.substring(lastPos, i) + blockMaskIn + blockLevel;
            lastPos = i + 1;
        }
        else if (char === "}")
        {
            /* istanbul ignore next */
            if (i > 0 && str.charAt(i - 1) === "\\")
            {
                continue;
            }
            modifiedSource += str.substring(lastPos, i) + blockMaskOut + blockLevel;
            lastPos = i + 1;
            --blockLevel;
        }
    }

    modifiedSource += str.substring(lastPos);
    return {modifiedSource, max};
};

const removeResidue = (str) =>
{
    str = str.replace(IMPORT_MASK_START, "");
    str = str.replace(IMPORT_MASK_END, "");
    return str;
};

function moveEmbeddedImportsToTop(converted, source)
{
    converted = hideKeyElementCode(converted, source);
    dumpData(converted, source, "moveEmbeddedImportsToTop - hideKeyElementCode");

    // Export default
    let regex = new RegExp(`\\bexport.*default\\s*${blockMaskIn}([0-9]*[1-9])[\\S\\s]*?${blockMaskOut}\\1\\s*;?`, "gm");
    const exportDefault = [];
    converted = beforeReplace(regex, converted, function (found, wholeText, index, match)
    {
        exportDefault.push(match[0]);
        return "";
    });
    dumpData(converted, source, "moveEmbeddedImportsToTop - Transform export default");

    // module.exports
    regex = new RegExp(`\\bexport${EXPORT_KEYWORD_MASK}(\\d*)\\s+default\\s+.*;?`, "gm");
    converted = beforeReplace(regex, converted, function (found, wholeText, index, match)
    {
        exportDefault.push(match[0]);
        return "";
    });
    dumpData(converted, source, "moveEmbeddedImportsToTop - Transform module.exports");

    converted = restoreKeyElementCode(converted);
    dumpData(converted, source, "moveEmbeddedImportsToTop - restoreKeyElementCode");

    if (exportDefault.length)
    {
        // Only 1 export default is allowed
        if (exportDefault.length > 1)
        {
            console.log({lid: 1080, color: "#333333"}, " More than one default detected. Only the first one" +
                " will be" +
                " converted.");
        }

        if (converted.indexOf(IMPORT_MASK_END) > -1)
        {
            const escaped = escapeDollar(exportDefault[exportDefault.length - 1] + EOL);
            converted = converted.replace(IMPORT_MASK_END, IMPORT_MASK_END + EOL + escaped);
        }
        else
        {
            converted = exportDefault[exportDefault.length - 1] + EOL + converted;
        }

        dumpData(converted, source, "moveEmbeddedImportsToTop - restore 0");
    }

    const regexMaskIn = new RegExp(`${blockMaskIn}(\\d+)`, "gm");
    converted = converted.replaceAll(regexMaskIn, "{");
    dumpData(converted, source, "moveEmbeddedImportsToTop - restore {");

    const regexMaskOut = new RegExp(`${blockMaskOut}(\\d+)`, "gm");
    converted = converted.replaceAll(regexMaskOut, "}");
    dumpData(converted, source, "moveEmbeddedImportsToTop - restore }");

    const exportDefaultMask = new RegExp(`${EXPORT_KEYWORD_MASK}(\\d+)`, "gm");
    converted = converted.replaceAll(exportDefaultMask, "");
    dumpData(converted, source, "moveEmbeddedImportsToTop - restore 4");

    return converted;
}

/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noheader Whether to add extra info on top of converted file
 */
const convertCjsFiles = (list, {
    replaceStart = [],
    replaceEnd = [],
    nonHybridModuleMap = {},
    workingDir,
    noheader = false,
    withreport = false,
    importMaps = {},
    followlinked = true,
    debuginput = "",
    moreOptions = {},
    keepexisting = false
} = {}) =>
{
    let report;
    report = withreport ? {} : true;

    if (!list || !list.length)
    {
        console.info({lid: 1010}, "No file to convert.");
        return false;
    }

    for (let dynamicIndex = 0; dynamicIndex < list.length; ++dynamicIndex)
    {
        try
        {
            let {source, outputDir, rootDir, notOnDisk} = list[dynamicIndex];

            console.log({lid: 1130}, " ================================================================");
            console.log({lid: 1132}, ` Processing: ${source}`);
            console.log({lid: 1134}, " ----------------------------------------------------------------");

            resetAll();

            let converted = fs.readFileSync(source, "utf-8");
            dumpData(converted, source, "read-file");

            converted = applyDirectives(converted, moreOptions);
            dumpData(converted, source, "apply-directives");

            converted = applyReplaceFromConfig(converted, replaceStart);
            dumpData(converted, source, "replace-from-config-file");

            converted = removeShebang(converted);

            converted = convertComplexRequiresToSimpleRequires(converted, source);
            dumpData(converted, source, "convert-complex-requires-to-simple-requires");

            converted = convertJsonImportToVars(converted, {
                source,
            });
            dumpData(converted, source, "convert-json-import-to-vars");

            if (isCjsCompatible(source, converted))
            {
                let result, success;
                result = convertRequiresToImportsWithAST(converted, list,
                    {
                        source,
                        outputDir,
                        rootDir,
                        importMaps,
                        nonHybridModuleMap,
                        workingDir,
                        followlinked,
                        moreOptions,
                        debuginput
                    });

                converted = result.converted;
                success = result.success;

                dumpData(converted, source, "convertRequiresToImportsWithAST");

                list[dynamicIndex].exported = result.detectedExported;

                if (success)
                {
                    converted = convertNonTrivialExportsWithAST(converted, source, result.detectedExported);
                    dumpData(converted, source, "convertNonTrivialExportsWithAST");

                    converted = convertModuleExportsToExport(converted, source);
                    dumpData(converted, source, "convertModuleExportsToExport");
                }
                else
                {
                    // Apply fallback in case of conversion error
                    console.error({lid: 1213}, ` Applying fallback process to convert [${source}]. The conversion may result in errors.`);
                    converted = convertToESMWithRegex(converted,
                        list,
                        {
                            source,
                            outputDir,
                            rootDir,
                            importMaps,
                            nonHybridModuleMap,
                            workingDir,
                            followlinked,
                            moreOptions
                        });
                    dumpData(converted, source, "convertToESMWithRegex");
                }
            }
            else
            {
                converted = reviewEsmImports(converted, list,
                    {
                        source, outputDir, rootDir, importMaps,
                        nonHybridModuleMap, workingDir, followlinked, moreOptions
                    });
                dumpData(converted, source, "reviewEsmImports");
            }

            converted = moveEmbeddedImportsToTop(converted, source);
            dumpData(converted, source, "moveEmbeddedImportsToTop");

            converted = putBackAmbiguous(converted);
            dumpData(converted, source, "putBackAmbiguous");

            converted = restoreText(converted);
            dumpData(converted, source, "restoreText");

            converted = insertDirname(converted);
            dumpData(converted, source, "insertDirname");

            converted = insertHeader(converted, source, {noHeader: noheader});
            dumpData(converted, source, "insertHeader");

            converted = applyReplaceFromConfig(converted, replaceEnd);
            dumpData(converted, source, "applyReplaceFromConfig");

            converted = normaliseString(converted);
            dumpData(converted, source, "normaliseString");

            converted = removeResidue(converted);
            dumpData(converted, source, "removeResidue");

            converted = restoreShebang(converted);

            // ******************************************
            const targetFile = path.basename(source, path.extname(source));

            let destinationDir;
            if (outputDir)
            {
                const fileDir = path.join(path.dirname(source));
                const relativeDir = path.relative(rootDir, fileDir);
                destinationDir = path.join(outputDir, relativeDir);

                if (!notOnDisk)
                {
                    buildTargetDir(destinationDir);
                }
            }
            else
            {
                destinationDir = path.join(path.dirname(source));
            }

            const targetFilepath = path.join(destinationDir, targetFile + ESM_EXTENSION);

            const parsingResult = parseEsm(source, converted);
            let reportSuccess = parsingResult.success ? "✔ SUCCESS" : "✔ CONVERTED (with fallback)";

            if (!parsingResult.success)
            {
                let e = parsingResult.error;
                console.error({lid: 1055}, " " + toAnsi.getTextFromHex("ERROR: Conversion" +
                    " may have failed even with fallback processing on" +
                    ` [${targetFilepath}]`, {fg: "#FF0000"}));
                console.error({lid: 1057}, " " + toAnsi.getTextFromHex(`LINE:${e.lineNumber} COLUMN:${e.column}: ${e.message}`, {fg: "#FF2000"}));
                reportSuccess = "❌ FAILED";
                console.log({lid: 1075}, " Note that the file is still generated to allow error checking and manual updates.");
            }

            if (!withreport)
            {
                report = false;
            }

            console.log({lid: 1060}, ` ${reportSuccess}: Converted [${source}] to [${targetFilepath}]`);

            list[dynamicIndex].converted = converted;

            if (!notOnDisk)
            {
                let overwrite = true;
                if (fs.existsSync(targetFilepath))
                {
                    const content = fs.readFileSync(targetFilepath, "utf-8");
                    const regexp = new RegExp("\\/\\*\\*\\s*to-esm-\\w+:\\s*do-not-overwrite", "gm");
                    if (regexp.test(content))
                    {
                        overwrite = false;
                        console.log({
                            lid  : 1600,
                            color: "#00FF00"
                        }, ` [${source}] contain the directive "do-not-overwrite". Skipping.`);
                    }
                }

                if (overwrite && !keepexisting)
                {
                    fs.writeFileSync(targetFilepath, converted, "utf-8");
                }
            }

            if (withreport)
            {
                report[source] = converted;
            }

            console.log({lid: 1150}, " ");

        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 1011}, "", e.message);
            /* istanbul ignore next */
            if (!withreport)
            {
                report = false;
            }
        }

    }

    return report;
};

/**
 * Look for .to-esm config path, so to load automatically a configuration.
 * @returns {string}
 */
const detectESMConfigPath = () =>
{
    try
    {
        const toEsmConfigName = ".to-esm";
        const extensionList = ["", ".json", ".cjs"];

        for (let i = 0; i < extensionList.length; ++i)
        {
            const extension = extensionList[i];
            let esmPath = path.resolve(toEsmConfigName + extension);
            esmPath = normalisePath(esmPath);

            if (fs.existsSync(esmPath) && fs.lstatSync(esmPath).isFile())
            {
                return esmPath;
            }
        }
    }
    catch (e)
    {

    }

    return "";
};

/**
 * Use command line arguments to apply conversion
 * @param rawCliOptions
 */
const convert = async (rawCliOptions = {}) =>
{
    try
    {
        const workingDir = normalisePath(process.cwd(), {isFolder: true});

        console.log({lid: 1400}, `Current working directory: ${workingDir}`);

        resetFileList();

        const cliOptions = {};
        Object.keys(rawCliOptions).forEach((key) =>
        {
            cliOptions[key.toLowerCase()] = rawCliOptions[key];
        });

        let confFileOptions = {replace: []};

        // Config Files
        let configPath = cliOptions.config || detectESMConfigPath();

        let nonHybridModuleMap = {};
        if (configPath)
        {
            confFileOptions = await getOptionsConfigFile(configPath);

            // Convert search replacement strings to regex
            confFileOptions.replaceStart = regexifySearchList(confFileOptions.replaceStart);
            confFileOptions.replaceEnd = regexifySearchList(confFileOptions.replaceEnd);

            // Install special npm modules based on config
            nonHybridModuleMap = await installNonHybridModules(confFileOptions) || {};
        }

        // Input Files
        let inputFileMaskArr = [];
        if (rawCliOptions._ && rawCliOptions._.length)
        {
            if (rawCliOptions._.length > 1)
            {
                console.log({lid: 1307}, ` Bad arguments.
            Here are some examples for invoking "to-esm":
            ------------------------------------------------------
            $> ${toAnsi.getTextFromHex(`${toEsmPackageJson.name} filepath --output outputdir`, {fg: "#FF00FF"})} 
            ------------------------------------------------------
            $> ${toAnsi.getTextFromHex(`${toEsmPackageJson.name} --entrypoint filepath --output outputdir`, {fg: "#FFFF00"})} 
            ------------------------------------------------------            
            $> ${toAnsi.getTextFromHex(`${toEsmPackageJson.name} --input filepath1 --input filepath2`, {fg: "#AA55DD"})}
            ------------------------------------------------------
            For more info go to: 
            ${toAnsi.getTextFromHex("https://www.npmjs.com/package/to-esm", {fg: "#00FF00"})} 
             
            `);

                return {cjsList, success: false};
            }
            inputFileMaskArr.push(...rawCliOptions._);
        }

        if (cliOptions.input)
        {
            if (Array.isArray(cliOptions.input))
            {
                inputFileMaskArr.push(...cliOptions.input);
            }
            else
            {
                inputFileMaskArr.push(cliOptions.input);
            }
        }

        cliOptions.target = cliOptions.target || TARGET.ESM;

        if (cliOptions.target === TARGET.PACKAGE)
        {
            cliOptions.target = TARGET.BROWSER;
            cliOptions.prefixpath = "../../";
        }

        if (cliOptions.target === TARGET.ALL)
        {
            console.error({lid: 1149}, `The option --target ${TARGET.ALL} is no longer supported. It defaults to --target ${TARGET.BROWSER} now`);
            cliOptions.target = TARGET.BROWSER;
        }

        if (cliOptions.useimportmaps)
        {
            cliOptions.target = TARGET.BROWSER;
        }

        cliOptions.prefixpath = cliOptions.prefixpath || "";
        cliOptions.prefixpath = cliOptions.prefixpath.trim();

        // Output Files
        cliOptions.output = cliOptions.output || "./";
        const outputDirArr = Array.isArray(cliOptions.output) ? cliOptions.output : [cliOptions.output];

        const firstOutputDir = outputDirArr[0];

        for (let i = 0; i < inputFileMaskArr.length; ++i)
        {
            const inputFileMask = inputFileMaskArr[i];
            const outputDir = outputDirArr[i];

            if (outputDir)
            {
                buildTargetDir(outputDir);
            }

            const list = glob.sync(inputFileMask, {
                dot  : true,
                nodir: true
            });

            /* istanbul ignore next */
            if (!list.length)
            {
                console.error({lid: 1151}, " The pattern did not match any file.");
                return {cjsList, success: false};
            }

            let rootDir;
            if (list && list.length > 1)
            {
                rootDir = commonDir(workingDir, list);
            }
            else
            {
                rootDir = path.join(workingDir, path.dirname(list[0]));
            }

            if (!cliOptions.entrypoint && !i && list.length === 1)
            {
                cliOptions.entrypoint = list[0];
                break;
            }

            list.forEach((source) =>
            {
                addFileToConvertingList({source, rootDir, outputDir, workingDir});
            });

        }

        // Note: The multi directory options may complicate things. Consider making it obsolete.
        let entryPointList;
        let entrypointPath = null;
        if (cliOptions.entrypoint)
        {
            entrypointPath = normalisePath(cliOptions.entrypoint);
            console.log({lid: 1402}, toAnsi.getTextFromHex(`Entry Point: ${entrypointPath}`, {fg: "#00FF00"}));
            let rootDir = path.parse(entrypointPath).dir;
            rootDir = path.resolve(rootDir);
            entryPointList = addFileToConvertingList({
                source    : entrypointPath,
                rootDir,
                outputDir : firstOutputDir,
                workingDir,
                entryPoint: true
            });
        }

        // No header
        const noheader = !!cliOptions.noheader;
        const withreport = !!cliOptions.withreport;
        const fallback = !!cliOptions.fallback;
        const keepexisting = !!cliOptions.keepexisting;
        const debug = cliOptions.debug || false;
        const debuginput = debug || cliOptions.debuginput || "";

        if (debuginput)
        {
            if (fs.existsSync(DEBUG_DIR))
            {
                try
                {
                    fs.rmSync(DEBUG_DIR, {recursive: true, force: true});
                }
                catch (e)
                {
                    /* istanbul ignore next */
                    console.error({lid: 1095}, "", e.message);
                }
            }
            buildTargetDir(DEBUG_DIR);
        }

        DEBUG_MODE = !!debuginput;

        let followlinked = !cliOptions.ignorelinked;

        const importMaps = {};

        let htmlOptions = confFileOptions.html || {};

        let html = cliOptions.html;
        if (html)
        {
            htmlOptions.pattern = html;
        }

        cliOptions.minify = !["false", "no", "non"].includes(cliOptions.minify);

        if (["false", "no", "non"].includes(cliOptions.sourcemap))
        {
            cliOptions.sourcemap = false;
        }

        const moreOptions = {
            useImportMaps: !!htmlOptions.pattern || cliOptions.useimportmaps,
            target       : cliOptions.target,
            nm           : cliOptions.nm || "node_modules",
            prefixpath   : cliOptions.prefixpath,
            minify       : !!cliOptions.minify,
            sourcemap    : !!cliOptions.sourcemap
        };

        if (!cjsList.length)
        {
            return {cjsList, success: false};
        }

        // The first file parsed will be the entrypoint
        entrypointPath = cjsList[0].target;

        const success = convertCjsFiles(cjsList,
            {
                replaceStart: confFileOptions.replaceStart,
                replaceEnd  : confFileOptions.replaceEnd,
                nonHybridModuleMap,
                noheader,
                followlinked,
                withreport,
                importMaps,
                workingDir,
                fallback,
                moreOptions,
                debuginput,
                keepexisting
            });

        if (cliOptions.bundle && entrypointPath)
        {
            await bundleResult(entrypointPath, {
                target    : cliOptions.target,
                bundlePath: cliOptions.bundle,
                minify    : moreOptions.minify,
                sourcemap : moreOptions.sourcemap
            });
        }

        if (cliOptions["update-all"])
        {
            updatePackageJson({
                entryPoint: entryPointList,
                bundlePath: cliOptions.bundle,
                workingDir, ...moreOptions,
                importMaps
            });
        }

        if (!htmlOptions.pattern)
        {
            return {cjsList, success};
        }

        if (!Object.keys(importMaps).length)
        {
            console.info({lid: 1202}, " No importMaps entry found.");
            return {cjsList, success};
        }

        const htmlList = glob.sync(htmlOptions.pattern,
            {
                root : workingDir,
                nodir: true
            });

        updateHTMLFiles(htmlList, {importMaps, moreOptions, confFileOptions, htmlOptions});

        return {cjsList, success};
    }
    catch (e)
    {
        console.error({lid: 1453}, e);
    }

    return {cjsList, success: false};
};

module.exports.buildTargetDir = buildTargetDir;
module.exports.convertNonTrivial = convertNonTrivial;
module.exports.reviewEsmImports = reviewEsmImports;
module.exports.parseImportWithRegex = parseImportWithRegex;
module.exports.applyReplace = applyReplaceFromConfig;
module.exports.stripCodeComments = stripCodeComments;
module.exports.convertModuleExportsToExport = convertModuleExportsToExport;
module.exports.convertRequireToImport = convertRequiresToImport;
module.exports.validateSyntax = validateSyntax;
module.exports.convertRequireToImportWithAST = convertRequiresToImportsWithAST;
module.exports.putBackComments = putBackComments;
module.exports.convertListFiles = convertCjsFiles;
module.exports.convertToESMWithRegex = convertToESMWithRegex;
module.exports.getOptionsConfigFile = getOptionsConfigFile;
module.exports.parseReplace = regexifySearchList;
module.exports.getLibraryInfo = getLibraryInfo;
module.exports.installPackage = installPackage;
module.exports.parseReplaceModules = installNonHybridModules;
module.exports.normalisePath = normalisePath;
module.exports.convert = convert;
module.exports.isConventionalFolder = isConventionalFolder;
module.exports.concatenatePaths = concatenatePaths;
module.exports.convertToSubRootDir = convertToSubRootDir;
module.exports.subtractPath = subtractPath;
module.exports.getTranslatedPath = getTranslatedPath;
module.exports.getProjectedPathAll = getProjectedPathAll;
module.exports.calculateRequiredPath = calculateRequiredPath;
module.exports.putBackComments = putBackComments;
module.exports.regexifySearchList = regexifySearchList;
module.exports.getImportMapFromPage = getImportMapFromPage;
module.exports.resetFileList = resetFileList;
module.exports.normaliseString = normaliseString;

module.exports.setupConsole = setupConsole;

module.exports.TARGET = TARGET;
module.exports.DEBUG_DIR = DEBUG_DIR;
