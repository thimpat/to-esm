/**
 * This file is to convert a Commonjs file into an ESM one.
 */

// ===========================================================================
// Imports
// ---------------------------------------------------------------------------
const path = require("path");
const fs = require("fs");
const glob = require("glob");
let crypto = require("crypto");
const {anaLogger} = require("analogger");

const {hideText, restoreText, beforeReplace, resetAll} = require("before-replace");
const {stripStrings, stripComments, stripRegexes, clearStrings, parseString} = require("strip-comments-strings");
const {
    resolvePath,
    joinPath,
    normalisePath,
    generateTempName,
    isArgsDir,
    normaliseDirPath,
    importLowerCaseOptions,
    calculateCommon
} = require("@thimpat/libutils");
const {Readable} = require("stream");
const toAnsi = require("to-ansi");

const {findPackageEntryPoint} = require("find-entry-point");

const espree = require("espree");
const estraverse = require("estraverse");

const esbuild = require("esbuild");

const toEsmPackageJson = require("../package.json");

const REGEXES = {};

// ===========================================================================
// Constants
// ---------------------------------------------------------------------------
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

const GENERATED_ROOT_FOLDER_NAME = "_root";

let indexGeneratedTempVariable = 1;

const DEFAULT_PREFIX_TEMP = ".tmp-toesm";

const ORIGIN_ADDING_TO_INDEX = {
    START                  : "START",
    RESOLVE_RELATIVE_IMPORT: "RESOLVE_RELATIVE_IMPORT",
    RESOLVE_THIRD_PARTY    : "RESOLVE_THIRD_PARTY",
    RESOLVE_ABSOLUTE       : "RESOLVE_ABSOLUTE"
};

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


// ===========================================================================
// Globals
// ---------------------------------------------------------------------------
// The whole list of files to convert
let cjsList = [];


// ===========================================================================
// Static Locals
// ---------------------------------------------------------------------------
/**
 * Register a module name
 * If the module is already registered, returns false, otherwise add it to the list and returns true
 * @note Add here modules that has been converted to ESM during a parsing
 * @param moduleName
 * @returns {boolean}
 */
const displayWarningOncePerModule = (function ()
{
    let convertedModuleList = {};

    return function (moduleName, message)
    {
        if (convertedModuleList[moduleName])
        {
            return false;
        }

        convertedModuleList[moduleName] = true;

        console.warn({
            lid  : 1236,
            color: "yellow"
        }, message);

        return true;
    };
})();


// ===========================================================================
// Cores
// ---------------------------------------------------------------------------
const normaliseString = (content) =>
{
    content = content.replace(/\r\n/gm, "\n").replace(/\n/gm, EOL);
    return content;
};

const setupConsole = () =>
{
    try
    {
        anaLogger.setOptions({silent: false, hideError: false, hideHookMessage: true, lidLenMax: 4});
        anaLogger.overrideConsole();
        anaLogger.overrideError();

        console.log({lid: 1012}, "Console is set up");
        return anaLogger;
    }
    catch (e)
    {
        console.error({lid: 3008}, e.message);
    }

    return null;
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
        console.error({lid: 3010}, "", e.message);
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

    let sourceDir = isArgsDir(source) ? source : path.parse(source).dir;
    sourceDir = normaliseDirPath(sourceDir);

    let pkgImportPath = joinPath(sourceDir, requiredPath);
    return normalisePath(pkgImportPath);
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

        let entryPoint = findPackageEntryPoint(moduleName, targetDir, {
            isCjs,
            isBrowser       : target === TARGET.BROWSER,
            useNativeResolve: false
        });

        /* istanbul ignore next */
        if (entryPoint === null)
        {
            console.error({lid: 3013}, ` Could not find entry point for module ${moduleName}.`);
            return null;
        }
        entryPoint = normalisePath(entryPoint);

        const nodeModulesPos = entryPoint.indexOf("node_modules");
        /* istanbul ignore next */
        if (nodeModulesPos === -1)
        {
            console.error({lid: 3015}, ` The module [${moduleName}] is located in a non-node_modules directory.`);
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
        fs.writeFileSync(joinPath(DEBUG_DIR, `dump-${indexCounter}-${name}-${title}.js`), converted, "utf-8");
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3014}, e.message);
    }
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
 * TODO: Re-Check this function goal
 * TODO: Use path.relative and swap parameters
 * TODO: Try to not use this function at all. Remove it as soon as possible
 * @param wholePath Full File Path
 * @param pathToSubtract Subdirectory to remove from path
 * @returns {*}
 */
const subtractPath = (wholePath, pathToSubtract) =>
{
    let subPath, subDir;

    // Get mapped path by subtracting rootDir
    wholePath = normalisePath(wholePath);
    pathToSubtract = normalisePath(pathToSubtract);

    if (wholePath.length < pathToSubtract.length)
    {
        console.error({lid: 3016}, "" + "Path subtraction will not work here. " +
            "The subtracting path is bigger than the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubtract === "./")
    {
        subPath = convertToSubRootDir(wholePath);
        subDir = path.parse(subPath).dir;
        subDir = normaliseDirPath(subDir);

        return {
            subDir, subPath
        };
    }
    else if (wholePath.indexOf(pathToSubtract) === -1)
    {
        console.error({lid: 3018}, "" + "Path subtraction will not work here. " +
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
    subDir = normaliseDirPath(subDir);

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

/**
 * Calculate for a given source (usually a .cjs), its supposed destination path after a conversion
 * i.e.
 * ./my/cjs/path/item.cjs => ./output/item.mjs
 * @param source
 * @param rootDir
 * @param outputDir
 * @returns {{}|{projectedPath: (*), subDir: *, projectedDir: (*), subPath: *, sourcePath: (*)}}
 */
const getProjectedPathAll = ({source, outputDir, subRootDir = ""} = {}) =>
{
    try
    {
        if (subRootDir && source.indexOf(subRootDir) === 0)
        {
            source = source.substring(subRootDir.length);
            // source = joinPath(outputDir, source);
        }
        let projectedPath = joinPath(outputDir, source);
        projectedPath = normalisePath(projectedPath);

        return {
            projectedPath,
        };
    }
    catch (e)
    {
        console.error({lid: 3020}, "", e.message);
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
    const renamed = joinPath(parsed.dir, parsed.name + ESM_EXTENSION);
    return normalisePath(renamed);
};

/**
 * @todo Investigate
 * @param match
 * @returns {*}
 */
const reviewEntryImportMaps = (match/*, requestedRequired, moreOptions*/) =>
{
    try
    {
        //     projectedRequiredPath = moduleName;
        //     if (requiredPath.indexOf("node_modules") > -1)
        //     {
        //         requiredPath = "./node_modules" + requiredPath.split("node_modules")[1];
        //     }
        //     importMaps[moduleName] = requiredPath;
        //     match = `from "${moduleName}"`;
    }
    catch (e)
    {

    }

    return match;
};

/**
 *
 * @param {string} sourcePath Path to the file that does the require/import
 * @param {string} requiredPath Original required path
 * @param list
 * @param outputDir
 * @returns {string}
 */
const calculateRequiredPath = ({sourcePath, requiredPath, list, outputDir}) =>
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
        const newPath = concatenatePaths(outputDir, requiredPath);
        projectedRequiredPath = calculateRelativePath(sourcePath, newPath);
        projectedRequiredPath = changePathExtensionToESM(projectedRequiredPath);
    }

    return projectedRequiredPath;
};

/**
 * Determine if the required third party required needs to be resolved
 * and calculate its value
 * @param text
 * @param list
 * @param {string} source Relative path to the source file being parsed
 * @param rootDir
 * @param workingDir
 * @param regexRequiredPath
 * @param nonHybridModuleMap
 * @param importMaps
 * @param moreOptions
 * @returns {string|(function(Mixed, RegExp, String))|*}
 */
const resolveThirdParty = (text, list, {
    source,
    rootDir,
    subRootDir,
    workingDir,
    regexRequiredPath,
    nonHybridModuleMap,
    importMaps,
    moreOptions,
}) =>
{
    try
    {
        const outputDir = moreOptions.outputDir;

        let moduleName = regexRequiredPath;
        if (nonHybridModuleMap[moduleName])
        {
            regexRequiredPath = moduleName = nonHybridModuleMap[moduleName];
        }

        let requiredPath;
        if (moreOptions.extras.target === TARGET.BROWSER || moreOptions.extras.target === TARGET.ESM)
        {
            requiredPath = getESMModuleEntryPath(moduleName, workingDir, moreOptions.extras.target);
            if (!requiredPath)
            {
                console.warn({
                    lid  : 1099,
                    color: "#FF0000"
                }, ` The module [${moduleName}] for [target: ${moreOptions.extras.target}] was not found in your node_modules directory. `
                    + "Skipping.");
                return regexRequiredPath;
            }

            let isESM = isESMCompatible(requiredPath);
            if (isESM)
            {
                // When the require is for Node (ESM)
                // we return the original library name
                if (moreOptions.extras.target === TARGET.ESM)
                {
                    return regexRequiredPath;
                }
                    // When the require is for browser,
                // we need to solve the relative path to the browser script entry point
                else if (moreOptions.extras.target === TARGET.BROWSER)
                {
                    if (isBrowserCompatible(requiredPath))
                    {
                        // Calculate project path for this source
                        let {projectedPath} = getProjectedPathAll({outputDir, source, subRootDir});

                        // Extract absolute path for error checking
                        const absoluteProjectedPath = joinPath(workingDir, projectedPath);
                        const absoluteRequiredPath = joinPath(workingDir, outputDir, requiredPath);

                        // Render relative path
                        let relativePath = calculateRelativePath(absoluteProjectedPath, absoluteRequiredPath);

                        importMaps[moduleName] = requiredPath;

                        if (moreOptions.extras.useImportMaps)
                        {
                            return regexRequiredPath;
                        }

                        if (moreOptions.extras.prefixpath)
                        {
                            relativePath = joinPath(moreOptions.extras.prefixpath, relativePath);
                            relativePath = normalisePath(relativePath);
                        }

                        // When the target is the browser, any third party modules linked to the processed file
                        // need to be generated again.
                        // The reason being is that there is no centralized modules repositories like in Node
                        // (node_modules) in a browser environment, therefore no matter what we do, if our original
                        // file
                        // linked itself to a third party module, this third party module won't exist in the browser.
                        // It needs to be imported.
                        // Now, if we consider module bundlers, they tend to mitigate this issue as they have access
                        // to the whole project (depending on your set-up), so they can import any dependencies just
                        // once. Now, Google has introduced something called importmaps. Imagine if they ever extend
                        // the idea in making the system working like a whole centralized directory like in Node. We
                        // could import automatically without bundling any third party library. Let's take an example:
                        // import lodash from lodash-min With import map, the browser would know automatically where to
                        // download the library. - Increasing security because they can monitor any eventual defect -
                        // Increasing speed because it's easy to cache by the browser as no more hash id would be abuse
                        // like it's often the case after bundling - Increasing reactivity, as anything broken would be
                        // detected straight away - And much much more...
                        // ----------------------------------------------- Let's see what happen in the future. //
                        // -------------------------------------------- TODO: Move this comment elsewhere. God bless!
                        const entry = addFileToIndex({
                            source   : requiredPath,
                            rootDir  : workingDir,
                            outputDir,
                            workingDir,
                            notOnDisk: false,
                            referrer : source,
                            origin   : ORIGIN_ADDING_TO_INDEX.RESOLVE_THIRD_PARTY,
                            moduleName,
                            moreOptions
                        });

                        const relativeTargetPath = joinPath(outputDir, entry.mjsTarget);
                        const absoluteTargetPath = joinPath(workingDir, relativeTargetPath);
                        relativePath = calculateRelativePath(absoluteProjectedPath, absoluteTargetPath);
                        return relativePath;
                    }

                    console.warn({
                        lid  : 1101,
                        color: "yellow"
                    }, ` The file [${requiredPath}] is not browser compatible. The system will try to generate one`);

                    // If not, start conversion from the .cjs
                    requiredPath = getCJSModuleEntryPath(moduleName, workingDir);
                }

                if (!moreOptions.firstPass)
                {
                    displayWarningOncePerModule(
                        {lid: 2238},
                        `The npm module '${moduleName}' is ESM compatible, but the target is set to ${moreOptions.extras.target}.` +
                        `(The system will try to generate a new one if possible)`);
                }

            }
        }

        if (!moreOptions.firstPass)
        {
            displayWarningOncePerModule(moduleName, `The npm module '${moduleName}' does not seem to be ESM compatible. (The system will try to generate a new one)`);
        }

        // Need conversion from .cjs because module is incompatible with ESM
        requiredPath = getCJSModuleEntryPath(moduleName, workingDir);
        let projectedRequiredPath = resolveReqPath(source, requiredPath, {
            outputDir,
            subRootDir: moreOptions.subRootDir
        });
        projectedRequiredPath = changePathExtensionToESM(projectedRequiredPath);

        importMaps[moduleName] = requiredPath;

        const entry = addFileToIndex({
            source    : requiredPath,
            rootDir   : workingDir,
            outputDir,
            workingDir,
            notOnDisk : moreOptions.extras.useImportMaps,
            referrer  : source,
            origin    : ORIGIN_ADDING_TO_INDEX.RESOLVE_THIRD_PARTY,
            moduleName,
            moreOptions,
            subRootDir: moreOptions.subRootDir
        });

        // When importMaps is enabled, we return the original require
        // Resolvers will be set in the HTML code
        if (moreOptions.extras.useImportMaps)
        {
            regexRequiredPath = reviewEntryImportMaps(regexRequiredPath, projectedRequiredPath, moreOptions);
            return regexRequiredPath;
        }

        let {projectedPath} = getProjectedPathAll({outputDir, source, subRootDir: moreOptions.subRootDir});
        const relativePath = calculateRelativePath(projectedPath, entry.mjsTargetAbs);

        return relativePath;
        // return projectedRequiredPath;
    }
    catch (e)
    {
        console.error({lid: 3022}, "", e.message);
    }

    return regexRequiredPath;

};

const resolveReqPath = function (source, regexRequiredPath,
                                 {outputDir, subRootDir})
{
    try
    {
        let {projectedPath} = getProjectedPathAll({outputDir, source, subRootDir});
        // const relativePath = calculateRelativePath(projectedPath, entry.mjsTargetAbs);


        // Absolute path to source
        // let sourcePathAbs = joinPath(moreOptions.outputDir, source);

        // Absolute path to required
        let mjsPathAbs = joinPath(outputDir, regexRequiredPath);

        // Distance
        regexRequiredPath = calculateRelativePath(projectedPath, mjsPathAbs);

        return regexRequiredPath;
    }
    catch (e)
    {
        console.error({lid: 3024}, e.message);
    }

    return regexRequiredPath;
};

const isResolveAbsoluteMode = function (moreOptions)
{
    return !!moreOptions?.extras?.resolveAbsolute?.length;
};

const getLookUpDirs = function (moreOptions)
{
    return moreOptions?.extras?.resolveAbsolute;
};

const isExternalSource = function (moreOptions)
{
    // Don't create a copy of the referenced file
    return !!moreOptions.extras?.keepExternal;
};

/**
 * Re-evaluate a require new path relative to the source is in
 * @param text
 * @param list
 * @param source
 * @param rootDir
 * @param regexRequiredPath
 * @param moreOptions
 * @param workingDir
 * @param outputDir
 * @param subRootDir
 * @param origin
 * @returns {string}
 */
const resolveRelativeImport = (text, list, {
    source,
    rootDir,
    regexRequiredPath,
    moreOptions,
    workingDir,
    outputDir,
    subRootDir,
    origin = ""
}) =>
{
    // Source path of projected original source (the .cjs)
    try
    {
        let controlSourceAbs;

        if (origin === ORIGIN_ADDING_TO_INDEX.RESOLVE_THIRD_PARTY)
        {
            controlSourceAbs = joinPath(workingDir, source);
            rootDir = workingDir;
        }
        else if (origin === ORIGIN_ADDING_TO_INDEX.RESOLVE_RELATIVE_IMPORT)
        {
            controlSourceAbs = joinPath(rootDir, source);
        }
        else if (origin === ORIGIN_ADDING_TO_INDEX.RESOLVE_ABSOLUTE)
        {
            controlSourceAbs = joinPath(source);
        }
        else
        {
            controlSourceAbs = joinPath(rootDir, source);
        }

        if (!fs.existsSync(controlSourceAbs))
        {
            console.error({lid: 5581}, `Source not found: ${controlSourceAbs}`);
        }

        let requiredPath = concatenatePaths(source, regexRequiredPath);

        addFileToIndex({
            source   : requiredPath,
            rootDir,
            referrer : source,
            origin   : origin || ORIGIN_ADDING_TO_INDEX.RESOLVE_RELATIVE_IMPORT,
            workingDir,
            outputDir: moreOptions.outputDir,
            subRootDir
        });
    }
    catch (e)
    {
        console.error({lid: 3026}, "", e.message);
    }

    regexRequiredPath = changePathExtensionToESM(regexRequiredPath);
    return regexRequiredPath;
};

/**
 * Parse the absolute given paths
 * @param {string} text Source content (likely already modified in the pipeline)
 * @param {CjsInfoType[]} list File list already parsed
 * @param {string} source Source file that contains the absolute required path to translate
 * @param rootDir
 * @param {string} outputDir Folder for the target file
 * @param {string} workingDir
 * @param {string} regexRequiredPath Absolute required path
 * @param {*} moreOptions
 * @returns {string}
 */
const resolveAbsoluteImport = (text, list, {
    source,
    rootDir,
    outputDir,
    workingDir,
    regexRequiredPath,
    moreOptions,
    subRootDir,
    origin
}) =>
{
    // Source path of projected original source (the .cjs)
    try
    {
        const lookupDirLists = getLookUpDirs(moreOptions);
        let relativeRequiredPath, idRequiredPath;
        relativeRequiredPath = regexRequiredPath;

        let isAbsolutePath = true;

        if (lookupDirLists)
        {
            const props = getRelativePathsAgainstSuggestedRoots({
                regexRequiredPath,
                source,
                rootDir,
                lookupDirLists,
                outputDir
            });
            if (props)
            {
                relativeRequiredPath = props.relativeRequiredPath;
                idRequiredPath = props.idRequiredPath;
                isAbsolutePath = false;
            }
        }

        // The required path from the source path above
        const entry = addFileToIndex({
            source        : relativeRequiredPath,
            rootDir,
            outputDir,
            workingDir,
            referrer      : source,
            isAbsolutePath,
            moreOptions,
            origin        : ORIGIN_ADDING_TO_INDEX.RESOLVE_ABSOLUTE,
            externalSource: true,
            subRootDir
        });

        if (isExternalSource(moreOptions))
        {
            regexRequiredPath = idRequiredPath;
        }
        else
        {
            regexRequiredPath = resolveReqPath(source, entry.mjsTarget, {outputDir, subRootDir});
        }
        return regexRequiredPath;
    }
    catch (e)
    {
        console.error({lid: 3028}, "", e.message);
    }

    regexRequiredPath = changePathExtensionToESM(regexRequiredPath);
    return regexRequiredPath;
};

/**
 * Parse imported for ESM
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
    moreOptions,
    origin
}) =>
{
    // Locate third party
    // const re = /\bfrom\s+["']([^.\/~@][^"']+)["'];?/gmu;
    const re = /\bfrom\s+["']([^"']+?)["'];?/gmu;

    const sourceExtractedComments = [];
    text = stripCodeComments(text, sourceExtractedComments, commentMasks);

    const sourceExtractedRegexes = [];
    text = stripCodeRegexes(text, sourceExtractedRegexes);

    const subRootDir = moreOptions.subRootDir || "";

    text = text.replace(re, function (match, regexRequiredPath)
    {
        try
        {
            if (~nativeModules.indexOf(regexRequiredPath))
            {
                if (moreOptions.extras.target === TARGET.BROWSER)
                {
                    console.info({lid: 1017}, ` ${regexRequiredPath} is a built-in NodeJs module.`);
                }
                return match;
            }

            if (regexRequiredPath.startsWith("./") || regexRequiredPath.startsWith(".."))
            {
                const solvedRelativeRequire = resolveRelativeImport(text, list, {
                    source,
                    rootDir,
                    outputDir,
                    workingDir,
                    moreOptions,
                    regexRequiredPath,
                    subRootDir,
                    origin
                });

                match = match.replace(regexRequiredPath, solvedRelativeRequire);
            }
            else if (regexRequiredPath.startsWith("/"))
            {
                const solvedAbsoluteRequire = resolveAbsoluteImport(text, list, {
                    source,
                    rootDir,
                    outputDir,
                    workingDir,
                    regexRequiredPath,
                    moreOptions,
                    subRootDir,
                    origin
                });

                match = match.replace(regexRequiredPath, solvedAbsoluteRequire);
            }
            else // Third party libraries
            {
                let solvedPath = resolveThirdParty(text, list, {
                    source,
                    rootDir,
                    outputDir,
                    workingDir,
                    importMaps,
                    nonHybridModuleMap,
                    regexRequiredPath,
                    moreOptions,
                    match,
                    subRootDir,
                    origin
                });

                match = match.replace(regexRequiredPath, solvedPath);
            }


            /* istanbul ignore next */
            return match;
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 3030}, "", e.message);
        }

    });

    text = putBackComments(text, sourceExtractedComments, commentMasks);

    text = putBackRegexes(text, sourceExtractedRegexes);

    return text;
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
    const parsedFilePath = joinPath(workingDir, fileProp.source);
    const parsedFileDir = path.dirname(parsedFilePath);

    const re = /require\(["'`]([.\/][^)]+)["'`]\)/gmu;

    return text.replace(re, function (match, group)
    {
        const target = joinPath(parsedFileDir, group);
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
            const possibleFilePath = joinPath(workingDir, source);
            return (targets.includes(possibleFilePath));
        });

        if (index < 0)
        {
            return match;
        }

        // current file's absolute path
        const sourcePath = resolvePath(fileProp.outputDir);

        const {source, outputDir} = list[index];
        const basename = path.parse(source).name;

        // Absolute path in the "require"
        const destinationPath = resolvePath(outputDir);

        let relativePath = path.relative(sourcePath, destinationPath);
        relativePath = joinPath(relativePath, basename + ESM_EXTENSION);
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

    // Convert exports = module.exports = ... to module.exports =
    converted = converted.replace(/\bexports\b\s*=\s*module.exports\s*=/, "module.exports =");

    // Convert module.exports = exports = ... to module.exports =
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
    converted = converted.replace(/(^\s*)(?:\bmodule\b\.)?\bexports\b\s*=/gm, "$1export default");

    // Convert module.exports.default to export default
    converted = converted.replace(/(^\s*)(?:\bmodule\b\.)?\bexports\b\.default\s*=/gm, "$1export default");

    // Convert module.exports.something to export something
    converted = converted.replace(/(^\s*)(?:\bmodule\b\.)?\bexports\b\.([\w]+)\s*=/gm, "$1export const $2 =");

    const arr = converted.split("export default");
    const defaultExportNumber = arr.length - 1;
    if (defaultExportNumber > 1)
    {
        const twiceExported = arr[1].trim().split(/\W/)[0];
        console.log({
            lid  : 1016,
            color: "yellow"
        }, `${defaultExportNumber} default exports detected => \`export default ${twiceExported}\` `);
        console.log({lid: 1018, color: "yellow"}, "Assure that you have only one export (or none) of type " +
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
        let absPath = resolvePath(source);
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
        console.error({lid: 3032}, "", e.message);
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
 * @param sourceAbs
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param moreOptions
 * @returns {string|*}
 * @private
 */
const applyExtractedASTToImports = (converted, extracted, list, {
    source,
    sourceAbs,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    moreOptions,
    origin
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
                        source, sourceAbs, outputDir, rootDir, importMaps,
                        nonHybridModuleMap, workingDir, moreOptions, origin
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
                console.error({lid: 3034}, "", e.message);
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
        console.error({lid: 3036}, "", e.message);
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
 * @param sourceAbs
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param moreOptions
 * @param debuginput
 * @returns {{converted, success: boolean}}
 */
const convertRequiresToImportsWithAST = (converted, list, {
    source,
    sourceAbs,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    moreOptions,
    debuginput,
    origin
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
            console.warn({lid: 1052}, ` WARNING: Syntax issues found on [${sourceAbs}]`);
            console.error({lid: 3038}, " ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ", e.message);
            return {converted, success: false};
        }

        let text, start, end, requirePath, identifier;

        const previouses = [];

        let writeStream;
        let readable;

        if (debuginput)
        {
            const debugPath = joinPath(DEBUG_DIR, source + ".json");
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
                    console.error({lid: 3040}, e.message);
                }
            },
            leave: function (node, parent)
            {
                try
                {
                    if (end > 0)
                    {
                        end = parent.range[1];
                        let eventualSemiColon = converted.substring(end);
                        if (eventualSemiColon.length && eventualSemiColon[0])
                        {
                            ++end;
                        }

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
                    console.error({lid: 3042}, "", e.message);
                }
            }
        });

        if (detectedAmbiguous.length)
        {
            converted = convertAmbiguous(converted, detectedAmbiguous);
        }

        converted = applyExtractedASTToImports(converted, extracted, list, {
            source,
            sourceAbs,
            outputDir,
            rootDir,
            importMaps,
            nonHybridModuleMap,
            workingDir,
            moreOptions,
            origin
        });
        converted = removeDeclarationForAST(converted, extracted);
        return {converted, success, detectedExported, detectedAmbiguous, detectedBlockFunctions};
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3044}, ` [${source}] ->`, e.message);
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

const escapeDollar = function (text)
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
        str = str.replace(mask, escapeDollar(extracted[i]));
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


const loadRegex = (regexName) =>
{
    if (REGEXES[regexName])
    {
        return REGEXES[regexName];
    }

    const regexPath = joinPath(__dirname, "regexes", "to-esm-" + regexName + ".txt");
    let content = fs.readFileSync(regexPath, {encoding: "utf-8"});

    REGEXES[regexName] = content;
    return content;
};

const runRegex = (regexName, target, {content, replacement}) =>
{
    let regexString = loadRegex(regexName);
    regexString = regexString.replaceAll("######", target);

    const regexp = new RegExp(regexString, "gm");
    const converted = content.replace(regexp, replacement);
    return {converted, regexp};
};

/**
 * Apply command found in source code comments
 * @param converted
 * @param target
 * @param saved
 */
const applyDirectives = (converted, {target = TARGET.ALL} = {}) =>
{
    const directives = [TARGET.ALL];
    if (target !== TARGET.ALL)
    {
        directives.push(target);
    }

    let regexp;
    for (let i = 0; i < directives.length; ++i)
    {
        const target = directives[i];
        ({converted} = runRegex("remove", target, {content: converted, replacement: ""}));
        ({converted} = runRegex("add", target, {content: converted, replacement: "$1"}));
    }

    // Hide/skip => to-esm-browser: skip
    regexp = new RegExp(`\\/\\*\\*\\s*to-esm-(${directives.join("|")})\\s*:\\s*skip\\s*\\*\\*\\/([\\s\\S]*?)\\/\\*\\*\\s*to-esm-\\1\\s*:\\s*end-skip\\s*\\*\\*\\/`, "gm");
    converted = hideText(regexp, converted);

    return converted;
};

/**
 * Clean code from remaining directives
 * @param converted
 * @returns {*}
 */
const cleanDirectives = (converted) =>
{
    let regexp;

    [TARGET.ALL, TARGET.ESM, TARGET.BROWSER].forEach((currentTarget) =>
    {
        // Insert => to-esm-browser: add
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${currentTarget}\\s*:\\s*add\\s*([\\s\\S]*?)\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");

        // Remove => to-esm-browser: remove
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${currentTarget}\\s*:\\s*remove\\s*\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${currentTarget}\\s*:\\s*end-remove\\s*\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");

        // Remove => to-esm-browser: skip
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${currentTarget}\\s*:\\s*skip\\s*\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");
        regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${currentTarget}\\s*:\\s*end-skip\\s*\\*\\*\\/`, "gm");
        converted = converted.replace(regexp, "");

    });

    return converted;
};


/**
 * Generate an object describing a file to convert
 * @param {string} source Relative path to the .cjs source
 * @param rootDir
 * @param {string} outputDir Relative path to the "install" directory
 * @param isAbsolutePath
 * @param {ORIGIN_ADDING_TO_INDEX} origin
 * @param {string} moduleName Only exists when the system detects a "require" to a third party
 * @param {string} workingDir We need the working dir to update the package.json "import" field as everything in it is
 * relative to the project root dir
 * @param moreOptions
 * @param externalSource
 * @param subRootDir
 * @returns {{pkgImportPath: string, sourceAbs: string, subDir, mjsTarget: (*), rootDir: string, weight: number,
 *     source: string, subPath: *, id: string}}
 */
const formatIndexEntry = ({
                              source,
                              rootDir,
                              outputDir,
                              isAbsolutePath,
                              origin,
                              moduleName,
                              workingDir,
                              moreOptions,
                              externalSource,
                              subRootDir
                          }) =>
{
    try
    {
        // Absolute path to the .cjs (must exist)
        let sourceAbs, paths;

        rootDir = normaliseDirPath(rootDir);

        let targetName;

        if (isAbsolutePath)
        {
            sourceAbs = source;
            const infoPath = path.parse(source);
            const filename = infoPath.base;

            if (isResolveAbsoluteMode(moreOptions))
            {
                outputDir = resolvePath(outputDir);
                let subPath = path.relative(outputDir, sourceAbs);
                subPath = normalisePath(subPath);

                let info = path.parse(subPath);
                let subDir = info.dir;
                subDir = normaliseDirPath(subDir);
                targetName = info.base;
                paths = {subDir, subPath};
            }
            else
            {
                // _root is the special folder where external files will be copied
                let subDir = normaliseDirPath(GENERATED_ROOT_FOLDER_NAME);
                subDir = joinPath(subDir, infoPath.dir);
                paths = {subDir, subPath: filename};
            }

        }
        else
        {
            sourceAbs = joinPath(rootDir, source);
            paths = subtractPath(sourceAbs, rootDir);
        }

        sourceAbs = normalisePath(sourceAbs);

        // Extract destination folder and path
        let {subPath, subDir} = paths;

        let isThirdParty = false;
        if (origin === ORIGIN_ADDING_TO_INDEX.RESOLVE_THIRD_PARTY)
        {
            isThirdParty = true;
            if (moreOptions.extras.nmBrowserImported !== "node_modules")
            {
                subPath = subPath.replace(/\bnode_modules\b/, moreOptions.extras.nmBrowserImported);
                subDir = subDir.replace(/\bnode_modules\b/, moreOptions.extras.nmBrowserImported);
            }
        }

        targetName = targetName || path.parse(subPath).name + ESM_EXTENSION;

        let mjsTarget;

        if (subRootDir && subDir.indexOf(subRootDir) === 0)
        {
            subDir = subDir.substring(subRootDir.length);
            subDir = subDir || "./";
        }

        mjsTarget = joinPath(subDir, targetName);
        subPath = joinPath(subDir, targetName);

        const mjsTargetAbs = joinPath(outputDir, subPath);

        let pkgImportPath = path.relative(workingDir, mjsTargetAbs);
        pkgImportPath = normalisePath(pkgImportPath);

        if (origin === ORIGIN_ADDING_TO_INDEX.RESOLVE_THIRD_PARTY)
        {
            console.log({lid: 1020}, {
                lid  : 1094,
                color: "orange"
            }, `[${moduleName}] will use [${mjsTarget}] in the generated source`);
        }

        source = normalisePath(source);

        let id = crypto
            .createHash("sha256")
            .update(source)
            .digest("hex");

        return {
            source,
            sourceAbs,
            mjsTarget,
            mjsTargetAbs,
            pkgImportPath,
            rootDir,
            subPath,
            subDir,
            id,
            weight: 1,
            externalSource,
            isThirdParty,
            origin
        };
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3046}, e.message);
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
        console.error({lid: 3048}, "", e.message);
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
            const jsPath = joinPath(root, newMaps.imports[kk]);
            newMaps.imports[kk] = normalisePath(jsPath);
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error({lid: 3050}, "", e.message);
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
            console.error({lid: 3052}, "", e.message);
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
        let fullHtmlPath = resolvePath(htmlPath);
        /* istanbul ignore next */
        if (!fs.existsSync(fullHtmlPath))
        {
            console.error({lid: 3054}, ` Could not find HTML file at [${fullHtmlPath}]`);
            return;
        }

        // Get merged version of importmap from html page and importmap from parsing
        let newMaps = getImportMapFromPage(fullHtmlPath);

        newMaps = combineImportMaps(newMaps, importMaps);

        newMaps = rewriteImportMapPaths(newMaps, htmlPath);

        newMaps = applyReplaceToImportMap(newMaps, htmlOptions);

        newMaps = combineImportMaps(newMaps, htmlOptions.importmap);

        writeImportMapToHTML(newMaps, fullHtmlPath);

        console.log({lid: 1022}, `"${fullHtmlPath}" has been successfully updated`);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3056}, e.message);
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
        console.log({lid: 1024}, `Processing [${html}] for importing maps.`);
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
                importMaps, workingDir, moreOptions, nonHybridModuleMap
            });
        dumpData(converted, source, "reviewEsmImports");

        converted = putBackComments(converted, extractedComments);
        dumpData(converted, source, "putBackComments");
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3058}, "", e.message);
    }
    return converted;
};

const getOptionsConfigFile = async (configPath) =>
{
    let confFileOptions = {};

    configPath = resolvePath(configPath);
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
                console.error({lid: 3060}, " Skipping config file options", e.message);
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

/**
 * Returns information (version + whether it is installed) related to a module
 * @param modulePackname
 * @returns {{installed: boolean}}
 */
const getLibraryInfo = (modulePackname) =>
{
    const info = {
        installed: false
    };
    try
    {
        let installedLocation, dir;
        installedLocation = findPackageEntryPoint(modulePackname);
        if (!installedLocation)
        {
            return info;
        }

        installedLocation = installedLocation.split(modulePackname)[0];

        // Module check
        dir = joinPath(installedLocation, "..");
        const packageJsonPath = joinPath(dir, "package.json");
        const packageJson = require(packageJsonPath);

        if (!packageJson?.dependencies)
        {
            info.installed = false;
            return info;
        }

        info.installed = !!packageJson.dependencies[modulePackname];
        if (!info.installed)
        {
            return info;
        }

        dir = dir || path.parse(installedLocation).dir;

        // Dependency check
        const dependencyPackageJsonPath = joinPath(dir, "package.json");
        const dependencyPackageJson = require(dependencyPackageJsonPath);
        info.version = dependencyPackageJson.version;

    }
    catch (e)
    {
        console.error({lid: 2211}, e.message);
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
            if (info.installed)
            {
                if (info.version)
                {
                    if (version.split(info.version).length === 1 || version.split(info.version).length === 2)
                    {
                        console.log({lid: 1142}, `The package [${moduleName}${version}] is already installed as [${name}]`);
                        return;
                    }

                    if (info.version.indexOf("latest") > -1)
                    {
                        return;
                    }
                }
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
        console.info({lid: 3144}, "✔ Success");
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

        let packageJsonPath = resolvePath("./package.json");
        /* istanbul ignore next */
        if (!fs.existsSync(packageJsonPath))
        {
            console.error({lid: 3062}, " Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.");
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
            }
            catch (e)
            {
                /* istanbul ignore next */
                console.error({lid: 3064}, "", e.message);
            }
        }

        return nonHybridModules;
    }
    catch (e)
    {
        console.error({lid: 3066}, e);
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
        console.error({lid: 3068}, e);
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
        console.error({lid: 3070}, e);
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
        content = stripRegexes(content);

        const regexp = new RegExp(`\\bfrom\\b +["'] *\\b(${nativeModules.join("|")})\\b *["']`);
        const hasCore = regexp.test(content);
        return !hasCore;
    }
    catch (e)
    {
        console.error({lid: 3072}, e);
    }

    /* istanbul ignore next */
    return false;
};

/**
 * Returns file info if the file has already been parsed by to-esm
 * @param source
 * @param propertyName
 * @returns {null|*|{}}
 */
const findEntry = (source, propertyName = "sourceAbs") =>
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
 * Look if the required file exists in one of the suggested folder,
 * then if found calculate its path relatively to its source.
 * @param regexRequiredPath Required path as written in the source file
 * @param {string} source The source path file that does the import
 * @param {string} rootDir
 * @param {string[]} lookupDirLists List of folders to look for the required file from
 * @param outputDir
 * @returns {{requiredAbsolutePath: (*), requiredRootDir: *, idRequiredPath: (*|string), relativeRequiredPath:
 *     (*|string)}|null}
 */
const getRelativePathsAgainstSuggestedRoots = ({regexRequiredPath, source, rootDir, lookupDirLists = [], outputDir}) =>
{
    // let sourceAbs = joinPath(rootDir, source);
    let targetAbs = joinPath(outputDir, source);
    let targetDir = path.parse(targetAbs).dir;

    let rootDirs = JSON.parse(JSON.stringify(lookupDirLists));

    for (let i = 0; i < rootDirs.length; ++i)
    {
        let requiredRootDir = rootDirs[i];
        requiredRootDir = resolvePath(requiredRootDir);
        let requiredAbsolutePath = joinPath(requiredRootDir, regexRequiredPath);
        if (fs.existsSync(requiredAbsolutePath))
        {
            let relativeRequiredPath = path.relative(rootDir, requiredAbsolutePath);
            relativeRequiredPath = normalisePath(relativeRequiredPath);

            let idRequiredPath = path.relative(targetDir, requiredAbsolutePath);
            idRequiredPath = normalisePath(idRequiredPath);
            return {requiredRootDir, requiredAbsolutePath, idRequiredPath, relativeRequiredPath};
        }
    }

    return null;
};

/**
 * Add a file to the file list to parse. All added files must have their paths relative to rootDir.
 * If a path cannot be calculated based on rootDir, it must be passed as absolute and a copy
 * should be created in ./{rootDir}/__root/...
 * @param {string} source .cjs Source path (relative to rootDir)
 * @param {string} rootDir All .cjs Root dir
 * @param {string} outputDir .mjs Destination directory
 * @param {boolean} notOnDisk Whether the entry should be saved on disk
 * @param referrer
 * @param {boolean} isEntryPoint
 * @param {boolean} isAbsolutePath
 * @param {*} moreOptions
 * @param origin
 * @param moduleName
 * @param workingDir
 * @param externalSource
 * @param subRootDir
 * @returns {CjsInfoType|null}
 */
const addFileToIndex = ({
                            source,
                            rootDir,
                            notOnDisk,
                            referrer = null,
                            isEntryPoint = false,
                            isAbsolutePath = false,
                            moreOptions = {},
                            origin = "",
                            moduleName = null,
                            workingDir,
                            outputDir,
                            externalSource = false,
                            subRootDir = ""
                        }) =>
{
    try
    {
        let sourceAbs = path.isAbsolute(source) ? source : joinPath(rootDir, source);
        if (!fs.existsSync(sourceAbs))
        {
            const file = path.parse(sourceAbs);
            const sourceAbsNoExt = joinPath(file.dir, file.name);

            let found = false;
            let foundPath = "";
            let possibleCjsExtensions = [".js", ".json", ".node"];
            for (let i = 0; i < possibleCjsExtensions.length; ++i)
            {
                const extension = possibleCjsExtensions[i];
                foundPath = joinPath(sourceAbsNoExt + extension);
                if (fs.existsSync(foundPath))
                {
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                if (!referrer)
                {
                    console.error({lid: 3074}, `Could not find the file [${sourceAbs}]`);
                    return null;
                }

                const referrerAbs = joinPath(rootDir, referrer);
                console.error({lid: 3076}, `Could not find the file [${sourceAbs}] from [${referrerAbs}]`);
                return null;
            }

            sourceAbs = normalisePath(foundPath);
            source = calculateRelativePath(rootDir, sourceAbs);
        }

        if (!fs.existsSync(sourceAbs))
        {
            const referrerAbs = joinPath(rootDir, referrer);
            console.error({lid: 3078}, `Could not find the file [${sourceAbs}] from [${referrerAbs}]`);
            return null;
        }

        const entryReferer = findEntry(referrer) || {weight: 1};
        let entry = findEntry(source);
        if (!entry)
        {
            entry = formatIndexEntry({
                source,
                rootDir,
                isAbsolutePath,
                moreOptions,
                origin,
                moduleName,
                workingDir,
                outputDir,
                externalSource,
                subRootDir
            });
        }

        entry.weight = entry.weight + entryReferer.weight;
        entry.notOnDisk = !!notOnDisk;
        entry.isEntryPoint = isEntryPoint;
        entry.referrers = entry.referrers || [];
        if (referrer)
        {
            ++entry.weight;
            entry.referrers.push(referrer);
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
    }
    catch (e)
    {
        console.error({lid: 3080}, e.message);
    }

    return null;
};

/**
 * Reset references to converted files, so the system can redo conversions
 * multiple times (watchers)
 */
const resetIndex = () =>
{
    // Fastest way to clear an array and keep the reference
    cjsList.length = 0;
    indexGeneratedTempVariable = 1;
    dumpCounter = 0;
};

const getIndexedItems = () =>
{
    return cjsList;
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
        console.error({lid: 3082}, "", e.message);
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
        console.error({lid: 3084}, "", e.message);
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
const insertHeader = (converted, {source}, {noHeader = false} = {}) =>
{
    if (noHeader)
    {
        return converted;
    }

    converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * @see [${source}]{@link ${source}}
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
 * @param cjsBundlePath
 * @param browserBundlePath
 * @param useBundle
 * @returns {boolean}
 */
const updatePackageJson = async ({
                                     entryPoint,
                                     workingDir,
                                     target,
                                     useImportMaps,
                                     importMaps,
                                     bundlePath,
                                     cjsBundlePath,
                                     browserBundlePath,
                                     useBundle
                                 } = {}) =>
    {
        if (!entryPoint)
        {
            console.error({lid: 3086}, "Can not update package.json. The option --entrypoint was not set.");
            return false;
        }

        const packageJsonLocation = joinPath(workingDir, "./package.json");

        /* istanbul ignore next */
        if (!fs.existsSync(packageJsonLocation))
        {
            console.error({lid: 3088}, ` package.json not in [${packageJsonLocation}].`);
            return false;
        }

        let json;

        try
        {
            let content = fs.readFileSync(packageJsonLocation, "utf-8") || "";
            /* istanbul ignore next */
            if (!content.trim())
            {
                console.error({lid: 3090}, " package.json is empty or invalid.");
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

            let requireSource = entryPoint.source;
            /**
             * pkgImportPath is evaluated in {@link formatIndexEntry}
             * @type {string}
             */
            let importSource = entryPoint.pkgImportPath;

            if (useBundle && bundlePath)
            {
                importSource = bundlePath;
            }

            if (useBundle && cjsBundlePath)
            {
                requireSource = cjsBundlePath;
            }

            if (target === TARGET.BROWSER)
            {
                const browserField = json.browser;
                if (typeof browserField === "string" || !browserField)
                {
                    let target = bundlePath || entryPoint.target;
                    if (useBundle && browserBundlePath)
                    {
                        target = browserBundlePath;
                    }
                    if (target)
                    {
                        json.browser = target;
                    }
                }
                else
                {
                    console.error({lid: 3092}, "The field browser is already set to a non string value. It will not" +
                        " be updated");
                }
            }
            else
            {
                const entry = {
                    "require": requireSource,
                    "import" : importSource
                };

                // json.type = "module";
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
                        console.log({lid: 1026}, "Cannot update package.json. Expecting exports key to be an object.");
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

            console.log({lid: 1028});
            console.log({lid: 1030}, " ================================================================");
            console.log({lid: 1032}, " package.json updated");
            console.log({lid: 1034}, " ----------------------------------------------------------------");
            console.log({lid: 1036}, " Your package.json has successfully been updated (--update-all option)");
        }
        catch
            (e)
        {
            /* istanbul ignore next */
            console.error({lid: 3094}, " Could not update package.json.");
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
 * @param platform
 * @returns {Promise<unknown>}
 */
const minifyESMCode = async (entryPointPath, bundlePath, target, {
    minify = true,
    sourcemap = false,
    platform = ""
} = {}) =>
{
    try
    {
        const minifyDir = path.parse(bundlePath).dir;
        buildTargetDir(minifyDir);

        entryPointPath = resolvePath(entryPointPath);
        bundlePath = resolvePath(bundlePath);

        await esbuild.build({
            entryPoints   : [entryPointPath],
            bundle        : true,
            outfile       : bundlePath,
            sourcemap,
            format        : "esm",
            target        : "esnext",
            minify,
            legalComments : "eof",
            allowOverwrite: true,
            platform
        });

        let content = fs.readFileSync(bundlePath, "utf-8");
        content = content.replace(/\/\*! [^*]+\*\//g, "");
        fs.writeFileSync(bundlePath, content);

        displaySuccessBundleMessage(bundlePath, target);

        return {success: true, content};
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3096, target: "DEBUG"}, `Fail to bundle: ${e.message}`);
    }

    return {success: false};
};

const minifyCJSCode = async (entryPointPath, bundlePath, target, {minify = true, sourcemap = false} = {}) =>
{
    try
    {
        const minifyDir = path.parse(bundlePath).dir;
        buildTargetDir(minifyDir);

        entryPointPath = resolvePath(entryPointPath);
        bundlePath = resolvePath(bundlePath);

        await esbuild.build({
            entryPoints   : [entryPointPath],
            bundle        : true,
            outfile       : bundlePath,
            sourcemap,
            format        : "cjs",
            target        : "node" + process.version.split(".")[0].replace("v", ""),
            minify,
            legalComments : "eof",
            allowOverwrite: true,
            platform      : "node"
        });

        let content = fs.readFileSync(bundlePath, "utf-8");
        content = content.replace(/\/\*! [^*]+\*\//g, "");
        fs.writeFileSync(bundlePath, content);

        displaySuccessBundleMessage(bundlePath, TARGET.CJS);

        return {success: true, content};
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error({lid: 3098}, `Fail to bundle: ${e.message}`);
    }

    return {success: false};
};

const displaySeparator = ({width = 64} = {}) =>
{
    console.log({lid: 1038});
    console.log({lid: 1040}, "".padEnd(width, "."));
};

const displaySuccessBundleMessage = (bundlePath, target) =>
{
    console.log({lid: 1042});
    displaySeparator();
    console.log({lid: 1044, color: "orange"}, ` Bundle generated for ${target} => ${bundlePath}`);
    console.log({lid: 1046}, "Usage: ");

    if (target === TARGET.CJS)
    {
        console.log({lid: 1048}, ` require("${bundlePath}")`);
    }
    else if (target === TARGET.ESM)
    {
        console.log({lid: 1050}, ` import ... from "${bundlePath}"`);
    }
    else if (target === TARGET.BROWSER)
    {
        console.log({lid: 1052}, ` <script type="module" src="${bundlePath}"></script>`);
        console.log({lid: 1054}, " from your html code");
    }

};

/**
 * Bundle generated ESM code into minified bundle
 * @param cjsList
 * @param entryPointPath
 * @param target
 * @param bundlePath
 */
const bundleResults = async (entryPointPath, {
    target = TARGET.BROWSER,
    bundlePath = "./",
    cjsBundlePath = "",
    browserBundlePath = "",
    minify = true,
    sourcemap = false,
    cjsEntryPath = "",
    extrasInfos = {}
}) =>
{
    try
    {
        let resBundlePath = {};
        if (bundlePath)
        {
            resBundlePath = await minifyESMCode(entryPointPath, bundlePath, TARGET.ESM, {
                minify,
                sourcemap,
                platform: "node"
            });

            if (!resBundlePath.success)
            {
                console.error({lid: 3100}, ` Failed to minify ${target}`);
                return false;
            }

            extrasInfos.esmBundleCode = resBundlePath.content;
        }

        let resBrowserBundlePath = {};
        if (browserBundlePath)
        {
            if (isBrowserCompatible(entryPointPath))
            {
                resBrowserBundlePath = await minifyESMCode(entryPointPath, browserBundlePath, TARGET.BROWSER, {
                    minify,
                    sourcemap
                });
                if (!resBrowserBundlePath.success)
                {
                    console.error({lid: 3102}, ` Failed to minify ${TARGET.BROWSER}`);
                }
            }
            else
            {
                displaySeparator();
                console.error({lid: 3104}, `${entryPointPath} is not browser compatible. Skipping bundle generation for ${TARGET.BROWSER}`);
            }

            extrasInfos.browserBundleCode = resBrowserBundlePath.content;
        }

        let resCjsBundlePath = {};
        if (cjsBundlePath)
        {
            resCjsBundlePath = await minifyCJSCode(cjsEntryPath, cjsBundlePath, TARGET.CJS, {
                minify,
                sourcemap,
                platform: "node"
            });

            if (!resCjsBundlePath.success)
            {
                console.error({lid: 3106}, ` Failed to minify ${TARGET.CJS}`);
                return false;
            }

            extrasInfos.cjsBundleCode = resCjsBundlePath.content;
        }

        return true;
    }
    catch (e)
    {
        console.error({lid: 4515}, e.message);
    }

    return false;
};

const removeCommentLikeElement = (str, {
    sourceExtractedComments,
    sourceExtractedStrings,
    sourceExtractedRegexes
}, source = null) =>
{
    str = stripCodeComments(str, sourceExtractedComments, commentMasks);
    source && dumpData(str, source, "hideKeyElementCode - stripCodeComments");

    str = stripCodeStrings(str, sourceExtractedStrings);
    source && dumpData(str, source, "hideKeyElementCode - stripCodeStrings");

    str = stripCodeRegexes(str, sourceExtractedRegexes);
    source && dumpData(str, source, "hideKeyElementCode - stripCodeRegexes");

    return str;
};

const hideKeyElementCode = (str, source) =>
{
    sourceExtractedComments = [];
    sourceExtractedStrings = [];
    sourceExtractedRegexes = [];

    str = removeCommentLikeElement(str, {
        sourceExtractedComments,
        sourceExtractedStrings,
        sourceExtractedRegexes
    }, source);

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
            console.log({lid: 1056, color: "#333333"}, " More than one default detected. Only the first one" +
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
 * Copy converted file into index
 * @param converted
 * @param entry
 * @param moreOptions
 */
const writeConvertedIntoIndex = (converted, entry, moreOptions) =>
{
    try
    {
        const {source, mjsTarget} = entry;

        const parsingResult = parseEsm(source, converted);
        entry.success = parsingResult.success;

        let reportSuccess = parsingResult.success ? "✔ SUCCESS" : "✔ CONVERTED (with fallback)";
        if (!parsingResult.success)
        {
            let e = parsingResult.error;
            console.error({lid: 3108}, " " + toAnsi.getTextFromHex("ERROR: Conversion" +
                " may have failed even with fallback processing on" +
                ` [${mjsTarget}]`, {fg: "#FF0000"}));
            console.error({lid: 3110}, " " + toAnsi.getTextFromHex(`LINE:${e.lineNumber} COLUMN:${e.column}: ${e.message}`, {fg: "#FF2000"}));
            reportSuccess = "❌ FAILED";
            console.log({lid: 1058}, " Note that the file is still generated to allow error checking and manual updates.");
        }

        if (moreOptions.extras.isTemporaryOutputDir)
        {
            console.log({lid: 1060}, ` ${reportSuccess}: [${source}] processed successfully`);
        }
        else
        {
            console.log({lid: 1062}, ` ${reportSuccess}: Converted [${source}] to [${mjsTarget}]`);
        }

        entry.converted = converted;
    }
    catch (e)
    {
        console.error({lid: 3112}, e.message);
    }
};

/**
 * Write all converted files on disk
 * @param moreOptions
 */
const writeResultOnDisk = (moreOptions) =>
{
    try
    {
        const n = cjsList.length;
        for (let i = 0; i < n; ++i)
        {
            try
            {
                const entry = cjsList[i];
                if (!entry)
                {
                    console.error({lid: 3116}, `Invalid entry detected:`, entry);
                    continue;
                }

                const {source, subDir, notOnDisk, converted, mjsTarget} = entry;
                if (notOnDisk)
                {
                    continue;
                }

                const mjsTargetAbs = joinPath(moreOptions.outputDir, mjsTarget);
                let overwrite = true;
                if (fs.existsSync(mjsTargetAbs))
                {
                    const content = fs.readFileSync(mjsTargetAbs, "utf-8");
                    const regexp = new RegExp("\\/\\*\\*\\s*to-esm-\\w+:\\s*do-not-overwrite", "gm");
                    if (regexp.test(content))
                    {
                        overwrite = false;
                        console.log({lid: 1064}, {
                            lid  : 1600,
                            color: "#00FF00"
                        }, ` [${source}] contain the directive "do-not-overwrite". Skipping.`);
                    }
                }

                if (overwrite && !moreOptions.extras.keepexisting)
                {
                    if (mjsTargetAbs.indexOf(moreOptions.outputDir) === -1)
                    {
                        if (!isResolveAbsoluteMode(moreOptions))
                        {
                            console.error({lid: 3118}, `Source path miscalculation: [${mjsTargetAbs}]`);
                        }
                    }
                    else
                    {
                        const destinationDir = joinPath(moreOptions.outputDir, subDir);
                        buildTargetDir(destinationDir);
                        fs.writeFileSync(mjsTargetAbs, converted, "utf-8");
                    }
                }
            }
            catch (e)
            {
                console.error({lid: 3120}, `Failed to write [${source}] on disk: ${e.message}`);
            }

        }

        return true;
    }
    catch (e)
    {
        console.error({lid: 3122}, e.message);
    }

    return false;
};


/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param replaceStart
 * @param replaceEnd
 * @param nonHybridModuleMap
 * @param workingDir
 * @param importMaps
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noHeader Whether to add extra info on top of converted file
 * @param debuginput
 * @param moreOptions
 * @param rootDir
 */
const convertCjsFiles = (list, {
    replaceStart = [],
    replaceEnd = [],
    nonHybridModuleMap = {},
    workingDir,
    noHeader = false,
    importMaps = {},
    outputDir = "",
    debuginput = "",
    moreOptions = {},
    rootDir,
} = {}) =>
{
    if (!list || !list.length)
    {
        console.info({lid: 1010}, "No file to convert.");
        return false;
    }

    let success = true;

    for (let dynamicIndex = 0; dynamicIndex < list.length; ++dynamicIndex)
    {
        try
        {
            let cjsItem = list[dynamicIndex];
            if (!cjsItem)
            {
                console.log({lid: 1066}, `Invalid entry detected in index: ${dynamicIndex}`);
                continue;
            }

            let {source, sourceAbs, origin} = cjsItem;

            console.log({lid: 1068}, " ================================================================");
            console.log({lid: 1070}, ` Processing: ${source}`);
            console.log({lid: 1072}, " ----------------------------------------------------------------");

            resetAll();

            let converted = fs.readFileSync(sourceAbs, "utf-8");
            dumpData(converted, source, "read-file");

            converted = applyDirectives(converted, {...moreOptions.extras});
            dumpData(converted, source, "apply-directives");

            converted = applyReplaceFromConfig(converted, replaceStart);
            dumpData(converted, source, "replace-from-config-file");

            if (isCjsCompatible(sourceAbs, converted))
            {
                converted = removeShebang(converted);
                dumpData(converted, source, "remove-shebang");

                converted = convertComplexRequiresToSimpleRequires(converted, source);
                dumpData(converted, source, "convert-complex-requires-to-simple-requires");

                converted = convertJsonImportToVars(converted, {
                    source,
                });
                dumpData(converted, source, "convert-json-import-to-vars");

                let result, success;
                result = convertRequiresToImportsWithAST(converted, list,
                    {
                        source,
                        sourceAbs,
                        outputDir,
                        rootDir,
                        importMaps,
                        nonHybridModuleMap,
                        workingDir,
                        moreOptions,
                        debuginput,
                        origin
                    });

                converted = result.converted;
                success = result.success;

                dumpData(converted, source, "convertRequiresToImportsWithAST");

                list[dynamicIndex].exported = result.detectedExported;

                if (moreOptions.firstPass)
                {
                    continue;
                }

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
                    console.error({lid: 3124}, ` Applying fallback process to convert [${source}]. The conversion may result in errors.`);
                    converted = convertToESMWithRegex(converted,
                        list,
                        {
                            source,
                            outputDir,
                            rootDir,
                            importMaps,
                            nonHybridModuleMap,
                            workingDir,
                            moreOptions
                        });
                    dumpData(converted, source, "convertToESMWithRegex");
                }

                converted = moveEmbeddedImportsToTop(converted, source);
                dumpData(converted, source, "moveEmbeddedImportsToTop");

                converted = putBackAmbiguous(converted);
                dumpData(converted, source, "putBackAmbiguous");

                converted = restoreText(converted);
                dumpData(converted, source, "restoreText");

                converted = insertDirname(converted);
                dumpData(converted, source, "insertDirname");

                converted = insertHeader(converted, cjsItem, {noHeader: noHeader});
                dumpData(converted, source, "insertHeader");
            }
            else
            {
                converted = reviewEsmImports(converted, list,
                    {
                        source, outputDir, rootDir, importMaps,
                        nonHybridModuleMap, workingDir, moreOptions
                    });
                dumpData(converted, source, "reviewEsmImports");
            }

            converted = applyReplaceFromConfig(converted, replaceEnd);
            dumpData(converted, source, "applyReplaceFromConfig");

            converted = normaliseString(converted);
            dumpData(converted, source, "normaliseString");

            converted = cleanDirectives(converted);
            dumpData(converted, source, "clean-directives");

            converted = removeResidue(converted);
            dumpData(converted, source, "removeResidue");

            converted = restoreShebang(converted);

            // ******************************************
            writeConvertedIntoIndex(converted, cjsItem, moreOptions);

            // Newline
            console.log({lid: 1074});

            if (!cjsItem.success)
            {
                success = false;
            }
        }
        catch (e)
        {
            /* istanbul ignore next */
            success = false;
            /* istanbul ignore next */
            console.error({lid: 3126}, "", e.message);
        }
    }

    return success;
};

/**
 * Look for .to-esm config path, so to load automatically a configuration.
 * @returns {string} Returns .to-esm config path if found
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
            let esmPath = resolvePath(toEsmConfigName + extension);
            esmPath = normalisePath(esmPath);

            if (fs.existsSync(esmPath) && fs.lstatSync(esmPath).isFile())
            {
                return esmPath;
            }
        }
    }
    catch (e)
    {
        console.error({lid: 3128}, "", e.message);
    }

    return "";
};

/**
 * Find all sources against the given masks
 * All filepath returned are relative to rooDir
 * @param inputFileMaskArr
 * @param rootDir
 * @returns {*[]}
 */
const findCjsSources = (inputFileMaskArr, {rootDir}) =>
{
    let list = [];
    try
    {
        for (let i = 0; i < inputFileMaskArr.length; ++i)
        {
            const inputFileMask = inputFileMaskArr[i];

            const fileList = glob.sync(inputFileMask, {
                dot     : true,
                nodir   : true,
                cwd     : rootDir,
                realpath: true
            });

            /* istanbul ignore next */
            if (!fileList.length)
            {
                continue;
            }

            fileList.forEach((filepath) =>
            {
                filepath = calculateRelativePath(rootDir, filepath);
                list.push(filepath);
            });
        }
        list = [...new Set(list)];
    }
    catch (e)
    {
        console.error({lid: 3132}, e.message);
    }

    return list;
};

/**
 * Add entries to the to-convert-source list
 * @param entryPointPath
 * @param list
 * @param inputFileMaskArr
 * @returns {CjsInfoType[]}
 */
const populateCjsList = (entryPointPath, list = [], {rootDir, outputDir, workingDir, subRootDir = ""}) =>
{
    const validList = [];
    try
    {
        if (entryPointPath)
        {
            list.unshift(entryPointPath);
        }

        let isEntryPoint = true;
        list.forEach((source) =>
        {
            try
            {
                const entry = addFileToIndex({
                    source,
                    rootDir,
                    outputDir,
                    isEntryPoint,
                    origin: ORIGIN_ADDING_TO_INDEX.START,
                    workingDir,
                    subRootDir
                });

                if (!entry)
                {
                    return;
                }

                validList.push(entry);
                isEntryPoint = false;
            }
            catch (e)
            {
                console.error({lid: 3134}, `Failed to add ${source} to index: ${e.message}`);
            }
        });

    }
    catch (e)
    {
        console.error({lid: 3136}, e.message);
    }
    return validList;
};

/**
 * Get raw inputs from cli
 * @param cliOptions
 * @returns {*[]}
 */
const parseCliInputs = (cliOptions) =>
{
    // Input Files
    let inputFileMaskArr = [];
    try
    {
        if (cliOptions._ && cliOptions._.length)
        {
            inputFileMaskArr.push(...cliOptions._);
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

    }
    catch (e)
    {
        console.error({lid: 3138}, e.message);
    }

    return inputFileMaskArr;
};

/**
 * Build a list of cjs files containing various information about each file (path, target path, etc.)
 * The list first element will be the entrypoint
 * @param cliOptions
 * @param outputDir
 * @param rootDir
 * @param workingDir
 * @param subRootDir
 * @returns {CjsInfoType[]}
 */
const buildIndex = (cliOptions, {outputDir, rootDir, workingDir, subRootDir}) =>
{
    let list = [];
    try
    {
        resetIndex();

        const inputFileMaskArr = parseCliInputs(cliOptions);
        const sources = findCjsSources(inputFileMaskArr, {rootDir});
        list = populateCjsList(cliOptions.entrypoint, sources, {rootDir, outputDir, workingDir, subRootDir});
    }
    catch (e)
    {
        console.error({lid: 3140}, e.message);
    }

    return list;
};

/**
 * Define options that users do not control to pass over transformation functions
 * @param rootDir
 * @param sources
 * @param outputDir
 * @returns {EngineOptionType}
 */
const initialiseMainOptions = ({rootDir, entryPointPath, outputDir, workingDir, subRootDir, firstPass}) =>
{
    const moreOptions = {};
    try
    {
        /**
         * moreOptions is used to define options that users can't control
         * @type {{
         *      minify: boolean, onlyBundle: boolean, sourcemap: boolean, useImportMaps: (boolean|*),
         *      prefixpath: (string|*), target: *, nm: (string), useImportMaps: boolean
         *      }}
         */
        Object.assign(moreOptions, {
            rootDir,
            // The entrypoint is always the first element returned by buildIndex
            entryPointPath,
            outputDir,
            workingDir,
            subRootDir,
            firstPass
        });

        console.log({lid: 1076}, toAnsi.getTextFromHex(`Entry Point: ${moreOptions.entryPointPath}`, {fg: "green"}));
    }
    catch (e)
    {
        console.error({lid: 3142}, e.message);
    }

    moreOptions.extras = {};
    return moreOptions;
};

/**
 * Parse options from the config file and take the one needed
 * @param configPath
 * @param cliOptions
 * @param moreOptions
 * @returns {Promise<{replace: *[]}>}
 */
const extractConfigFileOptions = async (configPath, cliOptions, moreOptions = {}) =>
{
    try
    {
        let confFileOptions = {replace: []};

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

        let htmlOptions = confFileOptions.html || {};
        let html = cliOptions.html;
        if (html)
        {
            htmlOptions.pattern = html;
        }

        moreOptions.configFile = {...confFileOptions};
        moreOptions.extras = {nonHybridModuleMap, htmlOptions};
    }
    catch (e)
    {
        console.error({lid: 3144}, e.message);
    }
    return moreOptions;
};

/**
 * Parse options from cli
 * @param cliOptions
 * @param moreOptions
 * @returns {{success: boolean, cjsList: *[]}|{}}
 */
const parseCliOptions = (cliOptions, moreOptions = {}) =>
{
    try
    {
        cliOptions.target = cliOptions.target || TARGET.ESM;

        if (cliOptions.target === TARGET.PACKAGE)
        {
            cliOptions.target = TARGET.BROWSER;
            cliOptions.prefixpath = "../../";
        }

        if (cliOptions.target === TARGET.ALL)
        {
            console.error({lid: 3146}, `The option --target ${TARGET.ALL} is no longer supported. It defaults to --target ${TARGET.BROWSER} now`);
            cliOptions.target = TARGET.BROWSER;
        }

        if (cliOptions.useimportmaps)
        {
            cliOptions.target = TARGET.BROWSER;
        }

        cliOptions.prefixpath = cliOptions.prefixpath || "";
        cliOptions.prefixpath = cliOptions.prefixpath.trim();

        // No header
        moreOptions.extras.noHeader = !!cliOptions.noHeader;
        moreOptions.extras.fallback = !!cliOptions.fallback;
        moreOptions.extras.importMaps = {};

        moreOptions.extras.minify = !["false", "no", "non"].includes(cliOptions.minify);

        if (["false", "no", "non"].includes(cliOptions.sourcemap))
        {
            moreOptions.extras.sourcemap = false;
        }

        let bundlePath = cliOptions.bundle || cliOptions["bundle-esm"];
        let cjsBundlePath = cliOptions["bundle-cjs"];
        let browserBundlePath = cliOptions["bundle-browser"];

        bundlePath = normalisePath(bundlePath) || "";
        cjsBundlePath = normalisePath(cjsBundlePath) || "";
        browserBundlePath = normalisePath(browserBundlePath) || "";

        Object.assign(moreOptions.extras, {...cliOptions});

        Object.assign(moreOptions.extras, {
            useImportMaps       : !!moreOptions.extras.htmlOptions.pattern || cliOptions.useImportMaps || false,
            target              : cliOptions.target,
            nm                  : cliOptions.nm || "node_modules",
            nmBrowserImported   : cliOptions.nmBrowserImported || "node_modules",
            prefixpath          : cliOptions.prefixpath,
            sourcemap           : !!cliOptions.sourcemap,
            isTemporaryOutputDir: cliOptions.isTemporaryOutputDir || false,
            keepexisting        : !!cliOptions.keepexisting,
            bundlePath, cjsBundlePath, browserBundlePath,
        });

    }
    catch (e)
    {
        console.error({lid: 3148}, e.message);
    }
    return moreOptions;
};

/**
 * Enable debug mode if required by the user and create
 * the debug directory
 * @param cliOptions
 * @param moreOptions
 */
const prepareDebugMode = (cliOptions, moreOptions = {}) =>
{
    try
    {
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
                    console.error({lid: 3150}, "", e.message);
                }
            }
            buildTargetDir(DEBUG_DIR);
        }
        DEBUG_MODE = !!debuginput;

        moreOptions.extras.debug = DEBUG_MODE;
    }
    catch (e)
    {
        console.error({lid: 3152}, e.message);
    }
};

const deleteTempFolder = (moreOptions) =>
{
    try
    {
        if (moreOptions.extras.isTemporaryOutputDir && moreOptions.outputDir.indexOf(DEFAULT_PREFIX_TEMP) > -1)
        {
            console.log({lid: 1378}, `Cleaning operations`);
            fs.rmSync(moreOptions.outputDir, {recursive: true, force: true});
            moreOptions.outputDir = null;
        }

        return true;
    }
    catch (e)
    {
        console.error({lid: 4517}, e.message);
    }

    return false;
};

/**
 * Convert a file to es6 format. The function will also recursively
 * parse and convert all detected import/require.
 * Use command line arguments to apply conversion
 * @param moreOptions
 * @param extrasInfos
 */
let convertFile = async (moreOptions, extrasInfos = {}) =>
{
    let success = true;
    try
    {
        // The first file parsed will be the entrypoint
        const cjsEntryPointPath = cjsList[0].source;
        let mjsEntrypointPath = cjsList[0].mjsTargetAbs;

        const success = convertCjsFiles(cjsList,
            {
                ...moreOptions.extras,
                ...moreOptions.configFile,
                outputDir: moreOptions.outputDir,
                rootDir  : moreOptions.rootDir,
                moreOptions,
                // replaceStart: confFileOptions.replaceStart,
                // replaceEnd  : confFileOptions.replaceEnd,
                // nonHybridModuleMap,
                // noHeader,
                // importMaps,
                // workingDir,
            });

        if (moreOptions.firstPass)
        {
            return success;
        }

        if (!writeResultOnDisk(moreOptions))
        {
            console.error({lid: 3154}, `Conversion failed`);
            return false;
        }

        const {bundlePath, cjsBundlePath, browserBundlePath} = moreOptions.extras;

        if ((bundlePath || cjsBundlePath || browserBundlePath) && mjsEntrypointPath)
        {
            await bundleResults(mjsEntrypointPath, {
                cjsEntryPath: cjsEntryPointPath,
                target      : moreOptions.extras.target,
                bundlePath,
                cjsBundlePath,
                browserBundlePath,
                minify      : moreOptions.extras.minify,
                sourcemap   : moreOptions.extras.sourcemap,
                extrasInfos
            });
        }

        if (moreOptions.extras["update-all"])
        {
            let useBundle = moreOptions.extras["use-bundle"];
            updatePackageJson({
                entryPoint: cjsList[0],
                bundlePath,
                cjsBundlePath,
                browserBundlePath,
                workingDir: moreOptions.workingDir,
                ...moreOptions,
                ...moreOptions.extras,
                importMaps: moreOptions.extras.importMaps,
                useBundle
            });
        }

        if (!moreOptions.extras.htmlOptions.pattern)
        {
            return success;
        }

        if (!Object.keys(moreOptions.extras.importMaps).length)
        {
            console.info({lid: 1202}, " No importMaps entry found.");
            return success;
        }

        const htmlList = glob.sync(moreOptions.extras.htmlOptions.pattern,
            {
                root : moreOptions.workingDir,
                nodir: true
            });

        updateHTMLFiles(htmlList, {
            importMaps     : moreOptions.extras.importMaps,
            moreOptions,
            confFileOptions: moreOptions.configFile,
            htmlOptions    : moreOptions.extras.htmlOptions
        });

        return success;
    }
    catch (e)
    {
        console.error({lid: 3156}, e.message);
        success = false;
    }
    finally
    {
        deleteTempFolder(moreOptions);
    }

    return success;
};

/**
 * Return working directory
 * @returns {string|null}
 */
function getWorkingDir()
{
    try
    {
        const workingDir = normaliseDirPath(process.cwd());
        return workingDir;
    }
    catch (e)
    {
        console.error({lid: 4519}, e.message);
    }

    return null;
}

/**
 * Return root directory by parsing user options.
 * @param cliOptions
 * @returns {string|null|boolean}
 */
function getRootDir(cliOptions)
{
    try
    {
        let rootDir = cliOptions.rootDir ? normaliseDirPath(cliOptions.rootDir) : getWorkingDir();

        if (!fs.existsSync(rootDir))
        {
            console.error({lid: 3158}, `rootDir: [${rootDir}] does not exist`);
            return null;
        }

        if (!fs.lstatSync(rootDir).isDirectory())
        {
            console.error({lid: 3160}, `rootDir: [${rootDir}] must be a valid directory`);
            return null;
        }

        return rootDir;
    }
    catch (e)
    {
        console.error({lid: 4523}, e.message);
    }

    return false;
}

/**
 * Returns output directory.
 * The output directory is the directory where converted .cjs will be generated.
 * @param cliOptions
 * @returns {string|boolean}
 */
function getOutputDirectory(cliOptions)
{
    try
    {
        // Output directory
        let outputDir = normaliseDirPath(cliOptions.output);
        return outputDir;
    }
    catch (e)
    {
        console.error({lid: 4525}, e.message);
    }

    return false;
}

/**
 * Determine working, root and output directories from user options
 * @param cliOptions
 * @returns {{}|{outputDir: (string|boolean), workingDir: (string|null), rootDir: (string|boolean)}}
 */
const extractKeyDirectories = function (cliOptions)
{
    try
    {
        const workingDir = getWorkingDir();
        console.log({lid: 1078}, `Current working directory: ${workingDir}`);

        const rootDir = getRootDir(cliOptions);
        if (!rootDir)
        {
            return null;
        }

        let outputDir = getOutputDirectory(cliOptions);

        if (cliOptions.onlyBundle)
        {
            if (!(cliOptions.bundle || cliOptions["bundle-esm"] || cliOptions["bundle-cjs"] || cliOptions["bundle-browser"]))
            {
                console.error({lid: 1377}, `There was no bundle path passed while the --only-bundle option was used.`);
                console.log({lid: 1380}, `Use one of the options available to generate one. i.e. --bundle, --bundle-esm, --bundle-browser or --bundle-cjs `);
                console.log({lid: 1382}, `Aborting`);
                return null;
            }

            if (cliOptions.output)
            {
                console.info({lid: 1384}, `The option --only-bundle was given. The output directory will be ignored.`);
                cliOptions.output = null;
            }
        }

        if (!cliOptions.output)
        {
            // User only wants the bundle, not the generated full tree
            if (cliOptions.bundle || cliOptions["bundle-esm"] || cliOptions["bundle-cjs"] || cliOptions["bundle-browser"])
            {
                outputDir = "./" + generateTempName({prefix: DEFAULT_PREFIX_TEMP});
            }
        }
        outputDir = outputDir || "./";
        outputDir = normaliseDirPath(outputDir);

        let subRootDir = cliOptions.subRootDir ? normaliseDirPath(cliOptions.subRootDir) : "";

        return {workingDir, rootDir, outputDir, subRootDir};
    }
    catch (e)
    {
        console.error({lid: 4527}, e.message);
    }

    return {};
};

/**
 * Review and rewrite some options
 * @param cliOptions
 * @param workingDir
 * @param outputDir
 * @returns {boolean}
 */
const updateOptions = function (cliOptions, {workingDir, outputDir})
{
    if (outputDir.indexOf(DEFAULT_PREFIX_TEMP) > -1)
    {
        cliOptions.isTemporaryOutputDir = true;
    }
    cliOptions.workingDir = workingDir;
};

/**
 * Set up the engine for source conversion based on given options
 * @param simplifiedCliOptions
 * @returns {Promise<{success: boolean}>}
 */
const transpileFiles = async (simplifiedCliOptions = null) =>
{
    try
    {
        if (!simplifiedCliOptions)
        {
            return {success: false};
        }

        const cliOptions = importLowerCaseOptions(simplifiedCliOptions,
            "rootDir, workingDir, noHeader, outputDir, entrypoint, resolveAbsolute, keepExternal, onlyBundle," +
            " useImportMaps, nmBrowserImported"
        );

        if (cliOptions.resolveAbsolute === true)
        {
            cliOptions.resolveAbsolute = ["./node_modules"];
        }
        else if (cliOptions.resolveAbsolute && !Array.isArray(cliOptions.resolveAbsolute))
        {
            cliOptions.resolveAbsolute = cliOptions.resolveAbsolute.split(",");
        }

        // Extract working, root and output directories
        const resultExtract = extractKeyDirectories(cliOptions);
        if (!resultExtract)
        {
            return {success: false};
        }

        let {workingDir, rootDir, outputDir} = resultExtract;

        // Save key directories to options
        updateOptions(cliOptions, {workingDir, outputDir});

        // Clone options for watchers
        const originalOptions = Object.assign({}, cliOptions);

        let success, subRootDir = "";
        let moreOptions;

        const extrasInfos = {};

        anaLogger.setOptions({silent: true, hideError: true, hideHookMessage: true});

        for (let pass = 1; pass <= 2; ++pass)
        {
            // Build source info from glob(s)
            const sources = buildIndex(cliOptions, {outputDir, rootDir, workingDir, subRootDir});
            if (!sources.length)
            {
                console.log({lid: 1080}, `Bad arguments. No input file detected.`);
                return {success: false};
            }

            // Format option object
            const entryPointPath = sources[0].sourceAbs;
            moreOptions = initialiseMainOptions({
                rootDir,
                entryPointPath: entryPointPath,
                outputDir,
                workingDir,
                subRootDir,
                firstPass     : pass === 1
            });

            // Config Files
            let configPath = cliOptions.config || detectESMConfigPath();

            // Extract options from config file
            await extractConfigFileOptions(configPath, cliOptions, moreOptions);
            parseCliOptions(cliOptions, moreOptions);
            prepareDebugMode(cliOptions, moreOptions);

            // First pass is to populate cjsList
            success = await convertFile(moreOptions, extrasInfos);

            if (cjsList.length)
            {
                const sourceList = [];
                cjsList.forEach(item =>
                {
                    if (item.isThirdParty || item.externalSource)
                    {
                        return;
                    }
                    sourceList.push(item.source);
                });

                subRootDir = calculateCommon(sourceList);
                cjsList = cjsList.slice(0, 1);

                anaLogger.setOptions({silent: false, hideError: false});
            }
        }

        return {cliOptions, originalOptions, moreOptions, success, extrasInfos};
    }
    catch (e)
    {
        console.error({lid: 3162}, e.message);
    }

    return {success: false};
};


// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports.buildTargetDir = buildTargetDir;
module.exports.convertNonTrivial = convertNonTrivial;
module.exports.reviewEsmImports = reviewEsmImports;
module.exports.parseImportWithRegex = parseImportWithRegex;
module.exports.applyReplaceFromConfig = applyReplaceFromConfig;
module.exports.stripCodeComments = stripCodeComments;
module.exports.convertModuleExportsToExport = convertModuleExportsToExport;
module.exports.convertRequireToImport = convertRequiresToImport;
module.exports.validateSyntax = validateSyntax;
module.exports.convertRequiresToImportsWithAST = convertRequiresToImportsWithAST;
module.exports.putBackComments = putBackComments;
module.exports.convertCjsFiles = convertCjsFiles;
module.exports.convertToESMWithRegex = convertToESMWithRegex;
module.exports.getOptionsConfigFile = getOptionsConfigFile;
module.exports.getLibraryInfo = getLibraryInfo;
module.exports.installPackage = installPackage;
module.exports.installNonHybridModules = installNonHybridModules;
module.exports.isConventionalFolder = isConventionalFolder;
module.exports.concatenatePaths = concatenatePaths;
module.exports.convertToSubRootDir = convertToSubRootDir;
module.exports.subtractPath = subtractPath;
module.exports.getTranslatedPath = getTranslatedPath;
module.exports.getProjectedPathAll = getProjectedPathAll;
module.exports.calculateRequiredPath = calculateRequiredPath;
module.exports.regexifySearchList = regexifySearchList;
module.exports.getImportMapFromPage = getImportMapFromPage;
module.exports.normaliseString = normaliseString;

module.exports.setupConsole = setupConsole;

module.exports.resetIndex = resetIndex;
module.exports.buildIndex = buildIndex;
module.exports.updateOptions = updateOptions;

module.exports.getIndexedItems = getIndexedItems;

module.exports.convertFile = convertFile;
module.exports.transpileFiles = transpileFiles;

module.exports.TARGET = TARGET;
module.exports.DEBUG_DIR = DEBUG_DIR;
module.exports.DEFAULT_PREFIX_TEMP = DEFAULT_PREFIX_TEMP;

